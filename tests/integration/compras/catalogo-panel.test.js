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
import { construirPanel, contarPendientes } from '../../../src/compras/panel.js';
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

describe('panel por rol y alertas', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('muestra pendientes de aprobación, recepción y conciliación al jefe', () => {
    const panel = construirPanel(USUARIOS.jefe, HOY);
    const claves = panel.pendientes.map((p) => p.clave);
    expect(claves).toContain('solicitudes_por_aprobar');
    expect(claves).toContain('oc_sin_recepcion');
    expect(claves).toContain('facturas_por_conciliar');
    expect(panel.indicadores.ordenes_abiertas).toBeGreaterThan(0);

    const panelComprador = construirPanel(USUARIOS.comprador, HOY);
    expect(panelComprador.seguimiento.some((o) => o.id === 'oc-001')).toBe(true);
    expect(contarPendientes(USUARIOS.jefe, HOY)).toBeGreaterThan(0);
  });

  it('limita al solicitante a sus propias solicitudes', () => {
    const panel = construirPanel(USUARIOS.solicitante, HOY);
    expect(panel.pendientes.map((p) => p.clave)).toEqual(['mis_solicitudes']);
    const items = panel.pendientes[0].items;
    expect(
      items.every((item) =>
        ['sol-001', 'sol-002', 'sol-005', 'sol-008', 'sol-010'].includes(item.id)
      )
    ).toBe(true);
  });

  it('muestra recepciones al rol bodega sin facturas por conciliar', () => {
    const panel = construirPanel(USUARIOS.bodega, HOY);
    const claves = panel.pendientes.map((p) => p.clave);
    expect(claves).toContain('recepciones_por_registrar');
    expect(claves).not.toContain('facturas_por_conciliar');
  });

  it('alerta facturas próximas a vencer dentro de cinco días', () => {
    const alertas = alertasVencimiento(HOY);
    expect(alertas.map((f) => f.id)).toContain('fac-003');
    expect(alertas.find((f) => f.id === 'fac-003').dias_restantes).toBe(3);
    expect(alertas.map((f) => f.id)).not.toContain('fac-004');
  });
});
