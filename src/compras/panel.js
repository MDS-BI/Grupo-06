import { getUsuarioActivo, puede } from './almacenamiento.js';
import { DIAS_ALERTA_VENCIMIENTO, DIAS_SEGUIMIENTO_OC, diasEntre, hoyISO } from './reglas.js';
import { listarSolicitudes, puedeVerSolicitud } from './solicitudes.js';
import { listarOrdenes, recepcionesDeOrden } from './ordenes-compra.js';
import { alertasVencimiento, facturasPorConciliar, facturasAprobadasParaPago } from './facturas.js';

function mesDe(fecha) {
  return String(fecha ?? '').slice(0, 7);
}

function itemSolicitud(s) {
  return {
    id: s.id,
    etiqueta: `${s.numero} · ${s.justificacion}`,
    estado: s.estado,
    monto: s.monto_estimado
  };
}

function itemOrden(o) {
  return {
    id: o.id,
    etiqueta: `${o.numero} · ${o.proveedor_id}`,
    estado: o.estado,
    monto: o.total
  };
}

function itemFactura(f) {
  return {
    id: f.id,
    etiqueta: `${f.tipo_documento} ${f.folio} · ${f.proveedor_id}`,
    estado: f.estado,
    monto: f.total,
    dias_restantes: f.dias_restantes
  };
}

export function construirPanel(usuario = getUsuarioActivo(), hoy = hoyISO()) {
  const rol = usuario?.rol || 'solicitante';
  const pendientes = [];
  const solicitudes = listarSolicitudes(usuario).filter((s) => puedeVerSolicitud(s, usuario));
  const ordenes = listarOrdenes();
  const alertas = alertasVencimiento(hoy, DIAS_ALERTA_VENCIMIENTO);
  const porConciliar = facturasPorConciliar();

  if (['jefe_compras', 'admin_ti'].includes(rol)) {
    const porAprobar = solicitudes.filter(
      (s) => s.estado === 'enviada' && s.solicitante_id !== usuario.id
    );
    if (porAprobar.length > 0) {
      pendientes.push({
        clave: 'solicitudes_por_aprobar',
        titulo: 'Solicitudes por aprobar',
        detalle: 'Solicitudes enviadas pendientes de decisión',
        cantidad: porAprobar.length,
        items: porAprobar.map(itemSolicitud),
        vista: 'solicitudes'
      });
    }
  }

  if (['comprador', 'jefe_compras', 'admin_ti'].includes(rol)) {
    const sinRecepcion = ordenes.filter(
      (o) => o.estado === 'emitida' && recepcionesDeOrden(o.id).length === 0
    );
    if (sinRecepcion.length > 0) {
      pendientes.push({
        clave: 'oc_sin_recepcion',
        titulo: 'Órdenes sin recepción',
        detalle: 'OC emitidas que aún no registran recepción',
        cantidad: sinRecepcion.length,
        items: sinRecepcion.map(itemOrden),
        vista: 'recepciones'
      });
    }
  }

  if (['bodega', 'admin_ti'].includes(rol)) {
    const porRecepcionar = ordenes.filter((o) =>
      ['emitida', 'recibida_parcial'].includes(o.estado)
    );
    if (porRecepcionar.length > 0) {
      pendientes.push({
        clave: 'recepciones_por_registrar',
        titulo: 'Recepciones por registrar',
        detalle: 'OC pendientes de recepción total o parcial',
        cantidad: porRecepcionar.length,
        items: porRecepcionar.map(itemOrden),
        vista: 'recepciones'
      });
    }
  }

  if (['comprador', 'jefe_compras', 'admin_ti'].includes(rol)) {
    if (porConciliar.length > 0) {
      pendientes.push({
        clave: 'facturas_por_conciliar',
        titulo: 'Facturas por conciliar',
        detalle: 'Facturas registradas o con discrepancia pendientes de revisión',
        cantidad: porConciliar.length,
        items: porConciliar.map(itemFactura),
        vista: 'facturas'
      });
    }
  }

  if (rol === 'solicitante') {
    const propias = solicitudes.filter(
      (s) => s.estado !== 'adjudicada' && s.estado !== 'anulada' && s.estado !== 'rechazada'
    );
    if (propias.length > 0) {
      pendientes.push({
        clave: 'mis_solicitudes',
        titulo: 'Mis solicitudes en curso',
        detalle: 'Solicitudes propias que siguen activas',
        cantidad: propias.length,
        items: propias.map(itemSolicitud),
        vista: 'solicitudes'
      });
    }
  }

  const seguimiento = ['bodega', 'comprador', 'admin_ti'].includes(rol)
    ? ordenes
        .filter((o) => o.estado === 'emitida' && recepcionesDeOrden(o.id).length === 0)
        .map((o) => ({ ...o, dias_esperando: diasEntre(o.fecha_emision, hoy) }))
        .filter((o) => o.dias_esperando > DIAS_SEGUIMIENTO_OC)
    : [];

  const mes = mesDe(hoy);
  const ordenesMes = ordenes.filter(
    (o) => o.estado !== 'anulada' && mesDe(o.fecha_emision) === mes
  );
  const aprobadasMes = facturasAprobadasParaPago().filter((f) => mesDe(f.fecha_aprobacion) === mes);
  const indicadores = {
    mes,
    monto_comprometido: ordenesMes.reduce((sum, o) => sum + Number(o.total || 0), 0),
    ordenes_abiertas: ordenes.filter((o) => ['emitida', 'recibida_parcial'].includes(o.estado))
      .length,
    facturas_aprobadas_pago: aprobadasMes.length,
    monto_aprobado_pago: aprobadasMes.reduce((sum, f) => sum + Number(f.total || 0), 0)
  };

  const acciones = [];
  if (puede('crear_solicitud', usuario))
    acciones.push({
      clave: 'crear_solicitud',
      etiqueta: 'Nueva solicitud',
      vista: 'solicitudes',
      nuevo: true
    });
  if (puede('emitir_oc', usuario))
    acciones.push({ clave: 'emitir_oc', etiqueta: 'Emitir OC', vista: 'ordenes', nuevo: true });
  if (puede('registrar_recepcion', usuario))
    acciones.push({
      clave: 'registrar_recepcion',
      etiqueta: 'Registrar recepción',
      vista: 'recepciones',
      nuevo: true
    });
  if (puede('registrar_factura', usuario))
    acciones.push({
      clave: 'registrar_factura',
      etiqueta: 'Registrar factura',
      vista: 'facturas',
      nuevo: true
    });
  if (puede('aprobar_pago', usuario))
    acciones.push({ clave: 'aprobar_pago', etiqueta: 'Facturas por aprobar', vista: 'facturas' });
  if (puede('gestionar_proveedores', usuario))
    acciones.push({ clave: 'proveedores', etiqueta: 'Proveedores', vista: 'proveedores' });

  return {
    rol,
    usuario,
    hoy,
    pendientes,
    alertas: alertas.map((f) => ({ ...f, dias_restantes: f.dias_restantes })),
    seguimiento,
    indicadores,
    acciones,
    vacio: pendientes.length === 0 && alertas.length === 0 && seguimiento.length === 0
  };
}

export function contarPendientes(usuario = getUsuarioActivo(), hoy = hoyISO()) {
  return construirPanel(usuario, hoy).pendientes.reduce((sum, p) => sum + p.cantidad, 0);
}
