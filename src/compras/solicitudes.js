import { leer, guardar, generarId, getUsuarioActivo, exigirPermiso } from './almacenamiento.js';
import {
  calcularTotales,
  generarNumero,
  siguienteSecuencia,
  puedeTransicionar,
  hoyISO
} from './reglas.js';
import { precioReferenciaVigente } from './catalogo.js';

export function productosActivos() {
  return leer('productos').filter((p) => p.activo !== false);
}

export function productoPorId(id) {
  return leer('productos').find((p) => p.id === id);
}

export function centrosCosto() {
  return leer('centros_costo');
}

export function listarSolicitudes(usuario = getUsuarioActivo()) {
  const lista = leer('solicitudes');
  const visibles =
    usuario?.rol === 'solicitante' ? lista.filter((s) => s.solicitante_id === usuario.id) : lista;
  return [...visibles].sort((a, b) =>
    String(b.fecha_creacion).localeCompare(String(a.fecha_creacion))
  );
}

export function obtenerSolicitud(id) {
  return leer('solicitudes').find((s) => s.id === id);
}

export function puedeVerSolicitud(solicitud, usuario = getUsuarioActivo()) {
  return (
    Boolean(solicitud) &&
    (usuario?.rol !== 'solicitante' || solicitud.solicitante_id === usuario.id)
  );
}

function validarCabecera(datos) {
  const errors = {};
  if (!String(datos.justificacion ?? '').trim())
    errors.justificacion = 'La justificación es obligatoria';
  if (!datos.fecha_requerida) errors.fecha_requerida = 'La fecha requerida es obligatoria';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_requerida))
    errors.fecha_requerida = 'La fecha requerida debe tener formato YYYY-MM-DD';
  if (!datos.centro_costo_id) errors.centro_costo_id = 'El centro de costo es obligatorio';
  else if (!centrosCosto().some((c) => c.id === datos.centro_costo_id))
    errors.centro_costo_id = 'El centro de costo no existe';
  if (datos.prioridad && !['baja', 'media', 'alta'].includes(datos.prioridad))
    errors.prioridad = 'La prioridad debe ser baja, media o alta';
  return errors;
}

function normalizarLineas(lineas) {
  const errors = {};
  const productos = productosActivos();
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { errors: { lineas: 'La solicitud debe tener al menos un producto' }, lineas: [] };
  }
  const out = lineas.map((linea, i) => {
    const producto = productos.find((p) => p.id === linea.producto_id);
    const cantidad = Number(linea.cantidad);
    const precio = Number(linea.precio_estimado ?? linea.precio_unitario);
    if (!producto)
      errors[`linea_${i}`] = `El producto de la línea ${i + 1} no existe o está inactivo`;
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      errors[`linea_${i}_cantidad`] = `La cantidad de la línea ${i + 1} debe ser mayor a 0`;
    if (!Number.isFinite(precio) || precio < 0)
      errors[`linea_${i}_precio`] = `El precio de la línea ${i + 1} debe ser un número no negativo`;
    return {
      linea_id: linea.linea_id || generarId('sl'),
      producto_id: linea.producto_id,
      cantidad,
      precio_estimado: precio,
      descuento_pct: Number(linea.descuento_pct) || 0
    };
  });
  return { errors, lineas: out };
}

function montoDeLineas(lineas) {
  return calcularTotales(lineas.map((l) => ({ ...l, precio_unitario: l.precio_estimado }))).neto;
}

function siguienteNumero(anio) {
  return generarNumero(
    'SC',
    anio,
    siguienteSecuencia(
      leer('solicitudes').map((s) => s.numero),
      'SC',
      anio
    )
  );
}

export function crearSolicitud(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('crear_solicitud', usuario);
  const errors = validarCabecera(datos);
  const { errors: lineErrors, lineas } = normalizarLineas(datos.lineas);
  Object.assign(errors, lineErrors);
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  const anio = Number(String(datos.fecha_creacion || hoyISO()).slice(0, 4));
  const ahora = hoyISO();
  const solicitanteId =
    usuario.rol === 'solicitante' ? usuario.id : datos.solicitante_id || usuario.id;
  const solicitud = {
    id: generarId('sol'),
    numero: siguienteNumero(anio),
    estado: 'borrador',
    solicitante_id: solicitanteId,
    centro_costo_id: datos.centro_costo_id,
    prioridad: datos.prioridad || 'media',
    justificacion: String(datos.justificacion).trim(),
    fecha_requerida: datos.fecha_requerida,
    fecha_creacion: datos.fecha_creacion || ahora,
    lineas,
    monto_estimado: montoDeLineas(lineas),
    historial: [{ fecha: ahora, accion: 'creacion', usuario_id: usuario.id }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const lista = leer('solicitudes');
  lista.push(solicitud);
  guardar('solicitudes', lista);
  return solicitud;
}

export function actualizarSolicitud(id, cambios, usuario = getUsuarioActivo()) {
  const lista = leer('solicitudes');
  const idx = lista.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Solicitud no encontrada');
  const solicitud = lista[idx];
  if (solicitud.estado !== 'borrador')
    throw new Error('Solo se pueden editar solicitudes en borrador');
  if (usuario.rol === 'solicitante' && solicitud.solicitante_id !== usuario.id) {
    throw new Error('No puedes editar una solicitud de otro usuario');
  }
  const datos = { ...solicitud, ...cambios };
  const errors = validarCabecera(datos);
  let lineas = solicitud.lineas;
  if (cambios.lineas) {
    const res = normalizarLineas(cambios.lineas);
    Object.assign(errors, res.errors);
    lineas = res.lineas;
  }
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  lista[idx] = {
    ...solicitud,
    centro_costo_id: datos.centro_costo_id,
    prioridad: datos.prioridad,
    justificacion: String(datos.justificacion).trim(),
    fecha_requerida: datos.fecha_requerida,
    lineas,
    monto_estimado: montoDeLineas(lineas),
    updatedAt: new Date().toISOString()
  };
  guardar('solicitudes', lista);
  return lista[idx];
}

function cambiarEstado(id, nuevoEstado, extra = {}, usuario = getUsuarioActivo()) {
  const lista = leer('solicitudes');
  const idx = lista.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Solicitud no encontrada');
  const solicitud = lista[idx];
  if (!puedeTransicionar('solicitud', solicitud.estado, nuevoEstado)) {
    throw new Error(`Transición de solicitud inválida de "${solicitud.estado}" a "${nuevoEstado}"`);
  }
  const ahora = hoyISO();
  lista[idx] = {
    ...solicitud,
    ...extra,
    estado: nuevoEstado,
    historial: [
      ...(solicitud.historial || []),
      { fecha: ahora, accion: nuevoEstado, usuario_id: usuario.id }
    ],
    updatedAt: new Date().toISOString()
  };
  guardar('solicitudes', lista);
  return lista[idx];
}

export function enviarSolicitud(id, usuario = getUsuarioActivo()) {
  const solicitud = obtenerSolicitud(id);
  if (!solicitud) throw new Error('Solicitud no encontrada');
  if (usuario.rol === 'solicitante' && solicitud.solicitante_id !== usuario.id) {
    throw new Error('No puedes enviar una solicitud de otro usuario');
  }
  if (!solicitud.lineas || solicitud.lineas.length === 0)
    throw new Error('La solicitud debe tener al menos un producto');
  if (solicitud.estado !== 'borrador')
    throw new Error('Solo se pueden enviar solicitudes en borrador');
  return cambiarEstado(id, 'enviada', { fecha_envio: hoyISO() }, usuario);
}

export function aprobarSolicitud(
  id,
  usuario = getUsuarioActivo(),
  { aprobar = true, motivo = '' } = {}
) {
  exigirPermiso('aprobar_solicitud', usuario);
  const solicitud = obtenerSolicitud(id);
  if (!solicitud) throw new Error('Solicitud no encontrada');
  if (solicitud.estado !== 'enviada')
    throw new Error('Solo se pueden aprobar o rechazar solicitudes enviadas');
  if (solicitud.solicitante_id === usuario.id) {
    throw new Error('No puedes aprobar o rechazar tu propia solicitud (segregación de funciones)');
  }
  if (!aprobar && !String(motivo).trim()) throw new Error('El rechazo exige un motivo');
  const ahora = hoyISO();
  if (aprobar) {
    return cambiarEstado(
      id,
      'aprobada',
      { aprobada_por: usuario.id, fecha_aprobacion: ahora },
      usuario
    );
  }
  return cambiarEstado(
    id,
    'rechazada',
    { rechazada_por: usuario.id, fecha_rechazo: ahora, motivo_rechazo: String(motivo).trim() },
    usuario
  );
}

export function anularSolicitud(id, usuario = getUsuarioActivo(), motivo = '') {
  const solicitud = obtenerSolicitud(id);
  if (!solicitud) throw new Error('Solicitud no encontrada');
  if (['adjudicada', 'anulada', 'rechazada'].includes(solicitud.estado)) {
    throw new Error('La solicitud ya no puede anularse');
  }
  const autorizado =
    usuario.rol === 'admin_ti' ||
    usuario.rol === 'jefe_compras' ||
    (usuario.rol === 'solicitante' && solicitud.solicitante_id === usuario.id);
  if (!autorizado) throw new Error('No puedes anular esta solicitud');
  return cambiarEstado(
    id,
    'anulada',
    { anulada_por: usuario.id, fecha_anulacion: hoyISO(), motivo_anulacion: String(motivo).trim() },
    usuario
  );
}

export function moverSolicitud(id, estado, extra = {}, usuario = getUsuarioActivo()) {
  return cambiarEstado(id, estado, extra, usuario);
}

export function precioSugerido(productoId) {
  return precioReferenciaVigente(productoId);
}

export function lineasEnriquecidas(solicitud) {
  return (solicitud?.lineas || []).map((l) => ({
    ...l,
    producto: productoPorId(l.producto_id),
    subtotal: Number(l.cantidad) * Number(l.precio_estimado)
  }));
}

export { validarCabecera, normalizarLineas, montoDeLineas };
