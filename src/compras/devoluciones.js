import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import { generarNumero, siguienteSecuencia, hoyISO, calcularLinea } from './reglas.js';
import { obtenerOrden, valorRecibidoNeto, lineasPendientes } from './ordenes-compra.js';

export function listarDevoluciones({ orden_id, estado } = {}) {
  return leer('devoluciones')
    .filter((d) => !orden_id || d.orden_id === orden_id)
    .filter((d) => !estado || d.estado === estado)
    .sort((a, b) => String(b.fecha_devolucion).localeCompare(String(a.fecha_devolucion)));
}

export function obtenerDevolucion(id) {
  return leer('devoluciones').find((d) => d.id === id);
}

export function devolucionesAprobadasNeto(ordenId) {
  return leer('devoluciones')
    .filter((d) => d.orden_id === ordenId && d.estado === 'aprobada')
    .reduce((sum, d) => sum + Number(d.neto || 0), 0);
}

export function saldoPendienteNeto(ordenId) {
  const orden = obtenerOrden(ordenId);
  if (!orden) return 0;
  const valorRecibido = valorRecibidoNeto(orden);
  const facturado = leer('facturas')
    .filter(
      (f) => f.orden_id === ordenId && f.tipo_documento === 'factura' && f.estado !== 'rechazada'
    )
    .reduce((sum, f) => sum + Number(f.neto || 0), 0);
  const notasCredito = leer('facturas')
    .filter(
      (f) =>
        f.orden_id === ordenId && f.tipo_documento === 'nota_credito' && f.estado !== 'rechazada'
    )
    .reduce((sum, f) => sum + Number(f.neto || 0), 0);
  const devoluciones = devolucionesAprobadasNeto(ordenId);
  return Math.round(valorRecibido - facturado - notasCredito - devoluciones);
}

function devueltoPorLinea(ordenId, ordenLineaId, incluirPendientes = true) {
  return leer('devoluciones')
    .filter((d) => d.orden_id === ordenId)
    .filter((d) => incluirPendientes || d.estado === 'aprobada')
    .filter((d) => d.estado !== 'rechazada')
    .flatMap((d) => d.lineas || [])
    .filter((l) => l.orden_linea_id === ordenLineaId)
    .reduce((sum, l) => sum + Number(l.cantidad || 0), 0);
}

function registrarRecepcionDe(ordenId) {
  return leer('recepciones')
    .filter((r) => r.orden_id === ordenId)
    .map((r) => r.registrada_por);
}

function cerrarSiSaldada(ordenId) {
  const saldo = saldoPendienteNeto(ordenId);
  const lista = leer('ordenes');
  const idx = lista.findIndex((o) => o.id === ordenId);
  if (
    idx !== -1 &&
    saldo <= 0 &&
    lista[idx].estado !== 'cerrada' &&
    lista[idx].estado !== 'anulada'
  ) {
    lista[idx] = {
      ...lista[idx],
      estado: 'cerrada',
      fecha_cierre: hoyISO(),
      updatedAt: new Date().toISOString()
    };
    guardar('ordenes', lista);
  }
  if (saldo <= 0) {
    const facturas = leer('facturas');
    let cambios = false;
    for (const f of facturas) {
      if (f.orden_id === ordenId && f.tipo_documento === 'factura' && !f.saldada) {
        f.saldada = true;
        f.updatedAt = new Date().toISOString();
        cambios = true;
      }
    }
    if (cambios) guardar('facturas', facturas);
  }
  return saldo;
}

export function registrarDevolucion(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('registrar_devolucion', usuario);
  const orden = obtenerOrden(datos.orden_id);
  if (!orden) throw new Error('La orden de compra no existe');
  if (!['recibida_parcial', 'recibida_total', 'cerrada'].includes(orden.estado)) {
    throw new Error('Solo se pueden registrar devoluciones sobre una OC recibida');
  }
  const pendientes = lineasPendientes(orden);
  const porLinea = new Map((datos.lineas || []).map((l) => [l.orden_linea_id, l]));
  const lineas = [];
  for (const pendiente of pendientes) {
    const entrada = porLinea.get(pendiente.linea_id);
    if (!entrada) continue;
    const cantidad = Number(entrada.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      throw new Error('La cantidad devuelta debe ser mayor a 0');
    const yaDevuelta = devueltoPorLinea(orden.id, pendiente.linea_id);
    const disponible = pendiente.cantidad_aceptada - yaDevuelta;
    if (cantidad > disponible)
      throw new Error(
        `No puedes devolver más de lo aceptado para el producto ${pendiente.producto_id}`
      );
    const motivo = String(entrada.motivo ?? '').trim();
    if (!motivo) throw new Error('La devolución exige un motivo por línea');
    const calculo = calcularLinea({
      cantidad,
      precio_unitario: pendiente.precio_unitario,
      descuento_pct: pendiente.descuento_pct
    });
    lineas.push({
      detalle_id: generarId('dl'),
      orden_linea_id: pendiente.linea_id,
      producto_id: pendiente.producto_id,
      cantidad,
      motivo,
      precio_unitario: pendiente.precio_unitario,
      neto: calculo.neto
    });
  }
  if (lineas.length === 0) throw new Error('Debes registrar al menos una línea para devolver');
  const receptores = registrarRecepcionDe(orden.id);
  const requiereAprobacion = receptores.includes(usuario.id);
  let estado = 'aprobada';
  let aprobadaPor = usuario.id;
  let fechaAprobacion = hoyISO();
  if (requiereAprobacion) {
    const aprobadorId = datos.aprobador_id;
    if (!aprobadorId) {
      estado = 'pendiente_aprobacion';
      aprobadaPor = null;
      fechaAprobacion = null;
    } else {
      const aprobador = leer('usuarios').find((u) => u.id === aprobadorId);
      if (
        !aprobador ||
        !['jefe_compras', 'admin_ti'].includes(aprobador.rol) ||
        aprobador.id === usuario.id
      ) {
        throw new Error('La devolución debe aprobarla un jefe de compras o admin_ti distinto');
      }
      aprobadaPor = aprobador.id;
    }
  }
  const ahora = hoyISO();
  const anio = Number(ahora.slice(0, 4));
  const devolucion = {
    id: generarId('dev'),
    numero: generarNumero(
      'DEV',
      anio,
      siguienteSecuencia(
        leer('devoluciones').map((d) => d.numero),
        'DEV',
        anio
      )
    ),
    orden_id: orden.id,
    estado,
    fecha_devolucion: datos.fecha_devolucion || ahora,
    registrada_por: usuario.id,
    aprobada_por: aprobadaPor,
    fecha_aprobacion: fechaAprobacion,
    observaciones: String(datos.observaciones ?? '').trim(),
    lineas,
    neto: lineas.reduce((sum, l) => sum + l.neto, 0),
    createdAt: new Date().toISOString()
  };
  const lista = leer('devoluciones');
  lista.push(devolucion);
  guardar('devoluciones', lista);
  if (estado === 'aprobada') cerrarSiSaldada(orden.id);
  return devolucion;
}

export function aprobarDevolucion(id, usuario = getUsuarioActivo()) {
  exigirPermiso('aprobar_devolucion', usuario);
  const lista = leer('devoluciones');
  const idx = lista.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Devolución no encontrada');
  const devolucion = lista[idx];
  if (devolucion.estado !== 'pendiente_aprobacion')
    throw new Error('La devolución no está pendiente de aprobación');
  if (devolucion.registrada_por === usuario.id)
    throw new Error('Quien registró la devolución no puede aprobarla');
  if (registrarRecepcionDe(devolucion.orden_id).includes(usuario.id)) {
    throw new Error(
      'La devolución debe aprobarla un jefe de compras o admin_ti que no haya recepcionado'
    );
  }
  lista[idx] = {
    ...devolucion,
    estado: 'aprobada',
    aprobada_por: usuario.id,
    fecha_aprobacion: hoyISO(),
    updatedAt: new Date().toISOString()
  };
  guardar('devoluciones', lista);
  cerrarSiSaldada(devolucion.orden_id);
  return lista[idx];
}

export function rechazarDevolucion(id, motivo, usuario = getUsuarioActivo()) {
  exigirPermiso('aprobar_devolucion', usuario);
  if (!String(motivo ?? '').trim()) throw new Error('El rechazo exige un motivo');
  const lista = leer('devoluciones');
  const idx = lista.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Devolución no encontrada');
  if (lista[idx].estado !== 'pendiente_aprobacion')
    throw new Error('La devolución no está pendiente de aprobación');
  lista[idx] = {
    ...lista[idx],
    estado: 'rechazada',
    motivo_rechazo: String(motivo).trim(),
    updatedAt: new Date().toISOString()
  };
  guardar('devoluciones', lista);
  return lista[idx];
}

export { cerrarSiSaldada };
