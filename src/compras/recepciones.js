import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import { generarNumero, siguienteSecuencia, hoyISO } from './reglas.js';
import { obtenerOrden, lineasPendientes, recepcionesDeOrden } from './ordenes-compra.js';

export function listarRecepciones({ orden_id } = {}) {
  return leer('recepciones')
    .filter((r) => !orden_id || r.orden_id === orden_id)
    .sort((a, b) => String(b.fecha_recepcion).localeCompare(String(a.fecha_recepcion)));
}

export function obtenerRecepcion(id) {
  return leer('recepciones').find((r) => r.id === id);
}

function actualizarEstadoOrden(ordenId) {
  const orden = obtenerOrden(ordenId);
  if (!orden) return null;
  const pendientes = lineasPendientes(orden);
  const totalRecibido = pendientes.every((l) => l.cantidad_pendiente === 0);
  const algoRecibido = pendientes.some((l) => l.cantidad_aceptada > 0);
  let estado = orden.estado;
  if (totalRecibido) estado = 'recibida_total';
  else if (algoRecibido) estado = 'recibida_parcial';
  if (estado !== orden.estado) {
    const lista = leer('ordenes');
    const idx = lista.findIndex((o) => o.id === ordenId);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], estado, updatedAt: new Date().toISOString() };
      guardar('ordenes', lista);
      return lista[idx];
    }
  }
  return orden;
}

export function registrarRecepcion(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('registrar_recepcion', usuario);
  const orden = obtenerOrden(datos.orden_id);
  if (!orden) throw new Error('La orden de compra no existe');
  if (!['emitida', 'recibida_parcial'].includes(orden.estado)) {
    throw new Error('Solo se puede recepcionar una OC emitida o recibida parcialmente');
  }
  if (orden.emitida_por === usuario.id && usuario.rol !== 'admin_ti') {
    throw new Error(
      'Quien emitió la OC no puede registrar su recepción (segregación de funciones)'
    );
  }
  const pendientes = lineasPendientes(orden);
  const porLinea = new Map((datos.lineas || []).map((l) => [l.orden_linea_id, l]));
  const lineas = [];
  for (const pendiente of pendientes) {
    const entrada = porLinea.get(pendiente.linea_id);
    if (!entrada) continue;
    const recibida = Number(entrada.cantidad_recibida ?? entrada.cantidad_aceptada ?? 0);
    if (!Number.isFinite(recibida) || recibida < 0)
      throw new Error('Las cantidades recibidas deben ser números no negativos');
    if (recibida === 0 && Number(entrada.cantidad_rechazada || 0) === 0) continue;
    let aceptada =
      entrada.cantidad_aceptada === undefined ? recibida : Number(entrada.cantidad_aceptada);
    let rechazada =
      entrada.cantidad_rechazada === undefined
        ? recibida - aceptada
        : Number(entrada.cantidad_rechazada);
    let motivo = String(entrada.motivo_rechazo ?? '').trim();
    if (!Number.isFinite(aceptada) || aceptada < 0)
      throw new Error('Las cantidades aceptadas deben ser números no negativos');
    if (!Number.isFinite(rechazada) || rechazada < 0)
      throw new Error('Las cantidades rechazadas deben ser números no negativos');
    if (recibida > pendiente.cantidad_pendiente) {
      const excedente = recibida - pendiente.cantidad_pendiente;
      aceptada = Math.min(aceptada, pendiente.cantidad_pendiente);
      rechazada = recibida - aceptada;
      motivo = motivo || 'no_corresponde';
      if (excedente > 0 && !motivo)
        throw new Error('El excedente debe registrarse como rechazado con motivo');
    }
    if (aceptada > pendiente.cantidad_pendiente) aceptada = pendiente.cantidad_pendiente;
    if (rechazada > 0 && !motivo)
      throw new Error('Debes indicar el motivo de las unidades rechazadas');
    if (aceptada + rechazada !== recibida) {
      rechazada = recibida - aceptada;
      if (rechazada < 0)
        throw new Error('La cantidad aceptada no puede superar la cantidad recibida');
    }
    if (aceptada + rechazada === 0) continue;
    lineas.push({
      detalle_id: generarId('rl'),
      orden_linea_id: pendiente.linea_id,
      producto_id: pendiente.producto_id,
      cantidad_recibida: recibida,
      cantidad_aceptada: aceptada,
      cantidad_rechazada: rechazada,
      motivo_rechazo: rechazada > 0 ? motivo : ''
    });
  }
  if (lineas.length === 0) throw new Error('Debes registrar al menos una cantidad recibida');
  const ahora = hoyISO();
  const anio = Number(ahora.slice(0, 4));
  const recepcion = {
    id: generarId('rec'),
    numero: generarNumero(
      'REC',
      anio,
      siguienteSecuencia(
        leer('recepciones').map((r) => r.numero),
        'REC',
        anio
      )
    ),
    orden_id: orden.id,
    estado: 'parcial',
    fecha_recepcion: datos.fecha_recepcion || ahora,
    registrada_por: usuario.id,
    observaciones: String(datos.observaciones ?? '').trim(),
    lineas,
    createdAt: new Date().toISOString()
  };
  const lista = leer('recepciones');
  lista.push(recepcion);
  guardar('recepciones', lista);
  const actualizada = actualizarEstadoOrden(orden.id);
  recepcion.estado = actualizada?.estado === 'recibida_total' ? 'total' : 'parcial';
  const idx = lista.findIndex((r) => r.id === recepcion.id);
  lista[idx] = recepcion;
  guardar('recepciones', lista);
  return recepcion;
}

export function unidadesAceptadasPorProducto(ordenId) {
  const orden = obtenerOrden(ordenId);
  if (!orden) return [];
  const mapa = new Map();
  for (const r of recepcionesDeOrden(ordenId)) {
    for (const linea of r.lineas || []) {
      mapa.set(
        linea.producto_id,
        (mapa.get(linea.producto_id) || 0) + Number(linea.cantidad_aceptada || 0)
      );
    }
  }
  return [...mapa.entries()].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
}

export function ordenesPorRecepcionar() {
  return leer('ordenes').filter((o) => ['emitida', 'recibida_parcial'].includes(o.estado));
}

export { actualizarEstadoOrden };
