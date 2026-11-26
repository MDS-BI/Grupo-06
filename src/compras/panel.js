import { getUsuarioActivo, puede } from './almacenamiento.js';
import {
  DIAS_ALERTA_VENCIMIENTO,
  DIAS_SEGUIMIENTO_OC,
  diasEntre,
  hoyISO,
  sumarDias
} from './reglas.js';
import { listarSolicitudes, puedeVerSolicitud } from './solicitudes.js';
import { listarOrdenes, recepcionesDeOrden } from './ordenes-compra.js';
import { listarRecepciones } from './recepciones.js';
import { listarFacturas, alertasVencimiento } from './facturas.js';
import { listarCotizaciones } from './cotizaciones.js';
import { listarDevoluciones } from './devoluciones.js';
import { listarEventos } from './trazabilidad.js';
import { listarProveedores, cuentaCambiadaRecientemente } from './proveedores.js';

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
    etiqueta: `Folio ${f.folio} · ${f.proveedor_id}`,
    estado: f.estado,
    monto: f.total,
    dias_restantes: f.dias_restantes
  };
}

function tasaRechazo() {
  const recepciones = listarRecepciones();
  const suma = (campo) =>
    recepciones.reduce(
      (total, r) =>
        total + (r.lineas || []).reduce((n, l) => n + Number(l[campo] || 0), 0),
      0
    );
  const total = suma('cantidad_aceptada') + suma('cantidad_rechazada');
  return total === 0 ? 0 : suma('cantidad_rechazada') / total;
}

export function construirPanel(usuario = getUsuarioActivo(), hoy = hoyISO()) {
  const rol = usuario?.rol || 'solicitante';
  const pendientes = [];
  const solicitudes = listarSolicitudes(usuario).filter((s) => puedeVerSolicitud(s, usuario));
  const ordenes = listarOrdenes({ usuario });
  const recepciones = listarRecepciones({ usuario });
  const facturas = listarFacturas();
  const discrepantes = listarFacturas({
    estado: 'con_discrepancia',
    tipo_documento: 'factura'
  });
  const alertas = ['comprador', 'jefe_compras', 'admin_ti'].includes(rol)
    ? alertasVencimiento(hoy, DIAS_ALERTA_VENCIMIENTO)
    : [];

  if (rol === 'jefe_compras') {
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

  if (['comprador', 'jefe_compras'].includes(rol)) {
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

  if (rol === 'bodega') {
    const esperando = ordenes.filter(
      (o) => o.estado === 'emitida' && recepcionesDeOrden(o.id).length === 0
    );
    if (esperando.length > 0) {
      pendientes.push({
        clave: 'oc_esperando_entrega',
        titulo: 'OC esperando entrega',
        detalle: 'Órdenes emitidas sin recepción registrada',
        cantidad: esperando.length,
        items: esperando.map(itemOrden),
        vista: 'recepciones'
      });
    }
    const parciales = recepciones.filter((r) => r.estado === 'parcial');
    if (parciales.length > 0) {
      pendientes.push({
        clave: 'recepciones_parciales',
        titulo: 'Recepciones parciales',
        detalle: 'Recepciones con unidades aún pendientes',
        cantidad: parciales.length,
        items: parciales.map((r) => ({
          id: r.id,
          etiqueta: r.numero || r.orden_id,
          estado: r.estado
        })),
        vista: 'recepciones'
      });
    }
  }

  if (rol === 'comprador') {
    const sinCotizar = solicitudes.filter(
      (s) => s.estado === 'aprobada' && listarCotizaciones({ solicitud_id: s.id }).length === 0
    );
    if (sinCotizar.length > 0) {
      pendientes.push({
        clave: 'solicitudes_aprobadas_sin_cotizar',
        titulo: 'Solicitudes aprobadas sin cotizar',
        detalle: 'Solicitudes listas para registrar cotizaciones',
        cantidad: sinCotizar.length,
        items: sinCotizar.map(itemSolicitud),
        vista: 'cotizaciones'
      });
    }
    if (discrepantes.length > 0) {
      pendientes.push({
        clave: 'facturas_con_discrepancia',
        titulo: 'Facturas con discrepancia',
        detalle: 'Facturas con diferencia sobre lo recibido',
        cantidad: discrepantes.length,
        items: discrepantes.map(itemFactura),
        vista: 'facturas'
      });
    }
  }

  if (rol === 'jefe_compras') {
    const porAprobarPago = facturas.filter(
      (f) => f.tipo_documento === 'factura' && f.estado === 'conciliada'
    );
    if (porAprobarPago.length > 0) {
      pendientes.push({
        clave: 'facturas_conciliadas_por_aprobar',
        titulo: 'Facturas conciliadas por aprobar pago',
        detalle: 'Facturas listas para la aprobación de pago',
        cantidad: porAprobarPago.length,
        items: porAprobarPago.map(itemFactura),
        vista: 'facturas'
      });
    }
    const devoluciones = listarDevoluciones({ estado: 'pendiente_aprobacion' });
    if (devoluciones.length > 0) {
      pendientes.push({
        clave: 'devoluciones_pendientes',
        titulo: 'Devoluciones por aprobar',
        detalle: 'Devoluciones que esperan aprobación de jefatura',
        cantidad: devoluciones.length,
        items: devoluciones.map((d) => ({
          id: d.id,
          etiqueta: d.numero || d.orden_id,
          estado: d.estado
        })),
        vista: 'devoluciones'
      });
    }
  }

  if (rol === 'admin_ti') {
    const desde = sumarDias(hoy, -30);
    const cambios = listarEventos({
      entidad: 'proveedor',
      accion: 'cambio_datos_bancarios'
    }).filter((e) => String(e.fecha) >= desde);
    if (cambios.length > 0) {
      pendientes.push({
        clave: 'cambios_bancarios_30_dias',
        titulo: 'Cambios bancarios recientes',
        detalle: 'Proveedores con datos bancarios modificados en los últimos 30 días',
        cantidad: cambios.length,
        items: cambios.map((e) => ({
          id: e.id,
          etiqueta: `${e.entidad_id} · ${e.fecha}`,
          estado: e.accion
        })),
        vista: 'proveedores'
      });
    }
    const fraude = facturas.filter(
      (f) =>
        f.tipo_documento === 'factura' &&
        !['aprobada_pago', 'rechazada', 'anulada'].includes(f.estado) &&
        cuentaCambiadaRecientemente(
          listarProveedores().find((p) => p.id === f.proveedor_id),
          hoy
        )
    );
    if (fraude.length > 0) {
      pendientes.push({
        clave: 'alertas_fraude',
        titulo: 'Alertas de fraude',
        detalle: 'Facturas no aprobadas de proveedores con cuenta cambiada hace menos de 30 días',
        cantidad: fraude.length,
        items: fraude.map(itemFactura),
        vista: 'facturas'
      });
    }
  }

  {
    const propias = solicitudes.filter((s) => s.solicitante_id === usuario.id);
    if (propias.length > 0) {
      pendientes.push({
        clave: 'mis_solicitudes',
        titulo: 'Mis solicitudes',
        detalle: 'Solicitudes creadas por ti y su estado actual',
        cantidad: propias.length,
        items: propias.map(itemSolicitud),
        vista: 'solicitudes'
      });
    }
  }

  const seguimiento = ['bodega', 'comprador'].includes(rol)
    ? ordenes
        .filter((o) => o.estado === 'emitida' && recepcionesDeOrden(o.id).length === 0)
        .map((o) => ({ ...o, dias_esperando: diasEntre(o.fecha_emision, hoy) }))
        .filter((o) => o.dias_esperando > DIAS_SEGUIMIENTO_OC)
    : [];

  const mes = mesDe(hoy);
  const ordenesMes = ordenes.filter(
    (o) => o.estado !== 'anulada' && mesDe(o.fecha_emision) === mes
  );
  const indicadores = { mes };
  indicadores.monto_comprometido = ordenesMes.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  indicadores.ordenes_abiertas = ordenes.filter((o) =>
    ['emitida', 'recibida_parcial'].includes(o.estado)
  ).length;
  const facturasAprobadasPago = facturas.filter(
    (f) => f.estado === 'aprobada_pago'
  );
  indicadores.facturas_aprobadas_pago = facturasAprobadasPago.length;
  indicadores.monto_aprobado_pago = facturasAprobadasPago.reduce(
    (sum, f) => sum + Number(f.total || 0),
    0
  );
  if (rol === 'comprador') {
    const registradas = facturas.filter((f) => f.tipo_documento === 'factura').length;
    indicadores.facturas_con_discrepancia = registradas
      ? discrepantes.length / registradas
      : 0;
  }
  if (rol === 'jefe_compras') {
    indicadores.gasto_del_periodo = ordenesMes.reduce(
      (sum, o) => sum + Number(o.neto || 0),
      0
    );
    indicadores.facturas_en_riesgo = alertas.length;
  }
  if (rol === 'bodega') indicadores.tasa_rechazo = tasaRechazo();

  const acciones = [];
  if (puede('crear_solicitud', usuario))
    acciones.push({
      clave: 'crear_solicitud',
      etiqueta: 'Iniciar nuevo requerimiento',
      descripcion: 'Registra una solicitud de compra para tu área.',
      icono: 'solicitud',
      vista: 'solicitudes',
      nuevo: true
    });
  if (puede('emitir_oc', usuario))
    acciones.push({
      clave: 'emitir_oc',
      etiqueta: 'Generar orden a proveedor',
      descripcion: 'Emite una OC formal desde una solicitud aprobada.',
      icono: 'orden',
      vista: 'ordenes',
      nuevo: true
    });
  if (puede('registrar_recepcion', usuario))
    acciones.push({
      clave: 'registrar_recepcion',
      etiqueta: 'Registrar recepción de mercadería',
      descripcion: 'Ingresa cantidades recibidas y aceptadas en bodega.',
      icono: 'recepcion',
      vista: 'recepciones',
      nuevo: true
    });
  if (puede('registrar_factura', usuario))
    acciones.push({
      clave: 'registrar_factura',
      etiqueta: 'Ingresar factura del proveedor',
      descripcion: 'Registra facturas o notas de crédito para conciliar.',
      icono: 'factura',
      vista: 'facturas',
      nuevo: true
    });
  if (puede('aprobar_pago', usuario))
    acciones.push({
      clave: 'aprobar_pago',
      etiqueta: 'Revisar facturas para pago',
      descripcion: 'Aprueba facturas conciliadas y listas para pago.',
      icono: 'pago',
      vista: 'facturas'
    });
  if (puede('gestionar_proveedores', usuario))
    acciones.push({
      clave: 'proveedores',
      etiqueta: 'Gestionar proveedores',
      descripcion: 'Administra fichas, condiciones y estado de proveedores.',
      icono: 'proveedor',
      vista: 'proveedores'
    });

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
