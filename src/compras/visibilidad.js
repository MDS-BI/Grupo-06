export const VISIBILIDAD = Object.freeze({
  solicitudes: Object.freeze({
    solicitante: 'opera',
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'opera'
  }),
  cotizaciones: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  }),
  ordenes: Object.freeze({
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: 'lectura',
    admin_ti: 'lectura'
  }),
  recepciones: Object.freeze({
    solicitante: 'lectura',
    comprador: 'lectura',
    jefe_compras: 'lectura',
    bodega: 'opera',
    admin_ti: 'lectura'
  }),
  facturas: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  }),
  devoluciones: Object.freeze({
    solicitante: null,
    comprador: 'lectura',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'lectura'
  }),
  proveedores: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  }),
  catalogo: Object.freeze({
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  }),
  evaluaciones: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  }),
  trazabilidad: Object.freeze({
    solicitante: null,
    comprador: null,
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  })
});

export const GRUPOS = Object.freeze({
  Panel: Object.freeze(['panel']),
  Adquisiciones: Object.freeze(['proveedores', 'catalogo', 'evaluaciones']),
  Compras: Object.freeze([
    'solicitudes',
    'cotizaciones',
    'ordenes',
    'recepciones',
    'facturas',
    'devoluciones'
  ])
});

export function nivelVista(vista, usuario) {
  if (vista === 'panel') return 'opera';
  const fila = VISIBILIDAD[vista];
  if (!fila) return null;
  return fila[usuario?.rol] ?? null;
}

export function vistasVisibles(usuario) {
  const operativas = Object.keys(VISIBILIDAD).filter((vista) => nivelVista(vista, usuario));
  return ['panel', ...operativas];
}

// ---------------------------------------------------------------------------
// Enmascaramiento y visibilidad de datos sensibles (spec FR-004, FR-025, FR-033)
// ---------------------------------------------------------------------------

export function puedeVerRutEmpleado(rol, contexto = 'listado', esPropio = false) {
  if (esPropio) return true;
  if (rol === 'admin_ti') return true;
  if (rol === 'jefe_compras' && contexto === 'auditoria') return 'parcial';
  return false;
}

export function enmascararRut(rut, rol, contexto = 'listado', esPropio = false) {
  const valor = String(rut ?? '');
  const permiso = puedeVerRutEmpleado(rol, contexto, esPropio);
  if (permiso === true) return valor;
  if (permiso === 'parcial') {
    const match = /^(\d{2})\.?([\d]{3})\.?([\d]{3})-([\dkK])$/.exec(valor);
    if (!match) return 'XX.XXX.XXX-K';
    return `${match[1]}.XXX.XXX-${match[4].toUpperCase()}`;
  }
  return '••••••••-•';
}

export function puedeVerRutProveedor(rol, contexto = 'general') {
  if (rol === 'solicitante') return false;
  if (rol === 'bodega') return contexto === 'recepcion' || contexto === 'guia_despacho';
  return ['comprador', 'jefe_compras', 'admin_ti'].includes(rol);
}

export function puedeVerDatosBancarios(rol) {
  return rol === 'jefe_compras' || rol === 'admin_ti';
}

/** Representación uniforme de un dato de identidad que el rol no puede ver. */
export const RUT_OCULTO = '••••••••-•';

/** Texto mostrado cuando el rol no tiene acceso a la cuenta bancaria. */
export const CUENTA_NO_DISPONIBLE = 'No disponible';

/** Formatea un RUT para presentación sin depender de reglas de negocio. */
export function formatearRutVisible(rut) {
  const limpio = String(rut ?? '')
    .replace(/[.\s]/g, '')
    .toUpperCase();
  const partes = /^(\d+)-([0-9K])$/.exec(limpio) || /^(\d{5,8})([0-9K])$/.exec(limpio);
  if (!partes) return limpio;
  const cuerpo = partes[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${partes[2]}`;
}

/** RUT tributario de proveedor según el canal donde se muestra. */
export function enmascararRutProveedor(rut, rol, contexto = 'general') {
  const valor = String(rut ?? '').trim();
  if (!valor) return '';
  if (!puedeVerRutProveedor(rol, contexto)) return RUT_OCULTO;
  return formatearRutVisible(valor);
}

/** Cuenta bancaria: completa, con sufijo enmascarado u oculta según el rol. */
export function enmascararCuentaPorRol(cuenta, rol) {
  const limpio = String(cuenta ?? '').replace(/\s/g, '');
  if (!limpio) return '';
  if (puedeVerDatosBancarios(rol)) return limpio;
  if (rol !== 'comprador') return '';
  if (limpio.length <= 2) return '*'.repeat(limpio.length);
  if (limpio.length <= 4) return `${'*'.repeat(limpio.length - 2)}${limpio.slice(-2)}`;
  return `****${limpio.slice(-4)}`;
}

/** RUT personal de un empleado frente a la sesión activa. */
export function rutEmpleadoVisible(empleado, usuarioSesion, contexto = 'listado') {
  if (!empleado) return '';
  const idSesion = usuarioSesion?.id || usuarioSesion?.usuario_id || '';
  const esPropio = Boolean(
    idSesion && (empleado.id === idSesion || empleado.usuario_id === idSesion)
  );
  const rut = empleado.rut ?? empleado.rut_empleado ?? '';
  if (!rut) return esPropio ? '' : RUT_OCULTO;
  return enmascararRut(rut, usuarioSesion?.rol, contexto, esPropio);
}

/** RUT con puntos y guion, o con guion sin puntos, dentro de texto libre. */
const RUT_EN_TEXTO = /\b(?:\d{1,3}(?:\.\d{3}){2}-\d|\d{7,8}-[0-9K])\b/gi;

/**
 * Enmascara todo RUT presente en texto libre. Los RUT declarados como empleados
 * usan la matriz de `enmascararRut`; el resto se trata como RUT tributario y
 * usa `enmascararRutProveedor`, de modo que un rol sin permiso nunca recibe el
 * valor completo aunque el RUT esté escrito con puntos y guion.
 */
export function sanitizarRutsEnTexto(
  texto,
  {
    rutsEmpleado = [],
    rolEmpleado = 'jefe_compras',
    contextoEmpleado = 'auditoria',
    rolProveedor = 'solicitante'
  } = {}
) {
  const empleados = new Set(
    (rutsEmpleado || [])
      .filter(Boolean)
      .map((rut) => String(rut).replace(/[.\s-]/g, '').toUpperCase())
  );
  return String(texto ?? '').replace(RUT_EN_TEXTO, (original) => {
    const normalizado = original.replace(/[.\s-]/g, '').toUpperCase();
    if (empleados.has(normalizado)) {
      return enmascararRut(original, rolEmpleado, contextoEmpleado);
    }
    return enmascararRutProveedor(original, rolProveedor, 'general');
  });
}

/** Enmascara RUT de empleados, RUT tributario y cuentas en texto libre según el rol. */
export function enmascararDatosEnTexto(texto, rol, rutsEmpleado = []) {
  const conRuts = sanitizarRutsEnTexto(texto, {
    rutsEmpleado,
    rolEmpleado: rol,
    contextoEmpleado: 'auditoria',
    rolProveedor: rol
  });
  return conRuts.replace(/\b\d{6,}\b/g, (coincidencia) =>
    enmascararCuentaPorRol(coincidencia, rol) || '****'
  );
}
