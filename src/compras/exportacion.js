import { getUsuarioActivo } from './almacenamiento.js';
import { listarSolicitudes } from './solicitudes.js';
import { listarProveedores } from './proveedores.js';
import { listarOrdenes } from './ordenes-compra.js';
import { listarRecepciones } from './recepciones.js';
import { listarFacturas } from './facturas.js';

const SEPARADOR = ';';

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
  { key: 'taxId', header: 'RUT' },
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
  { key: 'orden_id', header: 'Orden' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha_recepcion', header: 'Fecha recepción' },
  { key: 'registrada_por', header: 'Registrada por' }
];

const COLUMNAS_FACTURAS = [
  { key: 'tipo_documento', header: 'Tipo' },
  { key: 'folio', header: 'Folio' },
  { key: 'orden_id', header: 'Orden' },
  { key: 'proveedor_id', header: 'Proveedor' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha_vencimiento', header: 'Vencimiento' },
  { key: 'neto', header: 'Neto' },
  { key: 'iva', header: 'IVA' },
  { key: 'total', header: 'Total' }
];

export function exportarProveedores({ filas, filtro = '', descargar = true } = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = (filas || listarProveedores()).filter(
    (p) =>
      !q ||
      [p.name, p.code, p.taxId].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
  );
  return exportarListado('proveedores', lista, COLUMNAS_PROVEEDORES, { descargar });
}

export function exportarSolicitudes(
  usuario = getUsuarioActivo(),
  { filtro = '', descargar = true } = {}
) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = listarSolicitudes(usuario).filter(
    (s) =>
      !q ||
      [s.numero, s.estado, s.justificacion].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
  );
  return exportarListado('solicitudes', lista, COLUMNAS_SOLICITUDES, { descargar });
}

export function exportarOrdenes({ filas, filtro = '', descargar = true } = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = (filas || listarOrdenes()).filter(
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

export function exportarRecepciones({ filas, filtro = '', descargar = true } = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = (filas || listarRecepciones()).filter(
    (r) =>
      !q ||
      [r.numero, r.orden_id, r.estado].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
  );
  return exportarListado('recepciones', lista, COLUMNAS_RECEPCIONES, { descargar });
}

export function exportarFacturas({ filas, filtro = '', descargar = true } = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const lista = (filas || listarFacturas()).filter(
    (f) =>
      !q ||
      [f.folio, f.tipo_documento, f.estado, f.proveedor_id].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
  );
  return exportarListado('facturas', lista, COLUMNAS_FACTURAS, { descargar });
}

export {
  COLUMNAS_PROVEEDORES,
  COLUMNAS_SOLICITUDES,
  COLUMNAS_ORDENES,
  COLUMNAS_RECEPCIONES,
  COLUMNAS_FACTURAS
};
