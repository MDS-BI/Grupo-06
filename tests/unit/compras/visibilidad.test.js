import { describe, expect, it } from 'vitest';
import { PERMISOS } from '../../../src/compras/almacenamiento.js';
import {
  GRUPOS,
  VISIBILIDAD,
  nivelVista,
  vistasVisibles
} from '../../../src/compras/visibilidad.js';

const ROLES = ['solicitante', 'comprador', 'jefe_compras', 'bodega', 'admin_ti'];

const VISTAS = [
  'solicitudes',
  'cotizaciones',
  'ordenes',
  'recepciones',
  'facturas',
  'devoluciones',
  'proveedores',
  'catalogo',
  'evaluaciones',
  'trazabilidad'
];

const ESPERADO = {
  solicitudes: {
    solicitante: 'opera',
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'opera'
  },
  cotizaciones: {
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  },
  ordenes: {
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: 'lectura',
    admin_ti: 'lectura'
  },
  recepciones: {
    solicitante: 'lectura',
    comprador: 'lectura',
    jefe_compras: 'lectura',
    bodega: 'opera',
    admin_ti: 'lectura'
  },
  facturas: {
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  },
  devoluciones: {
    solicitante: null,
    comprador: 'lectura',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'lectura'
  },
  proveedores: {
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  },
  catalogo: {
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  },
  evaluaciones: {
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  },
  trazabilidad: {
    solicitante: null,
    comprador: null,
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  }
};

describe('matriz de visibilidad por rol', () => {
  it('define las 10 vistas y los 5 roles (50 combinaciones)', () => {
    expect(Object.keys(VISIBILIDAD)).toHaveLength(10);
    expect(Object.keys(VISIBILIDAD).sort()).toEqual([...VISTAS].sort());
    for (const vista of VISTAS) {
      expect(Object.keys(VISIBILIDAD[vista]).sort()).toEqual([...ROLES].sort());
    }
  });

  for (const vista of VISTAS) {
    for (const rol of ROLES) {
      it(`${vista} × ${rol} = ${ESPERADO[vista][rol]}`, () => {
        expect(nivelVista(vista, { rol })).toBe(ESPERADO[vista][rol]);
      });
    }
  }

  it('el panel es operativo para los cinco roles', () => {
    for (const rol of ROLES) expect(nivelVista('panel', { rol })).toBe('opera');
  });

  it('una vista desconocida no es visible', () => {
    expect(nivelVista('inexistente', { rol: 'admin_ti' })).toBeNull();
  });

  it('vistasVisibles incluye el panel y solo las vistas no nulas', () => {
    for (const rol of ROLES) {
      const visibles = vistasVisibles({ rol });
      expect(visibles[0]).toBe('panel');
      for (const vista of VISTAS) {
        expect(visibles.includes(vista)).toBe(ESPERADO[vista][rol] !== null);
      }
    }
  });

  it('agrupa las vistas en Panel, Adquisiciones y Compras', () => {
    expect(GRUPOS.Panel).toEqual(['panel']);
    expect(GRUPOS.Adquisiciones).toEqual(['proveedores', 'catalogo', 'evaluaciones']);
    expect(GRUPOS.Compras).toEqual([
      'solicitudes',
      'cotizaciones',
      'ordenes',
      'recepciones',
      'facturas',
      'devoluciones'
    ]);
  });
});

describe('permisos por rol', () => {
  it('admin_ti no tiene operaciones de compra', () => {
    const prohibidas = [
      'aprobar_solicitud',
      'gestionar_proveedores',
      'emitir_oc',
      'gestionar_cotizaciones',
      'registrar_recepcion',
      'registrar_factura',
      'conciliar_factura',
      'aprobar_pago',
      'registrar_devolucion',
      'aprobar_devolucion',
      'gestionar_catalogo',
      'evaluar_proveedor'
    ];
    for (const accion of prohibidas) expect(PERMISOS[accion]).not.toContain('admin_ti');
  });

  it('los cinco roles pueden crear solicitudes', () => {
    expect([...PERMISOS.crear_solicitud].sort()).toEqual([...ROLES].sort());
  });

  it('solo jefe_compras aprueba solicitudes, pagos y devoluciones', () => {
    expect(PERMISOS.aprobar_solicitud).toEqual(['jefe_compras']);
    expect(PERMISOS.aprobar_pago).toEqual(['jefe_compras']);
    expect(PERMISOS.aprobar_devolucion).toEqual(['jefe_compras']);
  });

  it('solo comprador gestiona proveedores, cotizaciones, OC, facturas y catálogo', () => {
    for (const accion of [
      'gestionar_proveedores',
      'gestionar_cotizaciones',
      'emitir_oc',
      'registrar_factura',
      'conciliar_factura',
      'gestionar_catalogo'
    ]) {
      expect(PERMISOS[accion]).toEqual(['comprador']);
    }
  });

  it('solo bodega registra recepciones y devoluciones', () => {
    expect(PERMISOS.registrar_recepcion).toEqual(['bodega']);
    expect(PERMISOS.registrar_devolucion).toEqual(['bodega']);
  });

  it('evaluar proveedor queda para comprador y jefe_compras', () => {
    expect([...PERMISOS.evaluar_proveedor].sort()).toEqual(['comprador', 'jefe_compras']);
  });

  it('admin_ti conserva datos bancarios, desbloqueo y exportación de trazabilidad', () => {
    expect(PERMISOS.editar_datos_bancarios).toEqual(['admin_ti']);
    expect(PERMISOS.desbloquear_proveedor).toEqual(['admin_ti']);
    expect(PERMISOS.exportar_trazabilidad).toEqual(['admin_ti']);
    expect([...PERMISOS.consultar_trazabilidad].sort()).toEqual(['admin_ti', 'jefe_compras']);
  });

  it('los cinco roles pueden exportar', () => {
    expect([...PERMISOS.exportar].sort()).toEqual([...ROLES].sort());
  });
});
