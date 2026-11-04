import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import {
  calcularTotales,
  generarNumero,
  siguienteSecuencia,
  puedeTransicionar,
  UMBRAL_COTIZACIONES,
  hoyISO,
  redondearPromedio
} from './reglas.js';
import { obtenerSolicitud, moverSolicitud } from './solicitudes.js';
import { obtenerProveedor } from './proveedores.js';

export function listarCotizaciones({ solicitud_id, proveedor_id } = {}) {
  return leer('cotizaciones')
    .filter((c) => !solicitud_id || c.solicitud_id === solicitud_id)
    .filter((c) => !proveedor_id || c.proveedor_id === proveedor_id)
    .sort((a, b) => String(b.fecha_registro).localeCompare(String(a.fecha_registro)));
}

export function obtenerCotizacion(id) {
  return leer('cotizaciones').find((c) => c.id === id);
}

export function promedioProveedor(proveedorId) {
  const notas = leer('evaluaciones')
    .filter((e) => e.proveedor_id === proveedorId)
    .map((e) => Number(e.promedio));
  return redondearPromedio(notas);
}

function validarLineas(lineas, solicitud) {
  const errores = {};
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { errores: { lineas: 'La cotización debe tener al menos una línea' }, lineas: [] };
  }
  const productos = new Set((solicitud?.lineas || []).map((l) => l.producto_id));
  const out = lineas.map((linea, i) => {
    const cantidad = Number(linea.cantidad);
    const precio = Number(linea.precio_unitario);
    if (!productos.has(linea.producto_id))
      errores[`linea_${i}`] = `El producto de la línea ${i + 1} no pertenece a la solicitud`;
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      errores[`linea_${i}_cantidad`] = `La cantidad de la línea ${i + 1} debe ser mayor a 0`;
    if (!Number.isFinite(precio) || precio < 0)
      errores[`linea_${i}_precio`] =
        `El precio de la línea ${i + 1} debe ser un número no negativo`;
    return {
      linea_id: linea.linea_id || generarId('cl'),
      producto_id: linea.producto_id,
      cantidad,
      precio_unitario: precio,
      descuento_pct: Number(linea.descuento_pct) || 0
    };
  });
  return { errores, lineas: out };
}

export function registrarCotizacion(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('gestionar_cotizaciones', usuario);
  const solicitud = obtenerSolicitud(datos.solicitud_id);
  if (!solicitud) throw new Error('La solicitud no existe');
  if (!['aprobada', 'en_cotizacion'].includes(solicitud.estado)) {
    throw new Error(
      'Solo se pueden registrar cotizaciones para solicitudes aprobadas o en cotización'
    );
  }
  const proveedor = obtenerProveedor(datos.proveedor_id);
  if (!proveedor) throw new Error('El proveedor no existe');
  if (proveedor.estado_proveedor !== 'aprobado')
    throw new Error('Solo se puede cotizar con proveedores aprobados');
  const duplicada = leer('cotizaciones').find(
    (c) => c.solicitud_id === datos.solicitud_id && c.proveedor_id === datos.proveedor_id
  );
  if (duplicada) throw new Error('Ya existe una cotización de este proveedor para la solicitud');
  if (!datos.fecha_validez) throw new Error('La fecha de validez es obligatoria');
  const lineasBase =
    datos.lineas && datos.lineas.length > 0
      ? datos.lineas
      : solicitud.lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_estimado,
          descuento_pct: 0
        }));
  const { errores, lineas } = validarLineas(lineasBase, solicitud);
  if (Object.keys(errores).length > 0) throw new Error(Object.values(errores)[0]);
  const totales = calcularTotales(lineas);
  const anio = Number(String(datos.fecha_registro || hoyISO()).slice(0, 4));
  const ahora = hoyISO();
  const cotizacion = {
    id: generarId('cot'),
    numero: generarNumero(
      'COT',
      anio,
      siguienteSecuencia(
        leer('cotizaciones').map((c) => c.numero),
        'COT',
        anio
      )
    ),
    solicitud_id: datos.solicitud_id,
    proveedor_id: datos.proveedor_id,
    estado: 'recibida',
    plazo_entrega_dias: Number(datos.plazo_entrega_dias) || 0,
    condicion_pago_dias:
      Number(datos.condicion_pago_dias) || Number(proveedor.condicion_pago_dias) || 0,
    fecha_validez: datos.fecha_validez,
    fecha_registro: datos.fecha_registro || ahora,
    moneda: datos.moneda || 'CLP',
    lineas,
    ...totales,
    createdAt: new Date().toISOString()
  };
  const lista = leer('cotizaciones');
  lista.push(cotizacion);
  guardar('cotizaciones', lista);
  if (solicitud.estado === 'aprobada') {
    moverSolicitud(solicitud.id, 'en_cotizacion', { fecha_inicio_cotizacion: ahora }, usuario);
  }
  return cotizacion;
}

export function marcarVencidas(hoy = hoyISO()) {
  const lista = leer('cotizaciones');
  let cambios = 0;
  for (const c of lista) {
    if (c.estado === 'recibida' && c.fecha_validez && c.fecha_validez < hoy) {
      c.estado = 'vencida';
      c.updatedAt = new Date().toISOString();
      cambios += 1;
    }
  }
  if (cambios > 0) guardar('cotizaciones', lista);
  return cambios;
}

export function descartarCotizacion(id, motivo, usuario = getUsuarioActivo()) {
  exigirPermiso('gestionar_cotizaciones', usuario);
  if (!String(motivo ?? '').trim()) throw new Error('El descarte exige un motivo');
  const lista = leer('cotizaciones');
  const idx = lista.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Cotización no encontrada');
  const cotizacion = lista[idx];
  if (!puedeTransicionar('cotizacion', cotizacion.estado, 'descartada')) {
    throw new Error(`No se puede descartar una cotización en estado "${cotizacion.estado}"`);
  }
  lista[idx] = {
    ...cotizacion,
    estado: 'descartada',
    motivo_descarte: String(motivo).trim(),
    updatedAt: new Date().toISOString()
  };
  guardar('cotizaciones', lista);
  return lista[idx];
}

export function seleccionarCotizacion(
  id,
  usuario = getUsuarioActivo(),
  { justificacion_proveedor_unico = '' } = {}
) {
  exigirPermiso('gestionar_cotizaciones', usuario);
  marcarVencidas();
  const lista = leer('cotizaciones');
  const idx = lista.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Cotización no encontrada');
  const cotizacion = lista[idx];
  if (cotizacion.estado !== 'recibida') {
    throw new Error(
      `Solo se puede seleccionar una cotización recibida (estado actual: ${cotizacion.estado})`
    );
  }
  const solicitud = obtenerSolicitud(cotizacion.solicitud_id);
  if (!solicitud) throw new Error('La solicitud de la cotización no existe');
  const yaSeleccionada = lista.find(
    (c) => c.solicitud_id === solicitud.id && c.estado === 'seleccionada' && c.id !== id
  );
  if (yaSeleccionada) throw new Error('Ya existe una cotización seleccionada para esta solicitud');
  const vigentes = lista.filter((c) => c.solicitud_id === solicitud.id && c.estado === 'recibida');
  if (
    Number(solicitud.monto_estimado) >= UMBRAL_COTIZACIONES &&
    vigentes.length < 3 &&
    !String(justificacion_proveedor_unico).trim()
  ) {
    throw new Error(
      'Para montos iguales o superiores al umbral se requieren al menos 3 cotizaciones o una justificación de proveedor único'
    );
  }
  const ahora = new Date().toISOString();
  for (const c of lista) {
    if (c.solicitud_id !== solicitud.id || c.id === id) continue;
    if (c.estado === 'recibida') {
      c.estado = 'descartada';
      c.motivo_descarte = 'Otra cotización fue seleccionada';
      c.updatedAt = ahora;
    }
  }
  lista[idx] = {
    ...cotizacion,
    estado: 'seleccionada',
    motivo_seleccion:
      String(justificacion_proveedor_unico).trim() || 'Mejor evaluación de la comparativa',
    seleccionada_por: usuario.id,
    fecha_seleccion: ahora,
    updatedAt: ahora
  };
  guardar('cotizaciones', lista);
  moverSolicitud(
    solicitud.id,
    'en_cotizacion',
    {
      cotizacion_seleccionada_id: id,
      justificacion_proveedor_unico: String(justificacion_proveedor_unico).trim()
    },
    usuario
  );
  return lista[idx];
}

export function compararCotizaciones(solicitudId) {
  marcarVencidas();
  return listarCotizaciones({ solicitud_id: solicitudId }).map((c) => {
    const proveedor = obtenerProveedor(c.proveedor_id);
    return {
      ...c,
      proveedor,
      evaluacion_promedio: promedioProveedor(c.proveedor_id)
    };
  });
}

export function cotizacionesSeleccionables(solicitudId) {
  return listarCotizaciones({ solicitud_id: solicitudId }).filter((c) => c.estado === 'recibida');
}
