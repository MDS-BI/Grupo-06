import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarProductoCatalogo,
  agregarProductoCatalogo,
  desactivarProductoCatalogo,
  esDesactualizado,
  listarCatalogo,
  precioReferenciaVigente
} from '../../../src/compras/catalogo.js';
import { alertasVencimiento } from '../../../src/compras/facturas.js';
import { compararCotizaciones } from '../../../src/compras/cotizaciones.js';
import { construirPanel } from '../../../src/compras/panel.js';
import { crearSolicitud } from '../../../src/compras/solicitudes.js';
import { cargarDatos, USUARIOS } from './helpers.js';

const HOY = '2026-11-03';

describe('catálogo de proveedores', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('detecta referencias desactualizadas después de 90 días', () => {
    expect(esDesactualizado({ fecha_actualizacion: '2026-06-01' }, HOY)).toBe(true);
    expect(esDesactualizado({ fecha_actualizacion: '2026-10-15' }, HOY)).toBe(false);
    expect(esDesactualizado({}, HOY)).toBe(true);
  });

  it('usa el menor precio vigente y descarta referencias antiguas o inactivas', () => {
    expect(precioReferenciaVigente('prod-008', HOY)).toBe(9500);
    expect(precioReferenciaVigente('prod-006', HOY)).toBeNull();
    expect(precioReferenciaVigente('prod-018', HOY)).toBeNull();
  });

  it('agrega, actualiza y desactiva referencias sin duplicados', () => {
    expect(() =>
      agregarProductoCatalogo(
        {
          proveedor_id: 'prov-001',
          producto_id: 'prod-001',
          precio_referencia: 800000,
          plazo_entrega_dias: 5
        },
        USUARIOS.comprador
      )
    ).toThrow(/Ya existe una referencia/);

    const entrada = agregarProductoCatalogo(
      {
        proveedor_id: 'prov-008',
        producto_id: 'prod-019',
        precio_referencia: 500000,
        plazo_entrega_dias: 7
      },
      USUARIOS.comprador
    );
    expect(entrada.activo).toBe(true);
    expect(precioReferenciaVigente('prod-019', HOY)).toBe(500000);

    const actualizada = actualizarProductoCatalogo(
      entrada.id,
      { precio_referencia: 480000 },
      USUARIOS.comprador
    );
    expect(actualizada.precio_referencia).toBe(480000);
    expect(precioReferenciaVigente('prod-019', HOY)).toBe(480000);

    desactivarProductoCatalogo(entrada.id, USUARIOS.comprador);
    expect(precioReferenciaVigente('prod-019', HOY)).toBeNull();
    expect(listarCatalogo({ incluirInactivos: false }).some((c) => c.id === entrada.id)).toBe(
      false
    );
  });

  it('valida proveedor, producto, precio y plazo', () => {
    expect(() =>
      agregarProductoCatalogo(
        {
          proveedor_id: 'prov-999',
          producto_id: 'prod-001',
          precio_referencia: 1,
          plazo_entrega_dias: 1
        },
        USUARIOS.comprador
      )
    ).toThrow(/proveedor no existe/);

    expect(() =>
      agregarProductoCatalogo(
        {
          proveedor_id: 'prov-001',
          producto_id: 'prod-018',
          precio_referencia: 1,
          plazo_entrega_dias: 1
        },
        USUARIOS.comprador
      )
    ).toThrow(/inactivo/);

    expect(() =>
      agregarProductoCatalogo(
        {
          proveedor_id: 'prov-008',
          producto_id: 'prod-020',
          precio_referencia: -1,
          plazo_entrega_dias: 1.5
        },
        USUARIOS.comprador
      )
    ).toThrow(/precio/);
  });
});

describe('panel por rol y alertas (FR-035)', () => {
  const ROLES = {
    solicitante: USUARIOS.solicitante,
    comprador: USUARIOS.comprador,
    jefe_compras: USUARIOS.jefe,
    bodega: USUARIOS.bodega,
    admin_ti: USUARIOS.admin
  };

  const ESPERADO = {
    solicitante: {
      pendientes: ['mis_solicitudes'],
      indicadores: ['mes', 'monto_comprometido', 'ordenes_abiertas', 'facturas_aprobadas_pago', 'monto_aprobado_pago'],
      alertas: 0,
      seguimiento: 0
    },
    comprador: {
      pendientes: [
        'mis_solicitudes',
        'oc_sin_recepcion',
        'solicitudes_aprobadas_sin_cotizar',
        'facturas_con_discrepancia'
      ],
      indicadores: ['mes', 'monto_comprometido', 'ordenes_abiertas', 'facturas_aprobadas_pago', 'monto_aprobado_pago', 'facturas_con_discrepancia'],
      alertas: 1,
      seguimiento: 2
    },
    jefe_compras: {
      pendientes: [
        'mis_solicitudes',
        'solicitudes_por_aprobar',
        'oc_sin_recepcion',
        'facturas_conciliadas_por_aprobar',
        'devoluciones_pendientes'
      ],
      indicadores: ['mes', 'monto_comprometido', 'ordenes_abiertas', 'facturas_aprobadas_pago', 'monto_aprobado_pago', 'gasto_del_periodo', 'facturas_en_riesgo'],
      alertas: 1,
      seguimiento: 0
    },
    bodega: {
      pendientes: ['mis_solicitudes', 'oc_esperando_entrega', 'recepciones_parciales'],
      indicadores: ['mes', 'monto_comprometido', 'ordenes_abiertas', 'facturas_aprobadas_pago', 'monto_aprobado_pago', 'tasa_rechazo'],
      alertas: 0,
      seguimiento: 2
    },
    admin_ti: {
      pendientes: ['mis_solicitudes', 'alertas_fraude'],
      indicadores: ['mes', 'monto_comprometido', 'ordenes_abiertas', 'facturas_aprobadas_pago', 'monto_aprobado_pago'],
      alertas: 1,
      seguimiento: 0
    }
  };

  beforeEach(() => {
    cargarDatos();
    for (const usuario of Object.values(ROLES)) {
      crearSolicitud(
        {
          justificacion: `Solicitud de prueba de ${usuario.rol}`,
          centro_costo_id: 'cc-001',
          fecha_requerida: '2026-11-30',
          lineas: [{ producto_id: 'prod-001', cantidad: 1, precio_estimado: 1000 }]
        },
        usuario
      );
    }
  });

  it('muestra exactamente los pendientes e indicadores de cada rol', () => {
    for (const [rol, usuario] of Object.entries(ROLES)) {
      const panel = construirPanel(usuario, HOY);
      const esperado = ESPERADO[rol];
      expect(panel.pendientes.map((p) => p.clave).sort(), rol).toEqual(
        [...esperado.pendientes].sort()
      );
      expect(Object.keys(panel.indicadores).sort(), rol).toEqual(
        [...esperado.indicadores].sort()
      );
      expect(panel.alertas.length, rol).toBe(esperado.alertas);
      expect(panel.seguimiento.length, rol).toBe(esperado.seguimiento);
    }
  });

  it('limita Mis solicitudes a las propias y muestra su estado', () => {
    const porRol = new Map();
    for (const [rol, usuario] of Object.entries(ROLES)) {
      const pendiente = construirPanel(usuario, HOY).pendientes.find(
        (p) => p.clave === 'mis_solicitudes'
      );
      expect(pendiente, rol).toBeTruthy();
      expect(pendiente.items.every((i) => i.estado), rol).toBe(true);
      porRol.set(rol, new Set(pendiente.items.map((i) => i.id)));
    }
    for (const [rol, ids] of porRol) {
      for (const [otro, otrosIds] of porRol) {
        if (otro === rol) continue;
        expect([...ids].some((id) => otrosIds.has(id)), `${rol} vs ${otro}`).toBe(false);
      }
    }
  });

  it('calcula los indicadores según data-model §8', () => {
    const comprador = construirPanel(ROLES.comprador, HOY);
    expect(comprador.indicadores.facturas_con_discrepancia).toBeGreaterThan(0);
    expect(comprador.indicadores.facturas_con_discrepancia).toBeLessThanOrEqual(1);

    const jefe = construirPanel(ROLES.jefe_compras, HOY);
    expect(typeof jefe.indicadores.gasto_del_periodo).toBe('number');
    expect(jefe.indicadores.facturas_en_riesgo).toBe(jefe.alertas.length);

    expect(typeof construirPanel(ROLES.bodega, HOY).indicadores.tasa_rechazo).toBe('number');
  });

  it('mantiene alertas y seguimiento solo en los roles que ven Facturas y OC', () => {
    expect(construirPanel(ROLES.solicitante, HOY).alertas).toHaveLength(0);
    expect(construirPanel(ROLES.bodega, HOY).alertas).toHaveLength(0);
    expect(construirPanel(ROLES.admin_ti, HOY).alertas.length).toBeGreaterThan(0);
    expect(construirPanel(ROLES.solicitante, HOY).seguimiento).toHaveLength(0);
    expect(construirPanel(ROLES.jefe_compras, HOY).seguimiento).toHaveLength(0);
  });

  it('alerta facturas próximas a vencer dentro de cinco días', () => {
    const alertas = alertasVencimiento(HOY);
    expect(alertas.map((f) => f.id)).toContain('fac-003');
    expect(alertas.find((f) => f.id === 'fac-003').dias_restantes).toBe(3);
    expect(alertas.map((f) => f.id)).not.toContain('fac-004');
  });

  it('muestra acciones rápidas legibles sin claves internas y estado vacío', () => {
    for (const usuario of Object.values(ROLES)) {
      const panel = construirPanel(usuario, HOY);
      expect(panel.acciones.length).toBeGreaterThan(0);
      for (const accion of panel.acciones) {
        expect(accion.etiqueta).toBeTruthy();
        expect(accion.descripcion).toBeTruthy();
        expect(accion.etiqueta).not.toContain('_');
      }
    }
    expect(construirPanel({ id: 'u-sin-pendientes', rol: 'solicitante' }, HOY).vacio).toBe(true);
  });

  it('respeta la matriz RBAC en el panel y en la comparativa', () => {
    const panel = JSON.stringify(construirPanel(USUARIOS.comprador, HOY));
    expect(panel).not.toContain('555444333');
    expect(panel).not.toContain('98.***.***-3');

    const comparativa = JSON.stringify(compararCotizaciones('sol-004', USUARIOS.comprador));
    expect(comparativa).toContain('9.876.543-3');
    expect(comparativa).toContain('****4333');
    expect(comparativa).not.toContain('555444333');
    expect(comparativa).not.toContain('98.***.***-3');
  });
});
