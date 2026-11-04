import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import { diasEntre, notaPlazo, redondearPromedio, hoyISO } from './reglas.js';
import { obtenerOrden } from './ordenes-compra.js';

export function listarEvaluaciones({ proveedor_id, orden_id } = {}) {
  return leer('evaluaciones')
    .filter((e) => !proveedor_id || e.proveedor_id === proveedor_id)
    .filter((e) => !orden_id || e.orden_id === orden_id)
    .sort((a, b) => String(b.fecha_evaluacion).localeCompare(String(a.fecha_evaluacion)));
}

export function obtenerEvaluacion(id) {
  return leer('evaluaciones').find((e) => e.id === id);
}

export function promedioProveedor(proveedorId) {
  const notas = listarEvaluaciones({ proveedor_id: proveedorId }).map((e) => Number(e.promedio));
  return redondearPromedio(notas);
}

export function evaluacionesDeProveedor(proveedorId) {
  return listarEvaluaciones({ proveedor_id: proveedorId });
}

function ultimaRecepcion(ordenId) {
  const recepciones = leer('recepciones').filter((r) => r.orden_id === ordenId);
  return recepciones.sort((a, b) =>
    String(b.fecha_recepcion).localeCompare(String(a.fecha_recepcion))
  )[0];
}

export function registrarEvaluacion(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('evaluar_proveedor', usuario);
  const orden = obtenerOrden(datos.orden_id);
  if (!orden) throw new Error('La orden de compra no existe');
  if (!['recibida_total', 'cerrada'].includes(orden.estado)) {
    throw new Error('Solo se puede evaluar una OC recibida totalmente o cerrada');
  }
  const existente = leer('evaluaciones').find((e) => e.orden_id === orden.id);
  if (existente) throw new Error('La orden ya tiene una evaluación registrada');
  const calidad = Number(datos.puntaje_calidad);
  const atencion = Number(datos.puntaje_atencion);
  if (!Number.isInteger(calidad) || calidad < 1 || calidad > 5)
    throw new Error('El puntaje de calidad debe ser un entero entre 1 y 5');
  if (!Number.isInteger(atencion) || atencion < 1 || atencion > 5)
    throw new Error('El puntaje de atención debe ser un entero entre 1 y 5');
  const recepcion = ultimaRecepcion(orden.id);
  const fechaRecepcion = recepcion?.fecha_recepcion || hoyISO();
  const atraso = Math.max(0, diasEntre(orden.fecha_entrega_prometida, fechaRecepcion));
  const plazo = notaPlazo(atraso);
  const evaluacion = {
    id: generarId('eval'),
    orden_id: orden.id,
    proveedor_id: orden.proveedor_id,
    puntaje_calidad: calidad,
    puntaje_plazo: plazo,
    puntaje_atencion: atencion,
    promedio: redondearPromedio([calidad, plazo, atencion]),
    dias_atraso: atraso,
    comentario: String(datos.comentario ?? '').trim(),
    evaluado_por: usuario.id,
    fecha_evaluacion: hoyISO(),
    createdAt: new Date().toISOString()
  };
  const lista = leer('evaluaciones');
  lista.push(evaluacion);
  guardar('evaluaciones', lista);
  return evaluacion;
}
