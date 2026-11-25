/**
 * Catálogos bancarios chilenos y reglas de normalización usadas por el
 * formulario de Datos Bancarios. Los nombres son los que se muestran al usuario
 * y los que se persisten en el dataset semilla.
 */

export const BANCO_ESTADO = 'BancoEstado';
export const TIPO_CUENTA_RUT = 'CuentaRUT (BancoEstado)';
export const AYUDA_CUENTA_RUT =
  'Auto-completado desde el RUT del proveedor sin dígito verificador';

/** Bancos e instituciones de pago operantes en Chile, en orden de selección. */
export const BANCOS_CHILE = Object.freeze([
  'BancoEstado',
  'Banco de Chile',
  'Banco Santander Chile',
  'Banco BCI',
  'Scotiabank Chile',
  'Banco Itaú Chile',
  'Banco BICE',
  'Banco Security',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Consorcio',
  'Coopeuch / Tenpo / Mercado Pago (Prepago)'
]);

/** Tipos de cuenta reales en Chile, en orden de selección. */
export const TIPOS_CUENTA = Object.freeze([
  'Cuenta Corriente',
  'Cuenta Vista / Chequera Electrónica',
  TIPO_CUENTA_RUT,
  'Cuenta de Ahorro',
  'Cuenta Prepago'
]);

const ALIAS_BANCOS = Object.freeze({
  'banco estado': BANCO_ESTADO,
  estadobanco: BANCO_ESTADO,
  'banco de chile': 'Banco de Chile',
  'banco santander': 'Banco Santander Chile',
  santander: 'Banco Santander Chile',
  'banco bci': 'Banco BCI',
  bci: 'Banco BCI',
  scotiabank: 'Scotiabank Chile',
  'banco Itaú Chile': 'Banco Itaú Chile',
  'banco itau': 'Banco Itaú Chile',
  'banco bice': 'Banco BICE',
  bice: 'Banco BICE',
  'banco security': 'Banco Security',
  security: 'Banco Security',
  'banco falabella': 'Banco Falabella',
  falabella: 'Banco Falabella',
  'banco ripley': 'Banco Ripley',
  ripley: 'Banco Ripley',
  'banco consorcio': 'Banco Consorcio',
  consorcio: 'Banco Consorcio',
  coopeuch: 'Coopeuch / Tenpo / Mercado Pago (Prepago)',
  tenpo: 'Coopeuch / Tenpo / Mercado Pago (Prepago)',
  'mercado pago': 'Coopeuch / Tenpo / Mercado Pago (Prepago)'
});

const ALIAS_TIPOS_CUENTA = Object.freeze({
  corriente: 'Cuenta Corriente',
  'cuenta corriente': 'Cuenta Corriente',
  vista: 'Cuenta Vista / Chequera Electrónica',
  'chequera electrónica': 'Cuenta Vista / Chequera Electrónica',
  'cuenta vista / chequera electronica': 'Cuenta Vista / Chequera Electrónica',
  'cuenta de ahorro': 'Cuenta de Ahorro',
  ahorro: 'Cuenta de Ahorro',
  'cuenta prepago': 'Cuenta Prepago',
  prepago: 'Cuenta Prepago',
  'cuentarut': TIPO_CUENTA_RUT,
  'cuenta rut': TIPO_CUENTA_RUT
});

function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es');
}

/** Devuelve el nombre canónico del banco, conservando alias históricos. */
export function normalizarBanco(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return ALIAS_BANCOS[normalizarTexto(texto)] || texto;
}

/** Devuelve el nombre canónico del tipo de cuenta, conservando alias históricos. */
export function normalizarTipoCuenta(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return ALIAS_TIPOS_CUENTA[normalizarTexto(texto)] || texto;
}

export function esBancoValido(valor) {
  const banco = normalizarBanco(valor);
  return Boolean(banco) && BANCOS_CHILE.includes(banco);
}

export function esTipoCuentaValido(valor) {
  const tipo = normalizarTipoCuenta(valor);
  return Boolean(tipo) && TIPOS_CUENTA.includes(tipo);
}

export function esCuentaRut(valor) {
  return normalizarTipoCuenta(valor) === TIPO_CUENTA_RUT;
}

/**
 * Devuelve el cuerpo numérico del RUT sin puntos ni dígito verificador.
 * Ejemplo: `76.543.210-3` → `76543210`.
 */
export function cuerpoRutSinDigito(rut) {
  const limpio = String(rut ?? '')
    .replace(/[.\s-]/g, '')
    .toUpperCase();
  const cuerpo = /^\d{6,9}[0-9K]$/.test(limpio) ? limpio.slice(0, -1) : limpio;
  return /^\d+$/.test(cuerpo) ? cuerpo : '';
}

/** Datos que debe aplicar la regla de auto-relleno de CuentaRUT. */
export function datosCuentaRut(proveedor) {
  return {
    banco: BANCO_ESTADO,
    tipo_cuenta: TIPO_CUENTA_RUT,
    numero_cuenta: cuerpoRutSinDigito(proveedor?.taxId ?? proveedor?.rut)
  };
}
