/**
 * Administración de usuarios y parámetros con consentimiento del titular (FR-043 a FR-046).
 * Toda operación sensible exige un token OTP vigente y deja evento forense.
 */

import {
  actualizar,
  exigirPermiso,
  generarId,
  getSesion,
  getUsuarioActivo,
  leer,
  limpiarSesion
} from './almacenamiento.js';
import { formatearRut, normalizarRut, ROLES, validarRut } from './reglas.js';
import { formatearRutVisible, rutEmpleadoVisible } from './visibilidad.js';
import { desbloquearProveedor } from './proveedores.js';
import { registrarEventoForense } from './auditoria.js';
import {
  consumirToken,
  guardarParametros,
  obtenerParametros,
  validarToken
} from './gobernanza.js';

const CAMPOS_EDITABLES = Object.freeze([
  'nombre',
  'email',
  'rut',
  'rol',
  'centro_costo_id'
]);

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor) {
  return String(valor ?? '').trim();
}

/** Valor seguro para el log forense: el RUT se muestra según la matriz canónica. */
function valorSeguro(campo, valor) {
  if (campo === 'rut') return rutEmpleadoVisible({ rut: valor }, { rol: 'admin_ti' }, 'auditoria');
  return texto(valor);
}

function resumenCambios(anterior, cambios) {
  return CAMPOS_EDITABLES.concat(['activo', 'umbralCotizaciones', 'toleranciaConciliacion'])
    .filter((campo) => Object.hasOwn(cambios, campo) && texto(anterior[campo]) !== texto(cambios[campo]))
    .map(
      (campo) =>
        `${campo}: ${texto(valorSeguro(campo, anterior[campo])) || '—'} → ${texto(
          valorSeguro(campo, cambios[campo])
        ) || '—'}`
    )
    .join('; ');
}

/** Exige un token emitido para el usuario indicado y para el contexto esperado. */
function exigirAutorizacion(token, idUsuario, contexto, actor) {
  const solicitud = validarToken(token);
  if (!solicitud) throw new Error('La autorización OTP es inválida, expiró o ya fue utilizada');
  if (contexto && solicitud.contexto !== contexto) {
    throw new Error('La autorización OTP corresponde a otra operación');
  }
  if (idUsuario && solicitud.id_usuario !== idUsuario) {
    throw new Error('La autorización OTP corresponde a otro usuario');
  }
  if (!idUsuario && actor && solicitud.id_solicitante !== actor.id) {
    throw new Error('La autorización OTP fue solicitada por otro administrador');
  }
  return solicitud;
}

/** Padrón completo para `admin_ti`, con RUT resuelto por `visibilidad.js`. */
export function listarPadronUsuarios(usuario = getUsuarioActivo()) {
  exigirPermiso('gestionar_usuarios', usuario);
  const centros = leer('centros_costo');
  // En la tabla de Administración TI el RUT se muestra completo, sin enmascarar.
  const verRutCompleto = usuario?.rol === 'admin_ti';
  return leer('usuarios').map((empleado) => {
    const centro = centros.find((c) => c.id === empleado.centro_costo_id);
    return {
      ...empleado,
      activo: empleado.activo !== false,
      rut_visible: verRutCompleto
        ? formatearRutVisible(empleado.rut)
        : rutEmpleadoVisible(empleado, usuario, 'listado'),
      centro_codigo: centro?.codigo || empleado.centro_costo_id || '',
      centro_nombre: centro?.nombre || '',
      estado: empleado.activo === false ? 'Suspendido' : 'Activo'
    };
  });
}

/** Valida nombre, correo, RUT Módulo 11, rol y centro de costo antes de guardar. */
export function validarCambiosUsuario(cambios = {}, idUsuario = '') {
  const salida = {};
  const usuarios = leer('usuarios');

  if (Object.hasOwn(cambios, 'nombre')) {
    const nombre = texto(cambios.nombre);
    if (!nombre) throw new Error('El nombre del usuario es obligatorio');
    salida.nombre = nombre;
  }
  if (Object.hasOwn(cambios, 'email')) {
    const email = texto(cambios.email).toLocaleLowerCase('es');
    if (!CORREO_VALIDO.test(email)) throw new Error('El correo corporativo no tiene un formato válido');
    if (usuarios.some((u) => u.id !== idUsuario && texto(u.email).toLowerCase() === email)) {
      throw new Error('El correo corporativo ya pertenece a otro usuario');
    }
    salida.email = email;
  }
  if (Object.hasOwn(cambios, 'rut')) {
    if (!validarRut(cambios.rut)) throw new Error('El RUT no es válido según Módulo 11');
    const objetivo = normalizarRut(cambios.rut);
    if (usuarios.some((u) => u.id !== idUsuario && normalizarRut(u.rut) === objetivo)) {
      throw new Error('El RUT ya pertenece a otro usuario');
    }
    salida.rut = formatearRut(cambios.rut);
  }
  if (Object.hasOwn(cambios, 'rol')) {
    if (!ROLES.includes(cambios.rol)) throw new Error('Selecciona un rol válido');
    salida.rol = cambios.rol;
  }
  if (Object.hasOwn(cambios, 'centro_costo_id')) {
    const centro = texto(cambios.centro_costo_id);
    if (!leer('centros_costo').some((c) => c.id === centro)) {
      throw new Error('Selecciona un centro de costo válido');
    }
    salida.centro_costo_id = centro;
  }
  if (Object.keys(salida).length === 0) throw new Error('No se indicaron datos para actualizar');
  return salida;
}

/** Aplica cambios personales tras validar el OTP del titular y registra la auditoría. */
export function editarUsuario({ id, cambios = {}, token, actor = getUsuarioActivo() } = {}) {
  exigirPermiso('gestionar_usuarios', actor);
  const solicitud = exigirAutorizacion(token, id, 'edicion_usuario', actor);
  const anterior = leer('usuarios').find((u) => u.id === id);
  if (!anterior) throw new Error('Usuario no encontrado');
  const normalizados = validarCambiosUsuario(cambios, id);
  const detalle = resumenCambios(anterior, normalizados);
  if (!detalle) throw new Error('No se registraron cambios en la ficha del usuario');
  const actualizado = actualizar('usuarios', id, normalizados);
  registrarEventoForense({
    actor: actor?.id || '',
    usuario_afectado: id,
    tipo_evento: 'edicion_usuario',
    campos_modificados: detalle,
    otp_validado: true,
    timestamp: solicitud.fecha_validacion || new Date().toISOString()
  });
  consumirToken(token);
  return actualizado;
}

/** Suspende o reactiva una cuenta. Nunca permite dejar el sistema sin `admin_ti` activo. */
export function cambiarEstadoUsuario({ id, suspendido = true, token, actor = getUsuarioActivo() } = {}) {
  exigirPermiso('suspender_usuario', actor);
  const solicitud = exigirAutorizacion(token, id, 'suspension_usuario', actor);
  const usuarios = leer('usuarios');
  const objetivo = usuarios.find((u) => u.id === id);
  if (!objetivo) throw new Error('Usuario no encontrado');
  if (suspendido && id === actor?.id) throw new Error('No puedes suspender tu propia cuenta');
  if (suspendido && objetivo.rol === 'admin_ti') {
    const activos = usuarios.filter((u) => u.rol === 'admin_ti' && u.activo !== false);
    if (activos.length <= 1) throw new Error('Debe existir al menos un administrador TI activo');
  }
  const anterior = objetivo.activo !== false;
  if (anterior === !suspendido) throw new Error('El usuario ya se encuentra en ese estado');
  const actualizado = actualizar('usuarios', id, { activo: !suspendido });
  registrarEventoForense({
    actor: actor?.id || '',
    usuario_afectado: id,
    tipo_evento: suspendido ? 'suspension' : 'reactivacion',
    campos_modificados: `activo: ${anterior ? 'Activo' : 'Suspendido'} → ${
      suspendido ? 'Suspendido' : 'Activo'
    }`,
    otp_validado: true,
    timestamp: solicitud.fecha_validacion || new Date().toISOString()
  });
  consumirToken(token);
  if (suspendido && getSesion().usuario_id === id) limpiarSesion();
  return actualizado;
}

/** Cambia umbral/tolerancia previa autorización OTP del solicitante del cambio. */
export function cambiarParametros({ cambios = {}, token, actor = getUsuarioActivo() } = {}) {
  exigirPermiso('configurar_parametros', actor);
  const solicitud = exigirAutorizacion(token, '', 'cambio_parametro', actor);
  const anterior = obtenerParametros();
  const posterior = guardarParametros(cambios);
  const detalle = resumenCambios(anterior, posterior);
  if (!detalle) throw new Error('No se registraron cambios en los parámetros');
  registrarEventoForense({
    actor: actor?.id || '',
    usuario_afectado: '',
    tipo_evento: 'cambio_parametro',
    campos_modificados: detalle,
    otp_validado: true,
    timestamp: solicitud.fecha_validacion || new Date().toISOString()
  });
  consumirToken(token);
  return posterior;
}

/** Desbloquea un proveedor (excepción) solo después de una autorización vigente. */
export function desbloquearExcepcion({ id, token, actor = getUsuarioActivo() } = {}) {
  exigirPermiso('desbloquear_excepciones', actor);
  const solicitud = exigirAutorizacion(token, '', 'desbloqueo_excepcion', actor);
  const proveedor = desbloquearProveedor(id, actor);
  registrarEventoForense({
    actor: actor?.id || '',
    usuario_afectado: id,
    tipo_evento: 'desbloqueo_excepcion',
    campos_modificados: `proveedor ${id}: bloqueado → desbloqueado`,
    otp_validado: true,
    timestamp: solicitud.fecha_validacion || new Date().toISOString()
  });
  consumirToken(token);
  return proveedor;
}

/** Indica si una cuenta está suspendida; la usan el portal y el arranque. */
export function usuarioSuspendido(id) {
  if (!id) return false;
  return leer('usuarios').some((u) => u.id === id && u.activo === false);
}

/** Identificador único para nuevas altas administrativas. */
export function nuevoIdUsuario(rol) {
  return generarId(`u-${rol}`);
}
