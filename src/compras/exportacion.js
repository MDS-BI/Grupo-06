import { datosUsuario, exigirPermiso, getUsuarioActivo, leer } from './almacenamiento.js';
import { listarSolicitudes } from './solicitudes.js';
import { listarProveedores, obtenerProveedor, vistaProveedor } from './proveedores.js';
import { listarOrdenes } from './ordenes-compra.js';
import { listarRecepciones, vistaRecepcion } from './recepciones.js';
import { listarFacturas } from './facturas.js';
import { listarEventos } from './trazabilidad.js';
import { enmascararDatosEnTexto, puedeVerRutProveedor } from './visibilidad.js';

const SEPARADOR = ';';

function filtrarSolicitudesPropias(usuario) {
  return listarSolicitudes(usuario).filter((s) => s.solicitante_id === usuario?.id);
}

function filtrarOrdenesPorSolicitante(lista, usuario) {
  if (usuario?.rol !== 'solicitante') return lista;
  const ids = new Set(filtrarSolicitudesPropias(usuario).map((s) => s.id));
  return lista.filter((o) => ids.has(o.solicitud_id));
}

function filtrarRecepcionesPorSolicitante(lista, usuario) {
  if (usuario?.rol !== 'solicitante') return lista;
  const ids = new Set(filtrarSolicitudesPropias(usuario).map((s) => s.id));
  const ordenIds = new Set(
    listarOrdenes()
      .filter((o) => ids.has(o.solicitud_id))
      .map((o) => o.id)
  );
  return lista.filter((r) => ordenIds.has(r.orden_id));
}

function filtrarSolicitudesPorRol(lista, usuario) {
  if (['solicitante', 'bodega'].includes(usuario?.rol)) {
    const propias = new Set(filtrarSolicitudesPropias(usuario).map((s) => s.id));
    return lista.filter((s) => propias.has(s.id));
  }
  return lista;
}

export function escaparCSV(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto) && !/^-?\d+(\.\d+)?$/.test(texto)) texto = `'${texto}`;
  if (new RegExp(`["${SEPARADOR}\\n\\r,]`).test(texto)) {
    return `"${texto.replaceAll('"', '""')}"`;
  }
  return texto;
}

export function generarCSV(columnas, filas) {
  const cabecera = columnas.map((c) => escaparCSV(c.header ?? c)).join(SEPARADOR);
  const lineas = filas.map((fila) =>
    columnas
      .map((c) => {
        const clave = c.key ?? c;
        const valor = typeof c.valor === 'function' ? c.valor(fila) : fila[clave];
        return escaparCSV(valor);
      })
      .join(SEPARADOR)
  );
  return `\uFEFF${[cabecera, ...lineas].join('\r\n')}\r\n`;
}

export function descargarCSV(nombre, contenido) {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    !URL.createObjectURL
  ) {
    return contenido;
  }
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
  return contenido;
}

export function exportarListado(nombre, filas, columnas, { descargar = true } = {}) {
  const contenido = generarCSV(columnas, filas || []);
  if (descargar) descargarCSV(nombre, contenido);
  return contenido;
}

const COLUMNAS_PROVEEDORES = [
  { key: 'code', header: 'Código' },
  { key: 'name', header: 'Razón social' },
  { key: 'rut_visible', header: 'RUT' },
  { key: 'cuenta_visible', header: 'Cuenta' },
  { key: 'tipo_persona', header: 'Tipo de persona' },
  { key: 'giro', header: 'Giro' },
  { key: 'region', header: 'Región' },
  { key: 'estado_proveedor', header: 'Estado' },
  { key: 'condicion_pago_dias', header: 'Condición de pago (días)' }
];

const COLUMNAS_SOLICITUDES = [
  { key: 'numero', header: 'Número' },
  { key: 'estado', header: 'Estado' },
  { key: 'solicitante_id', header: 'Solicitante' },
  { key: 'solicitante_rut', header: 'RUT solicitante' },
  { key: 'centro_costo_id', header: 'Centro de costo' },
  { key: 'fecha_requerida', header: 'Fecha requerida' },
  { key: 'monto_estimado', header: 'Monto estimado' }
];

const COLUMNAS_ORDENES = [
  { key: 'numero', header: 'Número' },
  { key: 'estado', header: 'Estado' },
  { key: 'proveedor_id', header: 'Proveedor' },
  { key: 'fecha_emision', header: 'Fecha emisión' },
  { key: 'condicion_pago_dias', header: 'Condición de pago (días)' },
  { key: 'neto', header: 'Neto' },
  { key: 'iva', header: 'IVA' },
  { key: 'total', header: 'Total' }
];

const COLUMNAS_RECEPCIONES = [
  { key: 'numero', header: 'Número' },
  { key: 'orden_numero', header: 'Orden' },
  { key: 'proveedor_rut', header: 'RUT proveedor' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha_recepcion', header: 'Fecha recepción' },
  { key: 'registrada_por', header: 'Registrada por' },
  { key: 'registrada_por_rut', header: 'RUT registradora' }
];

const COLUMNAS_FACTURAS = [
  { key: 'tipo_documento', header: 'Tipo' },
  { key: 'folio', header: 'Folio' },
  { key: 'orden_id', header: 'Orden' },
  { key: 'proveedor_id', header: 'Proveedor' },
  { key: 'proveedor_rut', header: 'RUT proveedor' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha_vencimiento', header: 'Vencimiento' },
  { key: 'neto', header: 'Neto' },
  { key: 'iva', header: 'IVA' },
  { key: 'total', header: 'Total' },
  { key: 'credito_a_favor', header: 'Crédito a favor' }
];

const COLUMNAS_TRAZABILIDAD = [
  { key: 'fecha_hora', header: 'Fecha y hora' },
  { key: 'entidad', header: 'Entidad' },
  { key: 'entidad_id', header: 'Documento' },
  { key: 'accion', header: 'Acción' },
  { key: 'estado_anterior', header: 'Estado anterior' },
  { key: 'estado_nuevo', header: 'Estado nuevo' },
  { key: 'usuario_id', header: 'Usuario' },
  {
    header: 'RUT usuario',
    valor: (evento) => datosUsuario(evento.usuario_id, evento._usuario, 'auditoria').rut_visible
  },
  {
    header: 'Detalle',
    valor: (evento) =>
      enmascararDatosEnTexto(
        evento.detalle,
        evento._usuario?.rol,
        leer('usuarios').map((u) => u.rut)
      )
  }
];

export function exportarProveedores({
  filas,
  filtro = '',
  descargar = true,
  usuario = getUsuarioActivo()
} = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const camposBusqueda = (p) => [
    p.name,
    p.code,
    ...(puedeVerRutProveedor(usuario?.rol) ? [p.taxId] : [])
  ];
  const lista = (filas || listarProveedores())
    .filter(
      (p) =>
        !q ||
        camposBusqueda(p).some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
    )
    .map((p) => vistaProveedor(p, usuario.rol));
  return exportarListado('proveedores', lista, COLUMNAS_PROVEEDORES, { descargar });
}

export function exportarSolicitudes(
  usuario = getUsuarioActivo(),
  { filtro = '', descargar = true } = {}
) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = filtrarSolicitudesPorRol(listarSolicitudes(usuario), usuario)
    .filter(
      (s) =>
        !q ||
        [s.numero, s.estado, s.justificacion].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
    )
    .map((s) => ({
      ...s,
      solicitante_rut: datosUsuario(s.solicitante_id, usuario).rut_visible
    }));
  return exportarListado('solicitudes', lista, COLUMNAS_SOLICITUDES, { descargar });
}

export function exportarOrdenes({
  filas,
  filtro = '',
  descargar = true,
  usuario = getUsuarioActivo()
} = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = filtrarOrdenesPorSolicitante(filas || listarOrdenes(), usuario).filter(
    (o) =>
      !q ||
      [o.numero, o.estado, o.proveedor_id].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
  );
  return exportarListado('ordenes-compra', lista, COLUMNAS_ORDENES, { descargar });
}

export function exportarRecepciones({
  filas,
  filtro = '',
  descargar = true,
  usuario = getUsuarioActivo()
} = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = filtrarRecepcionesPorSolicitante(filas || listarRecepciones(), usuario)
    .filter(
      (r) =>
        !q ||
        [r.numero, r.orden_id, r.estado].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
    )
    .map((r) => vistaRecepcion(r, usuario));
  return exportarListado('recepciones', lista, COLUMNAS_RECEPCIONES, { descargar });
}

export function exportarFacturas({
  filas,
  filtro = '',
  descargar = true,
  usuario = getUsuarioActivo()
} = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = (filas || listarFacturas())
    .filter(
      (f) =>
        !q ||
        [f.folio, f.tipo_documento, f.estado, f.proveedor_id].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
    )
    .map((f) => {
      const proveedor = obtenerProveedor(f.proveedor_id);
      return { ...f, proveedor_rut: proveedor ? vistaProveedor(proveedor, usuario?.rol).rut_visible : '' };
    });
  return exportarListado('facturas', lista, COLUMNAS_FACTURAS, { descargar });
}

export function exportarTrazabilidad({
  entidad,
  entidad_id,
  filtro = '',
  descargar = true,
  usuario = getUsuarioActivo()
} = {}) {
  exigirPermiso('exportar_trazabilidad', usuario);
  const q = String(filtro ?? '').toLowerCase();
  const lista = listarEventos({ entidad, entidad_id })
    .filter(
      (e) =>
        !q ||
        [e.fecha_hora, e.entidad, e.entidad_id, e.accion, e.usuario_id, e.detalle].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
    )
    .map((e) => ({ ...e, _usuario: usuario }));
  return exportarListado('trazabilidad', lista, COLUMNAS_TRAZABILIDAD, { descargar });
}

export {
  COLUMNAS_PROVEEDORES,
  COLUMNAS_SOLICITUDES,
  COLUMNAS_ORDENES,
  COLUMNAS_RECEPCIONES,
  COLUMNAS_FACTURAS,
  COLUMNAS_TRAZABILIDAD
};
