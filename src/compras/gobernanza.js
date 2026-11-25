/**
 * Gobernanza local del módulo: modo de datos, parámetros dinámicos,
 * autorizaciones OTP y notificaciones internas.
 *
 * Este archivo no depende de `almacenamiento.js` ni de `reglas.js` para evitar
 * ciclos de importación: usa su propio almacenamiento crudo con el mismo
 * prefijo `erp_compras:` del resto del módulo.
 */

const PREFIJO = 'erp_compras:';
const memoria = new Map();

const MODOS = Object.freeze(['demo', 'real']);
const VIGENCIA_OTP_MS = 5 * 60 * 1000;
const MAX_INTENTOS_OTP = 3;

const PARAMETROS_DEFAULT = Object.freeze({
  umbralCotizaciones: 1000000,
  toleranciaConciliacion: 0.01
});

function almacen() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Lee un dato aislado de gobernanza, con respaldo en memoria para entornos sin localStorage. */
export function leerDato(nombre, porDefecto = null) {
  let raw;
  try {
    const s = almacen();
    raw = s ? s.getItem(`${PREFIJO}${nombre}`) : memoria.get(nombre);
  } catch {
    raw = null;
  }
  if (raw === null || raw === undefined) return porDefecto;
  try {
    return JSON.parse(raw);
  } catch {
    return porDefecto;
  }
}

/** Guarda un dato aislado de gobernanza. */
export function guardarDato(nombre, valor) {
  const texto = JSON.stringify(valor);
  try {
    const s = almacen();
    if (s) s.setItem(`${PREFIJO}${nombre}`, texto);
    else memoria.set(nombre, texto);
  } catch (e) {
    throw new Error(`No se pudo guardar ${nombre}: ${e.message}`);
  }
  return valor;
}

/** Borra un dato aislado de gobernanza. */
export function borrarDato(nombre) {
  try {
    const s = almacen();
    if (s) s.removeItem(`${PREFIJO}${nombre}`);
    else memoria.delete(nombre);
  } catch {
    // El almacenamiento local puede no estar disponible; se ignora.
  }
}

/** Modo de datos vigente. Por defecto el entorno es demostrativo. */
export function obtenerModo() {
  const modo = leerDato('modo_datos', 'demo');
  return MODOS.includes(modo) ? modo : 'demo';
}

/** Persiste el modo de datos y valida que sea uno de los dos admitidos. */
export function guardarModo(modo) {
  if (!MODOS.includes(modo)) throw new Error('El modo debe ser demo o real');
  guardarDato('modo_datos', modo);
  return modo;
}

export function esModoDemo() {
  return obtenerModo() === 'demo';
}

/** Parámetros vigentes: los valores guardados sobrescriben los predeterminados. */
export function obtenerParametros() {
  const guardados = leerDato('parametros', {});
  return {
    ...PARAMETROS_DEFAULT,
    ...(guardados && typeof guardados === 'object' ? guardados : {})
  };
}

export function obtenerUmbralCotizaciones() {
  return Number(obtenerParametros().umbralCotizaciones);
}

export function obtenerToleranciaConciliacion() {
  return Number(obtenerParametros().toleranciaConciliacion);
}

/** Valida los parámetros antes de persistirlos. */
export function validarParametros(cambios = {}) {
  const salida = {};
  if (Object.hasOwn(cambios, 'umbralCotizaciones')) {
    const valor = Number(cambios.umbralCotizaciones);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error('El umbral de cotizaciones debe ser un número positivo');
    }
    salida.umbralCotizaciones = valor;
  }
  if (Object.hasOwn(cambios, 'toleranciaConciliacion')) {
    const valor = Number(cambios.toleranciaConciliacion);
    if (!Number.isFinite(valor) || valor <= 0 || valor > 1) {
      throw new Error('La tolerancia de conciliación debe ser un número mayor a 0 y menor o igual a 1');
    }
    salida.toleranciaConciliacion = valor;
  }
  if (Object.keys(salida).length === 0) throw new Error('No se indicaron parámetros para guardar');
  return salida;
}

/** Aplica cambios de parámetros ya validados y los deja disponibles de inmediato. */
export function guardarParametros(cambios = {}) {
  const validados = validarParametros(cambios);
  const parametros = { ...obtenerParametros(), ...validados };
  guardarDato('parametros', parametros);
  return parametros;
}

function idConPrefijo(prefijo) {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function codigoAleatorio() {
  const max = 1000000;
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const valores = new Uint32Array(1);
    globalThis.crypto.getRandomValues(valores);
    return String(valores[0] % max).padStart(6, '0');
  }
  return String(Math.floor(Math.random() * max)).padStart(6, '0');
}

/**
 * Genera una autorización OTP de seis dígitos y una notificación interna para
 * el titular. `ayudaDemo` solo se devuelve cuando el entorno está en Modo Demo.
 */
export function solicitarOtp({
  usuario_id,
  actor_id = '',
  campos = [],
  contexto = 'edicion_usuario',
  modo = obtenerModo(),
  vigenciaMs = VIGENCIA_OTP_MS,
  ahora = new Date()
} = {}) {
  if (!usuario_id) throw new Error('Falta el titular de la autorización');
  const fecha = ahora instanceof Date ? ahora : new Date(ahora);
  const expiracion = new Date(fecha.getTime() + vigenciaMs);
  const codigo = codigoAleatorio();
  const solicitud = {
    id: idConPrefijo('otp'),
    id_usuario: usuario_id,
    id_solicitante: actor_id,
    contexto,
    campos_solicitados: [...campos],
    intentos: 0,
    validada: false,
    token: '',
    consumida: false,
    fecha_creacion: fecha.toISOString(),
    expira_en: expiracion.toISOString(),
    fecha_validacion: ''
  };
  guardarDato('otp_solicitudes', [...leerDato('otp_solicitudes', []), solicitud]);

  const notificacion = {
    id: idConPrefijo('not'),
    id_solicitud: solicitud.id,
    id_destinatario: usuario_id,
    tipo: 'otp_autorizacion',
    codigo,
    titulo: 'Autorización de cambios en tu cuenta',
    mensaje: `Se solicitó autorización para ${contexto}. Tu código de verificación es ${codigo}.`,
    fecha_creacion: fecha.toISOString(),
    expira_en: expiracion.toISOString(),
    estado: 'pendiente',
    leida: false
  };
  guardarDato('notificaciones', [...leerDato('notificaciones', []), notificacion]);

  return {
    solicitud: { ...solicitud },
    notificacion: { ...notificacion },
    codigo,
    ayudaDemo: modo === 'demo' ? codigo : ''
  };
}

function actualizarSolicitud(id, cambios) {
  const solicitudes = leerDato('otp_solicitudes', []);
  const indice = solicitudes.findIndex((s) => s.id === id);
  if (indice === -1) return null;
  solicitudes[indice] = { ...solicitudes[indice], ...cambios };
  guardarDato('otp_solicitudes', solicitudes);
  return solicitudes[indice];
}

function actualizarNotificacion(idSolicitud, cambios) {
  const notificaciones = leerDato('notificaciones', []);
  const indice = notificaciones.findIndex((n) => n.id_solicitud === idSolicitud);
  if (indice === -1) return;
  notificaciones[indice] = { ...notificaciones[indice], ...cambios };
  guardarDato('notificaciones', notificaciones);
}

/** Valida un código de seis dígitos. El código se consume al ser aceptado. */
export function validarOtp(idSolicitud, codigo, ahora = new Date()) {
  const solicitud = leerDato('otp_solicitudes', []).find((s) => s.id === idSolicitud);
  if (!solicitud) return { ok: false, motivo: 'No existe una solicitud de autorización vigente.' };
  if (solicitud.validada) {
    return { ok: false, motivo: 'El código ya fue utilizado; solicita uno nuevo.' };
  }
  const instante = ahora instanceof Date ? ahora.getTime() : new Date(ahora).getTime();
  if (instante >= new Date(solicitud.expira_en).getTime()) {
    actualizarSolicitud(solicitud.id, { validada: false });
    actualizarNotificacion(solicitud.id, { estado: 'expirada' });
    return { ok: false, motivo: 'El código OTP expiró; solicita uno nuevo.' };
  }
  if (solicitud.intentos >= MAX_INTENTOS_OTP) {
    actualizarNotificacion(solicitud.id, { estado: 'rechazada' });
    return { ok: false, motivo: 'Demasiados intentos fallidos; solicita un nuevo código.' };
  }
  const texto = String(codigo ?? '').trim();
  if (!/^\d{6}$/.test(texto)) {
    return { ok: false, motivo: 'El código OTP debe tener exactamente 6 dígitos.' };
  }
  const notificacion = leerDato('notificaciones', []).find((n) => n.id_solicitud === solicitud.id);
  if (!notificacion || notificacion.codigo !== texto) {
    actualizarSolicitud(solicitud.id, { intentos: solicitud.intentos + 1 });
    return { ok: false, motivo: 'El código OTP es incorrecto.' };
  }
  const token = `tok-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  const actualizada = actualizarSolicitud(solicitud.id, {
    validada: true,
    token,
    fecha_validacion: new Date(instante).toISOString()
  });
  actualizarNotificacion(solicitud.id, { estado: 'aprobada', leida: true });
  return { ok: true, token, solicitud: actualizada };
}

/** Busca un token vigente y no consumido, sin revelar el código OTP. */
export function validarToken(token, ahora = new Date()) {
  if (!token) return null;
  const instante = ahora instanceof Date ? ahora.getTime() : new Date(ahora).getTime();
  return (
    leerDato('otp_solicitudes', []).find(
      (s) =>
        s.token === token &&
        s.validada === true &&
        s.consumida === false &&
        instante < new Date(s.expira_en).getTime()
    ) || null
  );
}

/** Inutiliza el token una vez aplicada la operación autorizada. */
export function consumirToken(token, ahora = new Date()) {
  const solicitud = validarToken(token, ahora);
  if (!solicitud) return false;
  actualizarSolicitud(solicitud.id, { consumida: true });
  return true;
}

/** Notificaciones internas de un titular, ordenadas de más reciente a más antigua. */
export function listarNotificaciones(idDestinatario) {
  return leerDato('notificaciones', [])
    .filter((n) => n.id_destinatario === idDestinatario)
    .sort((a, b) => String(b.fecha_creacion).localeCompare(String(a.fecha_creacion)));
}

export function marcarNotificacionLeida(id) {
  const notificaciones = leerDato('notificaciones', []);
  const indice = notificaciones.findIndex((n) => n.id === id);
  if (indice === -1) return false;
  notificaciones[indice] = { ...notificaciones[indice], leida: true };
  guardarDato('notificaciones', notificaciones);
  return true;
}

export function listarSolicitudesOtp() {
  return [...leerDato('otp_solicitudes', [])];
}

/** Limpia el estado de gobernanza; útil para reinicios controlados y pruebas. */
export function reiniciarGobernanza() {
  for (const nombre of [
    'modo_datos',
    'parametros',
    'otp_solicitudes',
    'notificaciones',
    'auditoria_forense',
    'snapshot_modo_demo',
    'snapshot_modo_real'
  ]) {
    borrarDato(nombre);
  }
}
