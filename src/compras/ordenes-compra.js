import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import {
  calcularTotales,
  calcularLinea,
  generarNumero,
  siguienteSecuencia,
  puedeTransicionar,
  UMBRAL_COTIZACIONES,
  hoyISO,
  sumarDias
} from './reglas.js';
import { obtenerSolicitud, moverSolicitud } from './solicitudes.js';
import { obtenerCotizacion } from './cotizaciones.js';
import { obtenerProveedor, proveedorAprobado } from './proveedores.js';

export function listarOrdenes({ estado, proveedor_id, solicitud_id } = {}) {
  return leer('ordenes')
    .filter((o) => !estado || o.estado === estado)
    .filter((o) => !proveedor_id || o.proveedor_id === proveedor_id)
    .filter((o) => !solicitud_id || o.solicitud_id === solicitud_id)
    .sort((a, b) => String(b.fecha_emision).localeCompare(String(a.fecha_emision)));
}

export function obtenerOrden(id) {
  return leer('ordenes').find((o) => o.id === id);
}

export function ordenNoAnuladaDeSolicitud(solicitudId) {
  return leer('ordenes').find((o) => o.solicitud_id === solicitudId && o.estado !== 'anulada');
}

export function recepcionesDeOrden(ordenId) {
  return leer('recepciones').filter((r) => r.orden_id === ordenId);
}

export function lineasPendientes(orden) {
  const recepciones = recepcionesDeOrden(orden.id);
  return (orden.lineas || []).map((linea) => {
    const aceptada = recepciones.reduce(
      (total, r) =>
        total +
        (r.lineas || [])
          .filter((l) => l.orden_linea_id === linea.linea_id)
          .reduce((sum, l) => sum + Number(l.cantidad_aceptada || 0), 0),
      0
    );
    const cantidad = Number(linea.cantidad) || 0;
    return {
      ...linea,
      cantidad_aceptada: aceptada,
      cantidad_pendiente: Math.max(0, cantidad - aceptada)
    };
  });
}

export function valorRecibidoNeto(orden) {
  if (!orden) return 0;
  return lineasPendientes(orden).reduce((total, linea) => {
    return (
      total +
      calcularLinea({
        cantidad: linea.cantidad_aceptada,
        precio_unitario: linea.precio_unitario,
        descuento_pct: linea.descuento_pct
      }).neto
    );
  }, 0);
}

function normalizarLineas(lineas) {
  return (lineas || []).map((linea) => ({
    linea_id: linea.linea_id || generarId('ol'),
    producto_id: linea.producto_id,
    cantidad: Number(linea.cantidad),
    precio_unitario: Number(linea.precio_unitario ?? linea.precio_estimado),
    descuento_pct: Number(linea.descuento_pct) || 0
  }));
}

function validarLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0)
    throw new Error('La orden de compra debe tener al menos una línea');
  for (const [i, linea] of lineas.entries()) {
    if (!linea.producto_id) throw new Error(`La línea ${i + 1} no tiene producto`);
    if (!Number.isFinite(linea.cantidad) || linea.cantidad <= 0)
      throw new Error(`La cantidad de la línea ${i + 1} debe ser mayor a 0`);
    if (!Number.isFinite(linea.precio_unitario) || linea.precio_unitario < 0)
      throw new Error(`El precio de la línea ${i + 1} debe ser un número no negativo`);
  }
}

export function emitirOrdenCompra(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('emitir_oc', usuario);
  const solicitud = obtenerSolicitud(datos.solicitud_id);
  if (!solicitud) throw new Error('La solicitud no existe');
  if (!['aprobada', 'en_cotizacion'].includes(solicitud.estado)) {
    throw new Error('Solo se puede emitir una OC desde una solicitud aprobada o en cotización');
  }
  if (ordenNoAnuladaDeSolicitud(solicitud.id)) {
    throw new Error('La solicitud ya tiene una orden de compra no anulada');
  }
  let cotizacion = null;
  let proveedorId = datos.proveedor_id;
  let lineas;
  let condicionPago = Number(datos.condicion_pago_dias);
  let plazoEntrega = Number(datos.plazo_entrega_dias);

  if (datos.cotizacion_id) {
    cotizacion = obtenerCotizacion(datos.cotizacion_id);
    if (!cotizacion) throw new Error('La cotización no existe');
    if (cotizacion.solicitud_id !== solicitud.id)
      throw new Error('La cotización no pertenece a la solicitud');
    if (cotizacion.estado !== 'seleccionada')
      throw new Error('Solo se puede emitir una OC desde una cotización seleccionada');
    if (leer('ordenes').some((o) => o.cotizacion_id === cotizacion.id && o.estado !== 'anulada'))
      throw new Error('La cotización ya tiene una orden de compra');
    proveedorId = cotizacion.proveedor_id;
    lineas = cotizacion.lineas.map((l) => ({ ...l, linea_id: generarId('ol') }));
    condicionPago = Number.isFinite(condicionPago) ? condicionPago : cotizacion.condicion_pago_dias;
    plazoEntrega = Number.isFinite(plazoEntrega) ? plazoEntrega : cotizacion.plazo_entrega_dias;
  } else {
    if (Number(solicitud.monto_estimado) >= UMBRAL_COTIZACIONES) {
      throw new Error(
        'La compra supera el umbral de cotizaciones: debes seleccionar una cotización'
      );
    }
    if (!proveedorId) throw new Error('Debes seleccionar un proveedor para la compra directa');
    lineas =
      datos.lineas && datos.lineas.length > 0
        ? datos.lineas
        : solicitud.lineas.map((l) => ({
            producto_id: l.producto_id,
            cantidad: l.cantidad,
            precio_unitario: l.precio_estimado,
            descuento_pct: 0
          }));
  }

  const proveedor = obtenerProveedor(proveedorId);
  if (!proveedor) throw new Error('El proveedor no existe');
  if (!proveedorAprobado(proveedorId))
    throw new Error('Solo se puede emitir una OC a un proveedor aprobado');
  lineas = normalizarLineas(lineas);
  validarLineas(lineas);
  const totales = calcularTotales(lineas);
  const hoy = hoyISO();
  const anio = Number(hoy.slice(0, 4));
  const orden = {
    id: generarId('oc'),
    numero: generarNumero(
      'OC',
      anio,
      siguienteSecuencia(
        leer('ordenes').map((o) => o.numero),
        'OC',
        anio
      )
    ),
    solicitud_id: solicitud.id,
    cotizacion_id: cotizacion?.id || null,
    proveedor_id: proveedor.entity_id,
    estado: 'emitida',
    fecha_emision: datos.fecha_emision || hoy,
    fecha_entrega_prometida:
      datos.fecha_entrega_prometida || sumarDias(datos.fecha_emision || hoy, plazoEntrega || 0),
    condicion_pago_dias: Number.isFinite(condicionPago)
      ? condicionPago
      : Number(proveedor.condicion_pago_dias) || 0,
    moneda: datos.moneda || 'CLP',
    emitida_por: usuario.id,
    lineas,
    ...totales,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const lista = leer('ordenes');
  lista.push(orden);
  guardar('ordenes', lista);
  moverSolicitud(
    solicitud.id,
    'adjudicada',
    { orden_compra_id: orden.id, fecha_adjudicacion: hoy },
    usuario
  );
  return orden;
}

export function anularOrdenCompra(id, usuario = getUsuarioActivo(), motivo = '') {
  exigirPermiso('emitir_oc', usuario);
  const lista = leer('ordenes');
  const idx = lista.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error('Orden de compra no encontrada');
  const orden = lista[idx];
  if (orden.estado === 'anulada') throw new Error('La orden ya está anulada');
  if (recepcionesDeOrden(orden.id).length > 0)
    throw new Error('No se puede anular una OC con recepciones registradas');
  if (!puedeTransicionar('orden', orden.estado, 'anulada'))
    throw new Error(`No se puede anular una OC en estado "${orden.estado}"`);
  const hoy = hoyISO();
  lista[idx] = {
    ...orden,
    estado: 'anulada',
    motivo_anulacion: String(motivo).trim(),
    anulada_por: usuario.id,
    fecha_anulacion: hoy,
    updatedAt: new Date().toISOString()
  };
  guardar('ordenes', lista);
  if (orden.solicitud_id) {
    const solicitud = obtenerSolicitud(orden.solicitud_id);
    if (solicitud) {
      const tieneCotizaciones = leer('cotizaciones').some((c) => c.solicitud_id === solicitud.id);
      moverSolicitud(
        solicitud.id,
        tieneCotizaciones ? 'en_cotizacion' : 'aprobada',
        { orden_compra_id: null },
        usuario
      );
    }
  }
  return lista[idx];
}

export function ordenesAbiertas() {
  return listarOrdenes().filter((o) => ['emitida', 'recibida_parcial'].includes(o.estado));
}

export function ordenesEmitidasSinRecepcion() {
  return listarOrdenes({ estado: 'emitida' }).filter((o) => recepcionesDeOrden(o.id).length === 0);
}
