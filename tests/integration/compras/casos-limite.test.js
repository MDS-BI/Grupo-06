import { beforeEach, describe, expect, it } from 'vitest';
import {
  aprobarSolicitud,
  crearSolicitud,
  enviarSolicitud,
  obtenerSolicitud
} from '../../../src/compras/solicitudes.js';
import { registrarCotizacion, seleccionarCotizacion } from '../../../src/compras/cotizaciones.js';
import {
  anularOrdenCompra,
  emitirOrdenCompra,
  obtenerOrden
} from '../../../src/compras/ordenes-compra.js';
import { registrarRecepcion } from '../../../src/compras/recepciones.js';
import {
  aprobarPago,
  conciliarFactura,
  obtenerFactura,
  registrarFactura
} from '../../../src/compras/facturas.js';
import { exportarProveedores, exportarSolicitudes } from '../../../src/compras/exportacion.js';
import { guardar, leer } from '../../../src/compras/almacenamiento.js';
import { cambiarEstadoProveedor } from '../../../src/compras/proveedores.js';
import { cargarDatos, USUARIOS } from './helpers.js';

function solicitudAprobada({ monto = 100000, producto = 'prod-001', cantidad = 1 } = {}) {
  const solicitud = crearSolicitud(
    {
      justificacion: 'Solicitud de prueba',
      fecha_requerida: '2026-12-01',
      centro_costo_id: 'cc-001',
      fecha_creacion: '2026-11-01',
      lineas: [{ producto_id: producto, cantidad, precio_estimado: monto / cantidad }]
    },
    USUARIOS.solicitante
  );
  enviarSolicitud(solicitud.id, USUARIOS.solicitante);
  aprobarSolicitud(solicitud.id, USUARIOS.jefe);
  return solicitud;
}

function ordenConRecepcion({
  proveedor = 'prov-001',
  monto = 100000,
  producto = 'prod-001',
  cantidad = 1
} = {}) {
  const solicitud = solicitudAprobada({ monto, producto, cantidad });
  const cotizacion = registrarCotizacion(
    {
      solicitud_id: solicitud.id,
      proveedor_id: proveedor,
      fecha_validez: '2026-12-31',
      plazo_entrega_dias: 2,
      condicion_pago_dias: 30,
      lineas: [{ producto_id: producto, cantidad, precio_unitario: monto / cantidad }]
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
  registrarRecepcion(
    {
      orden_id: orden.id,
      fecha_recepcion: '2026-11-05',
      lineas: [
        {
          orden_linea_id: orden.lineas[0].linea_id,
          cantidad_recibida: cantidad,
          cantidad_aceptada: cantidad
        }
      ]
    },
    USUARIOS.bodega
  );
  return { solicitud, cotizacion, orden };
}

describe('casos límite de compras', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('permite compra directa bajo el umbral y la bloquea sobre el umbral', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    const directa = emitirOrdenCompra(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001',
        fecha_emision: '2026-11-02'
      },
      USUARIOS.comprador
    );
    expect(directa.estado).toBe('emitida');
    expect(obtenerSolicitud(solicitud.id).estado).toBe('adjudicada');

    const sobreUmbral = solicitudAprobada({ monto: 1500000, producto: 'prod-006' });
    expect(() =>
      emitirOrdenCompra(
        {
          solicitud_id: sobreUmbral.id,
          proveedor_id: 'prov-001'
        },
        USUARIOS.comprador
      )
    ).toThrow(/supera el umbral/);
  });

  it('impide emitir OC a proveedores bloqueados o no aprobados', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    expect(() =>
      emitirOrdenCompra(
        {
          solicitud_id: solicitud.id,
          proveedor_id: 'prov-006'
        },
        USUARIOS.comprador
      )
    ).toThrow(/proveedor aprobado/);

    expect(() =>
      emitirOrdenCompra(
        {
          solicitud_id: solicitud.id,
          proveedor_id: 'prov-005'
        },
        USUARIOS.comprador
      )
    ).toThrow(/proveedor aprobado/);
  });

  it('impide duplicar OC y permite reemitir tras anular', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    const cotizacion = registrarCotizacion(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001',
        fecha_validez: '2026-12-31',
        lineas: [{ producto_id: 'prod-008', cantidad: 1, precio_unitario: 100000 }]
      },
      USUARIOS.comprador
    );
    seleccionarCotizacion(cotizacion.id, USUARIOS.comprador);
    const orden = emitirOrdenCompra(
      {
        solicitud_id: solicitud.id,
        cotizacion_id: cotizacion.id
      },
      USUARIOS.comprador
    );

    expect(() =>
      emitirOrdenCompra(
        {
          solicitud_id: solicitud.id,
          cotizacion_id: cotizacion.id
        },
        USUARIOS.comprador
      )
    ).toThrow(/Solo se puede emitir|ya tiene una orden/);

    const anulada = anularOrdenCompra(orden.id, USUARIOS.comprador, 'Error de emisión');
    expect(anulada.estado).toBe('anulada');
    expect(obtenerSolicitud(solicitud.id).estado).toBe('en_cotizacion');

    const reemitida = emitirOrdenCompra(
      {
        solicitud_id: solicitud.id,
        cotizacion_id: cotizacion.id
      },
      USUARIOS.comprador
    );
    expect(reemitida.id).not.toBe(orden.id);
    expect(reemitida.estado).toBe('emitida');
  });

  it('no anula una OC con recepciones registradas', () => {
    const { orden } = ordenConRecepcion();
    expect(() => anularOrdenCompra(orden.id, USUARIOS.comprador, 'Intento')).toThrow(
      /recepciones registradas/
    );
  });

  it('registra sobreentrega como rechazo no corresponde y actualiza la OC', () => {
    const solicitud = solicitudAprobada({ monto: 200000, producto: 'prod-001', cantidad: 2 });
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
            cantidad_recibida: 3,
            cantidad_aceptada: 3
          }
        ]
      },
      USUARIOS.bodega
    );

    expect(recepcion.lineas[0].cantidad_aceptada).toBe(2);
    expect(recepcion.lineas[0].cantidad_rechazada).toBe(1);
    expect(recepcion.lineas[0].motivo_rechazo).toBe('no_corresponde');
    expect(obtenerOrden(orden.id).estado).toBe('recibida_total');
  });

  it('exige motivo al rechazar unidades y prohíbe recepcionar sin cantidades', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    const orden = emitirOrdenCompra(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001'
      },
      USUARIOS.comprador
    );

    expect(() =>
      registrarRecepcion(
        {
          orden_id: orden.id,
          lineas: [
            {
              orden_linea_id: orden.lineas[0].linea_id,
              cantidad_recibida: 1,
              cantidad_aceptada: 0,
              cantidad_rechazada: 1
            }
          ]
        },
        USUARIOS.bodega
      )
    ).toThrow(/motivo/);

    expect(() =>
      registrarRecepcion(
        {
          orden_id: orden.id,
          lineas: [{ orden_linea_id: orden.lineas[0].linea_id, cantidad_recibida: 0 }]
        },
        USUARIOS.bodega
      )
    ).toThrow(/al menos una cantidad recibida/);
  });

  it('controla folios, notas de crédito y aprobación de facturas', () => {
    const { orden } = ordenConRecepcion({ monto: 100000, producto: 'prod-008' });

    const factura = registrarFactura(
      {
        orden_id: orden.id,
        folio: 'F-7777',
        neto: 100000,
        fecha_recepcion: '2026-11-05'
      },
      USUARIOS.comprador
    );

    expect(() =>
      registrarFactura(
        {
          orden_id: orden.id,
          folio: 'F-7777',
          neto: 100000
        },
        USUARIOS.comprador
      )
    ).toThrow(/folio/);

    expect(() =>
      registrarFactura(
        {
          orden_id: orden.id,
          tipo_documento: 'nota_credito',
          folio: 'NC-1',
          factura_referencia_id: factura.id,
          neto: 100001
        },
        USUARIOS.comprador
      )
    ).toThrow(/no puede superar/);

    const nota = registrarFactura(
      {
        orden_id: orden.id,
        tipo_documento: 'nota_credito',
        folio: 'NC-1',
        factura_referencia_id: factura.id,
        neto: 10000
      },
      USUARIOS.comprador
    );
    expect(nota.estado).toBe('conciliada');

    const conciliada = conciliarFactura(factura.id, USUARIOS.comprador);
    expect(conciliada.estado).toBe('con_discrepancia');
    expect(conciliada.pendiente_conciliacion).toBe(90000);
  });

  it('cierra la OC y salda la factura cuando la nota de crédito cubre el saldo', () => {
    const { orden } = ordenConRecepcion({ monto: 100000, producto: 'prod-008' });
    const factura = registrarFactura(
      {
        orden_id: orden.id,
        folio: 'F-CLOSE',
        neto: 100000,
        fecha_recepcion: '2026-11-05'
      },
      USUARIOS.comprador
    );

    registrarFactura(
      {
        orden_id: orden.id,
        tipo_documento: 'nota_credito',
        folio: 'NC-CLOSE',
        factura_referencia_id: factura.id,
        neto: 100000
      },
      USUARIOS.comprador
    );

    expect(obtenerOrden(orden.id).estado).toBe('cerrada');
    expect(obtenerFactura(factura.id).saldada).toBe(true);
  });

  it('no cancela las OC abiertas al bloquear al proveedor', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    const cotizacion = registrarCotizacion(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001',
        fecha_validez: '2026-12-31',
        plazo_entrega_dias: 2,
        condicion_pago_dias: 30,
        lineas: [{ producto_id: 'prod-008', cantidad: 1, precio_unitario: 100000 }]
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

    cambiarEstadoProveedor('prov-001', 'bloqueado', USUARIOS.comprador);
    expect(obtenerOrden(orden.id).estado).toBe('emitida');

    registrarRecepcion(
      {
        orden_id: orden.id,
        fecha_recepcion: '2026-11-05',
        lineas: [
          {
            orden_linea_id: orden.lineas[0].linea_id,
            cantidad_recibida: 1,
            cantidad_aceptada: 1
          }
        ]
      },
      USUARIOS.bodega
    );
    expect(obtenerOrden(orden.id).estado).toBe('recibida_total');
  });

  it('mantiene operativas las solicitudes abiertas si el producto se desactiva', () => {
    const solicitud = crearSolicitud(
      {
        justificacion: 'Solicitud con producto que luego se desactiva',
        fecha_requerida: '2026-12-01',
        centro_costo_id: 'cc-001',
        fecha_creacion: '2026-11-01',
        lineas: [{ producto_id: 'prod-001', cantidad: 1, precio_estimado: 100000 }]
      },
      USUARIOS.solicitante
    );

    guardar(
      'productos',
      leer('productos').map((p) => (p.id === 'prod-001' ? { ...p, activo: false } : p))
    );

    enviarSolicitud(solicitud.id, USUARIOS.solicitante);
    expect(aprobarSolicitud(solicitud.id, USUARIOS.jefe).estado).toBe('aprobada');
    expect(obtenerSolicitud(solicitud.id).lineas[0].producto_id).toBe('prod-001');
  });

  it('exige recepción previa para facturar', () => {
    const solicitud = solicitudAprobada({ monto: 100000, producto: 'prod-008' });
    const orden = emitirOrdenCompra(
      {
        solicitud_id: solicitud.id,
        proveedor_id: 'prov-001'
      },
      USUARIOS.comprador
    );
    expect(() =>
      registrarFactura(
        {
          orden_id: orden.id,
          folio: 'F-8888',
          neto: 100000
        },
        USUARIOS.comprador
      )
    ).toThrow(/al menos una recepción/);
  });

  it('advierte posible fraude al aprobar pago de proveedor con cuenta reciente', () => {
    const { orden } = ordenConRecepcion({
      proveedor: 'prov-002',
      monto: 100000,
      producto: 'prod-008'
    });
    const factura = registrarFactura(
      {
        orden_id: orden.id,
        folio: 'F-9999',
        neto: 100000,
        fecha_recepcion: '2026-11-05'
      },
      USUARIOS.comprador
    );
    const conciliada = conciliarFactura(factura.id, USUARIOS.comprador);
    expect(conciliada.estado).toBe('conciliada');
    const pagada = aprobarPago(factura.id, USUARIOS.jefe);
    expect(pagada.alerta_fraude).toBe(true);
    expect(pagada.mensaje_alerta).toMatch(/Posible fraude/);
  });

  it('exporta solo las solicitudes propias del solicitante y tolera listas vacías', () => {
    const csv = exportarSolicitudes(USUARIOS.solicitante, { descargar: false });
    expect(csv).toContain('SC-2026-0001');
    expect(csv).not.toContain('SC-2026-0003');

    const vacio = exportarProveedores({ filas: [], descargar: false });
    expect(vacio.startsWith('\uFEFF')).toBe(true);
    expect(vacio.trim().split('\r\n').length).toBe(1);
  });
});
