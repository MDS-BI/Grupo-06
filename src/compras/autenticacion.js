import { normalizarRut, ROLES, requiereNombre, validarRut } from './reglas.js';
import { etiquetaRol } from './vista.js';
import {
  asegurarSemilla,
  estaAutenticado,
  leer,
  limpiarSesion,
  marcarAutenticacion,
  setSesion
} from './almacenamiento.js';

/** Clave única de demostración: no protege datos reales, solo simula el ingreso. */
export const CLAVE_DEMO = 'Compras2026';

/** Devuelve los usuarios semilla disponibles para iniciar sesión. */
export function listarUsuarios() {
  asegurarSemilla();
  return leer('usuarios');
}

function normalizar(texto) {
  return String(texto ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Valida rol, nombre (solo para solicitante y comprador) y clave sin modificar la sesión.
 * Devuelve `campo` para llevar el foco al control que debe corregirse.
 */
export function validarCredenciales(rol, nombre, clave) {
  if (!ROLES.includes(rol)) {
    return { ok: false, campo: 'rol', motivo: 'Selecciona un rol válido.' };
  }
  if (String(clave ?? '') !== CLAVE_DEMO) {
    return {
      ok: false,
      campo: 'clave',
      motivo: 'Clave incorrecta. Usa la clave genérica de demostración.'
    };
  }

  const usuarios = listarUsuarios().filter(usuarioHabilitado);
  if (requiereNombre(rol)) {
    const nombreNormalizado = normalizar(nombre);
    if (!nombreNormalizado) {
      return { ok: false, campo: 'nombre', motivo: 'Ingresa el nombre para continuar.' };
    }
    const usuario = usuarios.find(
      (u) => u.rol === rol && normalizar(u.nombre) === nombreNormalizado
    );
    if (!usuario) {
      return {
        ok: false,
        campo: 'nombre',
        motivo: 'El nombre no corresponde al rol seleccionado o la cuenta está suspendida.'
      };
    }
    return { ok: true, usuario };
  }

  const usuario = usuarios.find((u) => u.rol === rol) || { id: `u-${rol}`, rol };
  return { ok: true, usuario };
}

/** Inicia la sesión de demostración y fija el rol asociado al usuario elegido. */
export function iniciarSesion(rol, nombre, clave) {
  const resultado = validarCredenciales(rol, nombre, clave);
  if (!resultado.ok) return resultado;

  setSesion({ usuario_id: resultado.usuario.id, rol });
  marcarAutenticacion(true);
  return { ok: true, usuario: resultado.usuario };
}

function normalizarCorreo(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es');
}

/** Indica si la cuenta puede iniciar sesión (no está suspendida). */
export function usuarioHabilitado(usuario) {
  return Boolean(usuario && usuario.activo !== false);
}

/** Busca un usuario habilitado por su correo corporativo semilla. */
export function usuarioPorEmail(email) {
  const correo = normalizarCorreo(email);
  if (!correo) return null;
  return (
    listarUsuarios().find((u) => usuarioHabilitado(u) && normalizarCorreo(u.email) === correo) ||
    null
  );
}

/**
 * Resuelve la identidad desde un correo corporativo o desde un RUT chileno
 * válido con Módulo 11. Los usuarios suspendidos quedan fuera del directorio.
 */
export function usuarioPorIdentificador(identificador) {
  const texto = String(identificador ?? '').trim();
  if (!texto) return null;
  const usuarios = listarUsuarios().filter(usuarioHabilitado);
  const porCorreo = usuarios.find((u) => normalizarCorreo(u.email) === normalizarCorreo(texto));
  if (porCorreo) return porCorreo;
  if (!/^\d{6,9}-?[\dkK]$/.test(normalizarRut(texto)) || !validarRut(texto)) return null;
  const objetivo = normalizarRut(texto);
  return usuarios.find((u) => normalizarRut(u.rut) === objetivo) || null;
}

/** Valida correo y clave sin modificar la sesión; `campo` permite enfocar el error. */
export function validarCredencialesEmail(email, clave) {
  if (!normalizarCorreo(email)) {
    return { ok: false, campo: 'email', motivo: 'Ingresa tu correo corporativo para continuar.' };
  }
  if (String(clave ?? '') !== CLAVE_DEMO) {
    return {
      ok: false,
      campo: 'clave',
      motivo: 'Clave incorrecta. Usa la clave de demostración o el acceso rápido.'
    };
  }
  const usuario = usuarioPorEmail(email);
  if (!usuario) {
    return {
      ok: false,
      campo: 'email',
      motivo: 'El correo no corresponde a ningún usuario habilitado en el ERP.'
    };
  }
  return { ok: true, usuario };
}

/** Inicia sesión con correo corporativo y guarda identidad, rol y centro de costo. */
export function iniciarSesionConEmail(email, clave) {
  const resultado = validarCredencialesEmail(email, clave);
  if (!resultado.ok) return resultado;

  const { id, nombre, rol, centro_costo_id } = resultado.usuario;
  setSesion({ usuario_id: id, nombre, rol, centro_costo_id });
  marcarAutenticacion(true);
  return { ok: true, usuario: resultado.usuario };
}

/** Valida correo corporativo o RUT Módulo 11 y clave, sin modificar la sesión. */
export function validarCredencialesIdentificador(identificador, clave) {
  if (!String(identificador ?? '').trim()) {
    return {
      ok: false,
      campo: 'email',
      motivo: 'Ingresa tu correo corporativo o RUT para continuar.'
    };
  }
  if (String(clave ?? '') !== CLAVE_DEMO) {
    return {
      ok: false,
      campo: 'clave',
      motivo: 'Clave incorrecta. Usa la clave de demostración o el acceso rápido.'
    };
  }
  const usuario = usuarioPorIdentificador(identificador);
  if (!usuario) {
    return {
      ok: false,
      campo: 'email',
      motivo: 'El correo o RUT no corresponde a ningún usuario habilitado en el ERP.'
    };
  }
  return { ok: true, usuario };
}

/** Inicia sesión con correo corporativo o RUT válido y fija la identidad del titular. */
export function iniciarSesionConIdentificador(identificador, clave) {
  const resultado = validarCredencialesIdentificador(identificador, clave);
  if (!resultado.ok) return resultado;

  const { id, nombre, rol, centro_costo_id } = resultado.usuario;
  setSesion({ usuario_id: id, nombre, rol, centro_costo_id });
  marcarAutenticacion(true);
  return { ok: true, usuario: resultado.usuario };
}

/** Directorio de acceso rápido construido desde `usuarios` y `centros_costo` de semilla. */
export function listarDirectorioUsuarios() {
  // `listarUsuarios()` asegura la semilla antes de consultar los centros de costo.
  const usuarios = listarUsuarios().filter(usuarioHabilitado);
  const centros = leer('centros_costo');
  return usuarios.map((usuario) => {
    const centro = centros.find((c) => c.id === usuario.centro_costo_id);
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      rol_etiqueta: etiquetaRol(usuario.rol),
      centro_codigo: centro?.codigo || usuario.centro_costo_id || '',
      centro_nombre: centro?.nombre || '',
      centro_etiqueta: centro ? `${centro.codigo} · ${centro.nombre}` : usuario.centro_costo_id || ''
    };
  });
}

/** Cierra la sesión de demostración sin borrar los datos del módulo. */
export function cerrarSesion() {
  limpiarSesion();
  return { ok: true, autenticado: estaAutenticado() };
}
