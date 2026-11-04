import { beforeEach, describe, expect, it } from 'vitest';
import {
  aprobarSolicitud,
  crearSolicitud,
  enviarSolicitud,
  obtenerSolicitud
} from '../../../src/compras/solicitudes.js';
import {
  obtenerCotizacion,
  registrarCotizacion,
  seleccionarCotizacion
} from '../../../src/compras/cotizaciones.js';
import { emitirOrdenCompra, obtenerOrden } from '../../../src/compras/ordenes-compra.js';
import { registrarRecepcion } from '../../../src/compras/recepciones.js';
import { aprobarPago, conciliarFactura, registrarFactura } from '../../../src/compras/facturas.js';
import {
  aprobarDevolucion,
  devolucionesAprobadasNeto,
  registrarDevolucion
} from '../../../src/compras/devoluciones.js';
import { registrarEvaluacion } from '../../../src/compras/evaluaciones.js';
import { cargarDatos, USUARIOS } from './helpers.js';

function crearSolicitudDePrueba() {
  return crearSolicitud(
    {
      justificacion: 'Compra de equipos para nuevo puesto',
      fecha_requerida: '2026-12-01',
      centro_costo_id: 'cc-001',
      prioridad: 'alta',
      fecha_creacion: '2026-11-01',
      lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_estimado: 100000 }]
    },
    USUARIOS.solicitante
  );
}

function flujoHastaRecepcion() {
  const solicitud = crearSolicitudDePrueba();
  enviarSolicitud(solicitud.id, USUARIOS.solicitante);
  aprobarSolicitud(solicitud.id, USUARIOS.jefe);
  const cotizacion = registrarCotizacion(
    {
      solicitud_id: solicitud.id,
      proveedor_id: 'prov-001',
      fecha_validez: '2026-12-31',
      plazo_entrega_dias: 2,
      condicion_pago_dias: 30,
      lineas: [{ producto_id: 'prod-001', cantidad: 2, precio_unitario: 90000 }]
    },
    USUARIOS.comprador
  );
  seleccionarCotizacion(cotizacion.id, USUARIOS.comprador);
  const orden = emitirOrdenCompra(
    {
      solicitud_id: solicitud.id,
      cotizacion_id: cotizacion.id,
      fecha_emision: '2026-11-02',
      fecha_entrega_prometida: '2026-11-05'
    },
    USUARIOS.comprador
  );
  return { solicitud, cotizacion, orden };
}

describe('flujo completo de compras', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('recorre solicitud, cotización, OC, recepción, factura y pago', () => {
    const inicio = performance.now();
    const { solicitud, cotizacion, orden } = flujoHastaRecepcion();

    expect(obtenerCotizacion(cotizacion.id).estado).toBe('seleccionada');
    expect(cotizacion.neto).toBe(180000);
    expect(obtenerSolicitud(solicitud.id).estado).toBe('adjudicada');
    expect(obtenerSolicitud(solicitud.id).orden_compra_id).toBe(orden.id);
    expect(orden.estado).toBe('emitida');
    expect(orden.neto).toBe(180000);
    expect(orden.iva).toBe(34200);
    expect(orden.total).toBe(214200);

    const recepcion = registrarRecepcion(
      {
        orden_id: orden.id,
        fecha_recepcion: '2026-11-05',
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
    expect(recepcion.estado).toBe('total');
    expect(obtenerOrden(orden.id).estado).toBe('recibida_total');

    const factura = registrarFactura(
      {
        orden_id: orden.id,
        folio: 'F-9001',
        neto: 180000,
        fecha_recepcion: '2026-11-05'
      },
      USUARIOS.comprador
    );
    expect(factura.estado).toBe('registrada');
    expect(factura.iva).toBe(34200);
    expect(factura.total).toBe(214200);
    expect(factura.fecha_vencimiento).toBe('2026-12-05');

    const conciliada = conciliarFactura(factura.id, USUARIOS.comprador);
    expect(conciliada.estado).toBe('conciliada');
    expect(conciliada.diferencia).toBe(0);

    const pagada = aprobarPago(factura.id, USUARIOS.jefe);
    expect(pagada.estado).toBe('aprobada_pago');
    expect(pagada.alerta_fraude).toBe(false);
    expect(performance.now() - inicio).toBeLessThan(300000);
  });

  it('exige motivo y aprobación segregada en devoluciones', () => {
    const { orden } = flujoHastaRecepcion();
    registrarRecepcion(
      {
        orden_id: orden.id,
        fecha_recepcion: '2026-11-05',
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

    const devolucion = registrarDevolucion(
      {
        orden_id: orden.id,
        lineas: [
          {
            orden_linea_id: orden.lineas[0].linea_id,
            cantidad: 1,
            motivo: 'Producto defectuoso'
          }
        ]
      },
      USUARIOS.bodega
    );

    expect(devolucion.estado).toBe('pendiente_aprobacion');
    expect(devolucion.aprobada_por).toBeNull();

    const aprobada = aprobarDevolucion(devolucion.id, USUARIOS.jefe);
    expect(aprobada.estado).toBe('aprobada');
    expect(devolucionesAprobadasNeto(orden.id)).toBe(90000);
  });

  it('impide devolver más unidades de las aceptadas', () => {
    const { orden } = flujoHastaRecepcion();
    registrarRecepcion(
      {
        orden_id: orden.id,
        fecha_recepcion: '2026-11-05',
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

    expect(() =>
      registrarDevolucion(
        {
          orden_id: orden.id,
          lineas: [
            {
              orden_linea_id: orden.lineas[0].linea_id,
              cantidad: 3,
              motivo: 'Sobrante'
            }
          ]
        },
        USUARIOS.bodega
      )
    ).toThrow(/No puedes devolver más de lo aceptado/);
  });

  it('evalúa una OC recibida una sola vez y calcula el plazo', () => {
    const { orden } = flujoHastaRecepcion();
    registrarRecepcion(
      {
        orden_id: orden.id,
        fecha_recepcion: '2026-11-05',
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

    const evaluacion = registrarEvaluacion(
      {
        orden_id: orden.id,
        puntaje_calidad: 5,
        puntaje_atencion: 4,
        comentario: 'Entrega puntual'
      },
      USUARIOS.comprador
    );

    expect(evaluacion.dias_atraso).toBe(0);
    expect(evaluacion.puntaje_plazo).toBe(5);
    expect(evaluacion.promedio).toBe(4.7);

    expect(() =>
      registrarEvaluacion(
        {
          orden_id: orden.id,
          puntaje_calidad: 4,
          puntaje_atencion: 4
        },
        USUARIOS.comprador
      )
    ).toThrow(/ya tiene una evaluación/);
  });

  it('exige al menos tres cotizaciones sobre el umbral salvo justificación', () => {
    const solicitud = crearSolicitud(
      {
        justificacion: 'Compra sobre el umbral',
        fecha_requerida: '2026-12-01',
        centro_costo_id: 'cc-002',
        fecha_creacion: '2026-11-01',
        lineas: [{ producto_id: 'prod-006', cantidad: 1, precio_estimado: 1500000 }]
      },
      USUARIOS.solicitante
    );
    enviarSolicitud(solicitud.id, USUARIOS.solicitante);
    aprobarSolicitud(solicitud.id, USUARIOS.jefe);

    const cotizacion = registrarCotizacion(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-002',
        fecha_validez: '2026-12-31',
        lineas: [{ producto_id: 'prod-006', cantidad: 1, precio_unitario: 1500000 }]
      },
      USUARIOS.comprador
    );

    expect(() => seleccionarCotizacion(cotizacion.id, USUARIOS.comprador)).toThrow(
      /al menos 3 cotizaciones/
    );
    const seleccionada = seleccionarCotizacion(cotizacion.id, USUARIOS.comprador, {
      justificacion_proveedor_unico: 'Único proveedor certificado'
    });
    expect(seleccionada.estado).toBe('seleccionada');
  });
});
