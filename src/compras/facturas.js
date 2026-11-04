import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import {
  conciliarFactura as conciliarRegla,
  calcularVencimiento,
  diasHasta,
  DIAS_ALERTA_VENCIMIENTO,
  hoyISO
} from './reglas.js';
import { obtenerOrden, valorRecibidoNeto } from './ordenes-compra.js';
import { obtenerProveedor, cuentaCambiadaRecientemente } from './proveedores.js';
import { cerrarSiSaldada } from './devoluciones.js';

const TIPOS = ['factura', 'nota_credito'];

export function listarFacturas({ orden_id, proveedor_id, estado, tipo_documento } = {}) {
  return leer('facturas')
    .filter((f) => !orden_id || f.orden_id === orden_id)
    .filter((f) => !proveedor_id || f.proveedor_id === proveedor_id)
    .filter((f) => !estado || f.estado === estado)
    .filter((f) => !tipo_documento || f.tipo_documento === tipo_documento)
    .sort((a, b) => String(b.fecha_recepcion).localeCompare(String(a.fecha_recepcion)));
}

export function obtenerFactura(id) {
  return leer('facturas').find((f) => f.id === id);
}

function facturaTieneRecepcion(ordenId) {
  return leer('recepciones').some((r) => r.orden_id === ordenId);
}

function notasCreditoDeFactura(facturaId) {
  return leer('facturas').filter(
    (f) =>
      f.tipo_documento === 'nota_credito' &&
      f.factura_referencia_id === facturaId &&
      f.estado !== 'rechazada'
  );
}

export function registrarFactura(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('registrar_factura', usuario);
  const tipo = datos.tipo_documento || 'factura';
  if (!TIPOS.includes(tipo))
    throw new Error('El tipo de documento debe ser factura o nota_credito');
  const orden = obtenerOrden(datos.orden_id);
  if (!orden) throw new Error('La orden de compra no existe');
  if (!facturaTieneRecepcion(orden.id))
    throw new Error('La OC debe tener al menos una recepción registrada');
  const folio = String(datos.folio ?? '').trim();
  if (!folio) throw new Error('El folio es obligatorio');
  const proveedorId = datos.proveedor_id || orden.proveedor_id;
  if (proveedorId !== orden.proveedor_id)
    throw new Error('El proveedor de la factura debe coincidir con el de la OC');
  const duplicada = leer('facturas').find(
    (f) => f.proveedor_id === proveedorId && f.tipo_documento === tipo && String(f.folio) === folio
  );
  if (duplicada) throw new Error('Ya existe un documento con ese folio para el proveedor y tipo');
  const neto = Number(datos.neto);
  if (!Number.isFinite(neto) || neto < 0) throw new Error('El neto debe ser un número no negativo');
  const iva =
    datos.iva === undefined || datos.iva === null || datos.iva === ''
      ? Math.round(neto * 0.19)
      : Number(datos.iva);
  if (!Number.isFinite(iva) || iva < 0) throw new Error('El IVA debe ser un número no negativo');
  const total =
    datos.total === undefined || datos.total === null || datos.total === ''
      ? neto + iva
      : Number(datos.total);
  if (!Number.isFinite(total) || total < 0)
    throw new Error('El total debe ser un número no negativo');
  let referencia = null;
  if (tipo === 'nota_credito') {
    referencia = obtenerFactura(datos.factura_referencia_id);
    if (!referencia) throw new Error('La nota de crédito debe referenciar una factura existente');
    if (referencia.tipo_documento !== 'factura')
      throw new Error('La nota de crédito debe referenciar una factura, no otra nota de crédito');
    if (referencia.proveedor_id !== proveedorId || referencia.orden_id !== orden.id) {
      throw new Error('La factura referenciada debe pertenecer al mismo proveedor y OC');
    }
    const usado = notasCreditoDeFactura(referencia.id).reduce(
      (sum, n) => sum + Number(n.neto || 0),
      0
    );
    if (usado + neto > Number(referencia.neto || 0))
      throw new Error('La nota de crédito no puede superar el monto facturado');
  }
  const fechaRecepcion = datos.fecha_recepcion || hoyISO();
  const factura = {
    id: generarId('fac'),
    tipo_documento: tipo,
    folio,
    orden_id: orden.id,
    proveedor_id: proveedorId,
    estado: tipo === 'nota_credito' ? 'conciliada' : 'registrada',
    fecha_emision: datos.fecha_emision || fechaRecepcion,
    fecha_recepcion: fechaRecepcion,
    fecha_vencimiento: calcularVencimiento(fechaRecepcion, orden.condicion_pago_dias),
    neto,
    iva,
    total,
    registrada_por: usuario.id,
    factura_referencia_id: referencia?.id || null,
    createdAt: new Date().toISOString()
  };
  const lista = leer('facturas');
  lista.push(factura);
  guardar('facturas', lista);
  if (tipo === 'nota_credito') cerrarSiSaldada(orden.id);
  return factura;
}

export function conciliarFactura(id, usuario = getUsuarioActivo()) {
  exigirPermiso('conciliar_factura', usuario);
  const lista = leer('facturas');
  const idx = lista.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('Factura no encontrada');
  const factura = lista[idx];
  if (factura.tipo_documento === 'nota_credito') {
    return factura;
  }
  if (factura.estado === 'rechazada')
    throw new Error('No se puede conciliar una factura rechazada');
  if (factura.estado === 'aprobada_pago') throw new Error('La factura ya fue aprobada para pago');
  const orden = obtenerOrden(factura.orden_id);
  if (!orden) throw new Error('La orden de la factura no existe');
  const valorRecibido = valorRecibidoNeto(orden);
  const facturasPrevias = lista
    .filter(
      (f) =>
        f.id !== factura.id &&
        f.orden_id === factura.orden_id &&
        f.tipo_documento === 'factura' &&
        f.estado !== 'rechazada'
    )
    .reduce((sum, f) => sum + Number(f.neto || 0), 0);
  const notasCredito = lista
    .filter(
      (f) =>
        f.orden_id === factura.orden_id &&
        f.tipo_documento === 'nota_credito' &&
        f.estado !== 'rechazada'
    )
    .reduce((sum, f) => sum + Number(f.neto || 0), 0);
  const devoluciones = leer('devoluciones')
    .filter((d) => d.orden_id === factura.orden_id && d.estado === 'aprobada')
    .reduce((sum, d) => sum + Number(d.neto || 0), 0);
  const resultado = conciliarRegla({
    netoFactura: factura.neto,
    valorRecibido,
    facturasPreviasNeto: facturasPrevias,
    notasCreditoNeto: notasCredito,
    devolucionesNeto: devoluciones
  });
  lista[idx] = {
    ...factura,
    estado: resultado.estado,
    diferencia: resultado.diferencia,
    tolerancia_monto: resultado.toleranciaMonto,
    pendiente_conciliacion: resultado.pendiente,
    fecha_conciliacion: hoyISO(),
    updatedAt: new Date().toISOString()
  };
  guardar('facturas', lista);
  return lista[idx];
}

export function aprobarPago(id, usuario = getUsuarioActivo()) {
  exigirPermiso('aprobar_pago', usuario);
  const lista = leer('facturas');
  const idx = lista.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('Factura no encontrada');
  const factura = lista[idx];
  if (factura.tipo_documento !== 'factura')
    throw new Error('Solo se pueden aprobar facturas para pago');
  if (factura.estado === 'con_discrepancia')
    throw new Error('No se puede aprobar para pago una factura con discrepancia');
  if (factura.estado !== 'conciliada')
    throw new Error('Solo se puede aprobar para pago una factura conciliada');
  const proveedor = obtenerProveedor(factura.proveedor_id);
  const alerta = cuentaCambiadaRecientemente(proveedor);
  lista[idx] = {
    ...factura,
    estado: 'aprobada_pago',
    aprobada_por: usuario.id,
    fecha_aprobacion: hoyISO(),
    alerta_fraude: alerta,
    mensaje_alerta: alerta
      ? 'Posible fraude: la cuenta bancaria del proveedor cambió hace menos de 30 días'
      : '',
    updatedAt: new Date().toISOString()
  };
  guardar('facturas', lista);
  return lista[idx];
}

export function rechazarFactura(id, motivo, usuario = getUsuarioActivo()) {
  exigirPermiso('conciliar_factura', usuario);
  if (!String(motivo ?? '').trim()) throw new Error('El rechazo exige un motivo');
  const lista = leer('facturas');
  const idx = lista.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('Factura no encontrada');
  lista[idx] = {
    ...lista[idx],
    estado: 'rechazada',
    motivo_rechazo: String(motivo).trim(),
    updatedAt: new Date().toISOString()
  };
  guardar('facturas', lista);
  return lista[idx];
}

export function facturasPorConciliar() {
  return listarFacturas().filter(
    (f) => f.tipo_documento === 'factura' && ['registrada', 'con_discrepancia'].includes(f.estado)
  );
}

export function facturasAprobadasParaPago() {
  return listarFacturas({ estado: 'aprobada_pago' });
}

export function alertasVencimiento(hoy = hoyISO(), dias = DIAS_ALERTA_VENCIMIENTO) {
  return listarFacturas()
    .filter((f) => f.tipo_documento === 'factura')
    .filter((f) => !['aprobada_pago', 'rechazada'].includes(f.estado))
    .map((f) => ({ ...f, dias_restantes: diasHasta(f.fecha_vencimiento, hoy) }))
    .filter((f) => f.dias_restantes <= dias)
    .sort((a, b) => a.dias_restantes - b.dias_restantes);
}

export function saldoFacturadoNeto(ordenId) {
  return leer('facturas')
    .filter(
      (f) => f.orden_id === ordenId && f.tipo_documento === 'factura' && f.estado !== 'rechazada'
    )
    .reduce((sum, f) => sum + Number(f.neto || 0), 0);
}

export { notasCreditoDeFactura };
