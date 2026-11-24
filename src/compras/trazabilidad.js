import { leer, guardar, generarId, getUsuarioActivo } from './almacenamiento.js';
import { enmascararCuenta, hoyISO } from './reglas.js';

export const TIPOS_DOCUMENTO = Object.freeze({
  solicitud: { coleccion: 'solicitudes', tab: 'solicitudes', etiqueta: 'Solicitud' },
  cotizacion: { coleccion: 'cotizaciones', tab: 'cotizaciones', etiqueta: 'Cotización' },
  orden: { coleccion: 'ordenes', tab: 'ordenes', etiqueta: 'Orden de compra' },
  recepcion: { coleccion: 'recepciones', tab: 'recepciones', etiqueta: 'Recepción' },
  factura: { coleccion: 'facturas', tab: 'facturas', etiqueta: 'Factura' },
  devolucion: { coleccion: 'devoluciones', tab: 'devoluciones', etiqueta: 'Devolución' },
  proveedor: { coleccion: null, tab: 'proveedores', etiqueta: 'Proveedor' }
});

export function registrarEvento(entidad, entidadId, accion, opciones = {}) {
  const usuario = opciones.usuario || getUsuarioActivo();
  const eventos = leer('trazabilidad');
  const ahora = new Date();
  const evento = {
    id: generarId('trz'),
    entidad,
    entidad_id: entidadId,
    accion,
    estado_anterior: opciones.anterior ?? '',
    estado_nuevo: opciones.nuevo ?? '',
    usuario_id: usuario?.id || '',
    usuario_rol: usuario?.rol || '',
    detalle: String(opciones.detalle ?? '').trim(),
    fecha: hoyISO(ahora),
    fecha_hora: ahora.toISOString()
  };
  eventos.push(evento);
  guardar('trazabilidad', eventos);
  return evento;
}

export function listarEventos({ entidad, entidad_id, usuario_id, accion } = {}) {
  return leer('trazabilidad')
    .filter((e) => !entidad || e.entidad === entidad)
    .filter((e) => !entidad_id || e.entidad_id === entidad_id)
    .filter((e) => !usuario_id || e.usuario_id === usuario_id)
    .filter((e) => !accion || e.accion === accion)
    .sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
}

export function historialDe(entidad, entidadId) {
  return listarEventos({ entidad, entidad_id: entidadId });
}

export function tieneHistorial(entidad, entidadId) {
  return leer('trazabilidad').some((e) => e.entidad === entidad && e.entidad_id === entidadId);
}

function buscar(coleccion, id) {
  return leer(coleccion).find((item) => item.id === id || item.entity_id === id);
}

function ordenDeDocumento(entidad, id) {
  if (entidad === 'orden') return buscar('ordenes', id);
  if (entidad === 'recepcion') {
    const recepcion = buscar('recepciones', id);
    return recepcion && buscar('ordenes', recepcion.orden_id);
  }
  if (entidad === 'factura') {
    const factura = buscar('facturas', id);
    return factura && buscar('ordenes', factura.orden_id);
  }
  if (entidad === 'devolucion') {
    const devolucion = buscar('devoluciones', id);
    return devolucion && buscar('ordenes', devolucion.orden_id);
  }
  return null;
}

function solicitudDeDocumento(entidad, id) {
  if (entidad === 'solicitud') return buscar('solicitudes', id);
  if (entidad === 'cotizacion') {
    const cotizacion = buscar('cotizaciones', id);
    return cotizacion && buscar('solicitudes', cotizacion.solicitud_id);
  }
  const orden = ordenDeDocumento(entidad, id);
  return orden && buscar('solicitudes', orden.solicitud_id);
}

function nodo(tipo, documento) {
  const meta = TIPOS_DOCUMENTO[tipo];
  const resultado = {
    tipo,
    id: documento.id,
    numero: documento.numero || documento.folio || documento.id,
    estado: documento.estado || documento.estado_proveedor || '',
    etiqueta: `${meta.etiqueta} ${documento.numero || documento.folio || documento.id}`,
    tab: meta.tab
  };
  if (tipo === 'factura') {
    resultado.credito_a_favor = Number(documento.credito_a_favor || 0);
    resultado.saldada = Boolean(documento.saldada);
  }
  return resultado;
}

export function cadenaDocumental(entidad, id) {
  const solicitud = solicitudDeDocumento(entidad, id);
  if (!solicitud) return [];
  const nodos = [nodo('solicitud', solicitud)];
  const cotizaciones = leer('cotizaciones').filter((c) => c.solicitud_id === solicitud.id);
  nodos.push(...cotizaciones.map((c) => nodo('cotizacion', c)));
  const ordenes = leer('ordenes').filter((o) => o.solicitud_id === solicitud.id);
  nodos.push(...ordenes.map((o) => nodo('orden', o)));
  const ordenIds = new Set(ordenes.map((o) => o.id));
  const recepciones = leer('recepciones').filter((r) => ordenIds.has(r.orden_id));
  nodos.push(...recepciones.map((r) => nodo('recepcion', r)));
  const facturas = leer('facturas').filter((f) => ordenIds.has(f.orden_id));
  nodos.push(...facturas.map((f) => nodo('factura', f)));
  const devoluciones = leer('devoluciones').filter((d) => ordenIds.has(d.orden_id));
  nodos.push(...devoluciones.map((d) => nodo('devolucion', d)));
  return nodos;
}

export function registrarCambioBancario(proveedor, usuario = getUsuarioActivo()) {
  const cuenta = enmascararCuenta(proveedor?.numero_cuenta, 'comprador');
  return registrarEvento(
    'proveedor',
    proveedor?.entity_id || proveedor?.id,
    'cambio_datos_bancarios',
    {
      usuario,
      detalle: cuenta ? `Cuenta ${cuenta}` : 'Datos bancarios actualizados'
    }
  );
}

export { buscar as buscarDocumento };
