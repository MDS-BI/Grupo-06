import { beforeEach, describe, expect, it } from 'vitest';
import {
  aprobarSolicitud,
  crearSolicitud,
  enviarSolicitud
} from '../../../src/compras/solicitudes.js';
import {
  registrarCotizacion,
  seleccionarCotizacion
} from '../../../src/compras/cotizaciones.js';
import {
  anularOrdenCompra,
  emitirOrdenCompra,
  obtenerOrden
} from '../../../src/compras/ordenes-compra.js';
import { registrarRecepcion } from '../../../src/compras/recepciones.js';
import {
  aprobarPago,
  conciliarFactura,
  registrarFactura
} from '../../../src/compras/facturas.js';
import {
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
    const { solicitud, cotizacion, orden, recepcion, factura, devolucion } =
      flujoConDevolucion();

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
    expect(historialDe('factura', factura.id).map((e) => e.accion)).toContain(
      'aprobacion_pago'
    );
    expect(historialDe('devolucion', devolucion.id).map((e) => e.accion)).toContain(
      'aprobacion'
    );
  });

  it('navega la cadena completa desde cualquier documento', () => {
    const { solicitud, cotizacion, orden, recepcion, factura, devolucion } =
      flujoConDevolucion();
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
});
