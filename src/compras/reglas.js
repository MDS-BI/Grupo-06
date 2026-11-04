import { COMPRAS_PARAMETROS } from '../module-config.js';

export const IVA = COMPRAS_PARAMETROS.iva;
export const UMBRAL_COTIZACIONES = COMPRAS_PARAMETROS.umbralCotizaciones;
export const TOLERANCIA_CONCILIACION = COMPRAS_PARAMETROS.toleranciaConciliacion;
export const DIAS_ALERTA_VENCIMIENTO = 5;
export const DIAS_SEGUIMIENTO_OC = 7;
export const DIAS_CUENTA_RECIENTE = 30;
export const DIAS_CATALOGO_DESACTUALIZADO = 90;

export const ROLES = ['solicitante', 'comprador', 'jefe_compras', 'bodega', 'admin_ti'];

export const TRANSICIONES = Object.freeze({
  solicitud: {
    borrador: ['enviada', 'anulada'],
    enviada: ['aprobada', 'rechazada', 'anulada'],
    aprobada: ['en_cotizacion', 'adjudicada', 'anulada'],
    en_cotizacion: ['adjudicada', 'aprobada', 'anulada'],
    rechazada: [],
    adjudicada: ['en_cotizacion', 'aprobada'],
    anulada: []
  },
  cotizacion: {
    recibida: ['seleccionada', 'descartada', 'vencida'],
    vencida: ['descartada'],
    seleccionada: [],
    descartada: []
  },
  orden: {
    emitida: ['recibida_parcial', 'recibida_total', 'anulada'],
    recibida_parcial: ['recibida_total'],
    recibida_total: ['cerrada'],
    cerrada: [],
    anulada: []
  },
  factura: {
    registrada: ['conciliada', 'con_discrepancia', 'rechazada'],
    con_discrepancia: ['conciliada', 'rechazada'],
    conciliada: ['aprobada_pago', 'rechazada'],
    aprobada_pago: [],
    rechazada: []
  },
  devolucion: {
    pendiente_aprobacion: ['aprobada', 'rechazada'],
    aprobada: [],
    rechazada: []
  }
});

export function redondearCLP(valor) {
  return Math.round(Number(valor) || 0);
}

export function calcularLinea(linea = {}) {
  const cantidad = Math.max(0, Number(linea.cantidad) || 0);
  const precio = Math.max(0, Number(linea.precio_unitario ?? linea.precio_estimado) || 0);
  const descuentoPct = Math.min(100, Math.max(0, Number(linea.descuento_pct) || 0));
  const bruto = cantidad * precio;
  const descuento = redondearCLP((bruto * descuentoPct) / 100);
  const neto = redondearCLP(bruto - descuento);
  return {
    cantidad,
    precio_unitario: precio,
    descuento_pct: descuentoPct,
    subtotal: redondearCLP(bruto),
    descuento,
    neto
  };
}

export function calcularTotales(lineas = [], tasaIVA = IVA) {
  let subtotal = 0;
  let descuento = 0;
  let neto = 0;
  for (const linea of lineas) {
    const calc = calcularLinea(linea);
    subtotal += calc.subtotal;
    descuento += calc.descuento;
    neto += calc.neto;
  }
  const netoFinal = redondearCLP(neto);
  const iva = redondearCLP(netoFinal * tasaIVA);
  return {
    subtotal: redondearCLP(subtotal),
    descuento: redondearCLP(descuento),
    neto: netoFinal,
    iva,
    total: netoFinal + iva
  };
}

export function normalizarRut(rut) {
  return String(rut ?? '')
    .replace(/[.\s]/g, '')
    .toUpperCase();
}

export function validarRut(rut) {
  const limpio = normalizarRut(rut);
  if (!/^\d{6,9}-?[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.includes('-') ? limpio.split('-')[0] : limpio.slice(0, -1);
  const dv = limpio.includes('-') ? limpio.split('-')[1] : limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

export function formatearRut(rut) {
  const limpio = normalizarRut(rut);
  if (!validarRut(limpio)) return String(rut ?? '');
  const partes = limpio.includes('-') ? limpio.split('-') : [limpio.slice(0, -1), limpio.slice(-1)];
  const cuerpo = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${partes[1]}`;
}

export function enmascararRut(rut, rol) {
  if (rol === 'admin_ti') return formatearRut(rut);
  const limpio = normalizarRut(rut);
  if (!validarRut(limpio)) return '***';
  const partes = limpio.includes('-') ? limpio.split('-') : [limpio.slice(0, -1), limpio.slice(-1)];
  const cuerpo = partes[0];
  return `${cuerpo.slice(0, 2)}.***.***-${partes[1]}`;
}

export function enmascararCuenta(cuenta, rol) {
  if (rol === 'admin_ti') return String(cuenta ?? '');
  const limpio = String(cuenta ?? '').replace(/\s/g, '');
  if (!limpio) return '';
  return `****${limpio.slice(-4)}`;
}

export function validarCondicionPago(dias, acuerdoPlazoMayor) {
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 0)
    return {
      valid: false,
      error: 'La condición de pago debe ser un número entero de días mayor o igual a 0'
    };
  if (n > 30 && !String(acuerdoPlazoMayor ?? '').trim()) {
    return {
      valid: false,
      error:
        'Una condición de pago mayor a 30 días exige registrar el acuerdo de plazo mayor (Ley 21.131)'
    };
  }
  return { valid: true };
}

export function puedeTransicionar(tipo, desde, hacia) {
  const mapa = TRANSICIONES[tipo];
  if (!mapa) return false;
  if (desde === hacia) return true;
  return (mapa[desde] || []).includes(hacia);
}

export function hoyISO(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDias(fechaISO, dias) {
  if (!fechaISO) return '';
  const [y, m, d] = String(fechaISO).slice(0, 10).split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + Number(dias || 0));
  return fecha.toISOString().slice(0, 10);
}

export function diasEntre(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  const a = Date.UTC(
    ...String(desdeISO)
      .slice(0, 10)
      .split('-')
      .map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))
  );
  const b = Date.UTC(
    ...String(hastaISO)
      .slice(0, 10)
      .split('-')
      .map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))
  );
  return Math.round((b - a) / 86400000);
}

export function diasHasta(fechaISO, hoy = hoyISO()) {
  return diasEntre(hoy, fechaISO);
}

export function calcularVencimiento(fechaRecepcionISO, diasCondicionPago) {
  return sumarDias(fechaRecepcionISO || hoyISO(), Number(diasCondicionPago) || 0);
}

export function notaPlazo(diasAtraso) {
  const n = Number(diasAtraso) || 0;
  if (n <= 0) return 5;
  if (n <= 3) return 4;
  if (n <= 7) return 3;
  if (n <= 14) return 2;
  return 1;
}

export function conciliarFactura({
  netoFactura,
  valorRecibido,
  facturasPreviasNeto = 0,
  notasCreditoNeto = 0,
  devolucionesNeto = 0,
  tolerancia = TOLERANCIA_CONCILIACION
}) {
  const neto = redondearCLP(netoFactura);
  const pendiente = redondearCLP(
    Number(valorRecibido) -
      Number(facturasPreviasNeto) -
      Number(notasCreditoNeto) -
      Number(devolucionesNeto)
  );
  const diferencia = redondearCLP(neto - pendiente);
  const toleranciaMonto = redondearCLP(Math.abs(neto) * Number(tolerancia));
  const estado = Math.abs(diferencia) <= toleranciaMonto ? 'conciliada' : 'con_discrepancia';
  return { neto, pendiente, diferencia, toleranciaMonto, estado };
}

export function generarNumero(prefijo, anio, secuencia) {
  return `${prefijo}-${anio}-${String(secuencia).padStart(4, '0')}`;
}

export function siguienteSecuencia(numeros, prefijo, anio) {
  const patron = new RegExp(`^${prefijo}-${anio}-(\\d{4})$`);
  let max = 0;
  for (const numero of numeros) {
    const m = patron.exec(String(numero ?? ''));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function redondearPromedio(valores) {
  const lista = valores.map(Number).filter(Number.isFinite);
  if (lista.length === 0) return 0;
  return Math.round((lista.reduce((a, b) => a + b, 0) / lista.length) * 10) / 10;
}
