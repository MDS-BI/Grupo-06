import { beforeEach, describe, expect, it } from 'vitest';
import {
  anularSolicitud,
  aprobarSolicitud,
  crearSolicitud,
  enviarSolicitud
} from '../../../src/compras/solicitudes.js';
import {
  anularCotizacion,
  registrarCotizacion,
  seleccionarCotizacion
} from '../../../src/compras/cotizaciones.js';
import {
  anularOrdenCompra,
  emitirOrdenCompra,
  lineasPendientes,
  obtenerOrden,
  valorRecibidoNeto
} from '../../../src/compras/ordenes-compra.js';
import { anularRecepcion, registrarRecepcion } from '../../../src/compras/recepciones.js';
import {
  anularFactura,
  aprobarPago,
  conciliarFactura,
  obtenerFactura,
  registrarFactura
} from '../../../src/compras/facturas.js';
import {
  anularDevolucion,
  aprobarDevolucion,
  registrarDevolucion
} from '../../../src/compras/devoluciones.js';
import { eliminar, leer, puedeEliminar } from '../../../src/compras/almacenamiento.js';
import { cadenaDocumental, historialDe } from '../../../src/compras/trazabilidad.js';
import { cargarDatos, USUARIOS } from './helpers.js';

function solicitudAprobada(justificacion = 'Auditoría de compras') {
  const solicitud = crearSolicitud(
    {
      justificacion,
      fecha_requerida: '2026-12-01',
      centro_costo_id: 'cc-001',
      fecha_creacion: '2026-11-01',
      lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_estimado: 100000 }]
    },
    USUARIOS.solicitante
  );
  enviarSolicitud(solicitud.id, USUARIOS.solicitante);
  aprobarSolicitud(solicitud.id, USUARIOS.jefe);
  return solicitud;
}

function flujoConDevolucion() {
  const solicitud = solicitudAprobada();
  const cotizacion = registrarCotizacion(
    {
      solicitud_id: solicitud.id,
      proveedor_id: 'prov-001',
      fecha_validez: '2026-12-31',
      plazo_entrega_dias: 2,
      condicion_pago_dias: 30,
      lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_unitario: 100000 }]
    },
    USUARIOS.comprador
  );
  seleccionarCotizacion(cotizacion.id, USUARIOS.comprador);
  const orden = emitirOrdenCompra(
    { solicitud_id: solicitud.id, cotizacion_id: cotizacion.id },
    USUARIOS.comprador
  );
  const recepcion = registrarRecepcion(
    {
      orden_id: orden.id,
      lineas: [
        {
          orden_linea_id: orden.lineas[0].linea_id,
          cantidad_recibida: 2,
          cantidad_aceptada: 2
        }
      ]
    },
    USUARIOS.bodega
  );
  const factura = registrarFactura(
    { orden_id: orden.id, folio: 'F-AUD-1', neto: 200000 },
    USUARIOS.comprador
  );
  conciliarFactura(factura.id, USUARIOS.comprador);
  aprobarPago(factura.id, USUARIOS.jefe);
  const devolucion = registrarDevolucion(
    {
      orden_id: orden.id,
      lineas: [
        {
          orden_linea_id: orden.lineas[0].linea_id,
          cantidad: 1,
          motivo: 'defectuoso'
        }
      ]
    },
    USUARIOS.bodega
  );
  const aprobada = aprobarDevolucion(devolucion.id, USUARIOS.jefe);
  return { solicitud, cotizacion, orden, recepcion, factura, devolucion: aprobada };
}

describe('trazabilidad transversal', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('registra quién, cuándo y qué acción en cada cambio de estado', () => {
    const { solicitud, cotizacion, orden, recepcion, factura, devolucion } = flujoConDevolucion();

    const documentos = [
      ['solicitud', solicitud.id],
      ['cotizacion', cotizacion.id],
      ['orden', orden.id],
      ['recepcion', recepcion.id],
      ['factura', factura.id],
      ['devolucion', devolucion.id]
    ];

    for (const [entidad, id] of documentos) {
      const eventos = historialDe(entidad, id);
      expect(eventos.length).toBeGreaterThan(0);
      for (const evento of eventos) {
        expect(evento.usuario_id).toBeTruthy();
        expect(evento.fecha_hora).toBeTruthy();
        expect(evento.accion).toBeTruthy();
      }
    }

    const accionesSolicitud = historialDe('solicitud', solicitud.id).map((e) => e.accion);
    expect(accionesSolicitud).toContain('creacion');
    expect(accionesSolicitud).toContain('cambio_estado');
    expect(historialDe('orden', orden.id).map((e) => e.accion)).toContain('emision');
    expect(historialDe('factura', factura.id).map((e) => e.accion)).toContain('aprobacion_pago');
    expect(historialDe('devolucion', devolucion.id).map((e) => e.accion)).toContain('aprobacion');
  });

  it('navega la cadena completa desde cualquier documento', () => {
    const { solicitud, cotizacion, orden, recepcion, factura, devolucion } = flujoConDevolucion();
    const esperados = [
      solicitud.id,
      cotizacion.id,
      orden.id,
      recepcion.id,
      factura.id,
      devolucion.id
    ];

    for (const [entidad, id] of [
      ['solicitud', solicitud.id],
      ['cotizacion', cotizacion.id],
      ['orden', orden.id],
      ['recepcion', recepcion.id],
      ['factura', factura.id],
      ['devolucion', devolucion.id]
    ]) {
      const cadena = cadenaDocumental(entidad, id);
      expect(cadena.map((n) => n.id)).toEqual(expect.arrayContaining(esperados));
      expect(cadena.map((n) => n.tipo)).toEqual(
        expect.arrayContaining([
          'solicitud',
          'cotizacion',
          'orden',
          'recepcion',
          'factura',
          'devolucion'
        ])
      );
    }
  });

  it('impide eliminar documentos con historial y conserva los anulados', () => {
    const { orden } = flujoConDevolucion();
    expect(puedeEliminar('ordenes', orden.id)).toBe(false);
    expect(() => eliminar('ordenes', orden.id)).toThrow(/historial/);
    expect(leer('ordenes').some((o) => o.id === orden.id)).toBe(true);

    const solicitud = solicitudAprobada('OC que será anulada');
    const cotizacion = registrarCotizacion(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001',
        fecha_validez: '2026-12-31',
        lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_unitario: 100000 }]
      },
      USUARIOS.comprador
    );
    seleccionarCotizacion(cotizacion.id, USUARIOS.comprador);
    const anulada = emitirOrdenCompra(
      { solicitud_id: solicitud.id, cotizacion_id: cotizacion.id },
      USUARIOS.comprador
    );
    anularOrdenCompra(anulada.id, USUARIOS.comprador, 'Duplicada');

    expect(obtenerOrden(anulada.id).estado).toBe('anulada');
    expect(leer('ordenes').some((o) => o.id === anulada.id)).toBe(true);
    expect(historialDe('orden', anulada.id).map((e) => e.accion)).toContain('anulacion');
    expect(
      cadenaDocumental('orden', anulada.id).some(
        (n) => n.id === anulada.id && n.estado === 'anulada'
      )
    ).toBe(true);
  });

  it('impide eliminar facturas y devoluciones con historial', () => {
    const { factura, devolucion } = flujoConDevolucion();
    for (const [coleccion, id] of [
      ['facturas', factura.id],
      ['devoluciones', devolucion.id]
    ]) {
      expect(puedeEliminar(coleccion, id)).toBe(false);
      expect(() => eliminar(coleccion, id)).toThrow(/historial/);
      expect(leer(coleccion).some((item) => item.id === id)).toBe(true);
    }
  });

  it('anula con motivo facturas y devoluciones', () => {
    const { factura, devolucion } = flujoConDevolucion();
    expect(obtenerFactura(factura.id).credito_a_favor).toBe(100000);
    expect(() => anularFactura(factura.id, '', USUARIOS.comprador)).toThrow(/exige un motivo/);
    const facturaAnulada = anularFactura(
      factura.id,
      'Factura registrada dos veces',
      USUARIOS.comprador
    );
    expect(facturaAnulada.motivo_anulacion).toBe('Factura registrada dos veces');
    expect(historialDe('factura', factura.id).map((e) => e.accion)).toContain('anulacion');

    expect(() => anularDevolucion(devolucion.id, '', USUARIOS.jefe)).toThrow(/exige un motivo/);
    const devolucionAnulada = anularDevolucion(
      devolucion.id,
      'Devolución mal registrada',
      USUARIOS.jefe
    );
    expect(devolucionAnulada.motivo_anulacion).toBe('Devolución mal registrada');
    expect(historialDe('devolucion', devolucion.id).map((e) => e.accion)).toContain('anulacion');
    expect(obtenerFactura(factura.id).credito_a_favor).toBe(0);
    expect(historialDe('factura', factura.id).map((e) => e.accion)).toContain(
      'reversion_credito'
    );
    expect(puedeEliminar('facturas', factura.id)).toBe(false);
    expect(puedeEliminar('devoluciones', devolucion.id)).toBe(false);
  });

  it('anula con motivo solicitudes, cotizaciones y recepciones', () => {
    const solicitud = crearSolicitud(
      {
        justificacion: 'Solicitud duplicada',
        fecha_requerida: '2026-12-01',
        centro_costo_id: 'cc-001',
        fecha_creacion: '2026-11-01',
        lineas: [{ producto_id: 'prod-001', cantidad: 1, precio_estimado: 100000 }]
      },
      USUARIOS.solicitante
    );
    expect(() => anularSolicitud(solicitud.id, USUARIOS.jefe, '  ')).toThrow(
      /exige un motivo/
    );
    const solicitudAnulada = anularSolicitud(solicitud.id, USUARIOS.jefe, 'Duplicada');
    expect(solicitudAnulada.motivo_anulacion).toBe('Duplicada');
    expect(historialDe('solicitud', solicitud.id).map((e) => e.accion)).toContain('anulacion');

    const base = solicitudAprobada('Cotización que se anulará');
    const cotizacion = registrarCotizacion(
      {
        solicitud_id: base.id,
        proveedor_id: 'prov-001',
        fecha_validez: '2026-12-31',
        lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_unitario: 100000 }]
      },
      USUARIOS.comprador
    );
    expect(() => anularCotizacion(cotizacion.id, '', USUARIOS.comprador)).toThrow(
      /exige un motivo/
    );
    const cotizacionAnulada = anularCotizacion(
      cotizacion.id,
      'Precio erróneo',
      USUARIOS.comprador
    );
    expect(cotizacionAnulada.motivo_anulacion).toBe('Precio erróneo');
    expect(historialDe('cotizacion', cotizacion.id).map((e) => e.accion)).toContain('anulacion');

    const { orden, recepcion } = flujoConDevolucion();
    expect(() => anularRecepcion(recepcion.id, '', USUARIOS.bodega)).toThrow(/exige un motivo/);
    const recepcionAnulada = anularRecepcion(
      recepcion.id,
      'Recepción registrada dos veces',
      USUARIOS.bodega
    );
    expect(recepcionAnulada.motivo_anulacion).toBe('Recepción registrada dos veces');
    expect(historialDe('recepcion', recepcion.id).map((e) => e.accion)).toContain('anulacion');
    expect(valorRecibidoNeto(obtenerOrden(orden.id))).toBe(0);
    expect(lineasPendientes(obtenerOrden(orden.id))[0].cantidad_pendiente).toBe(2);
    expect(obtenerOrden(orden.id).estado).toBe('cerrada');
  });
});
