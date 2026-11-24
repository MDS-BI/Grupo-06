import { ROLES, requiereNombre } from './reglas.js';
import {
  asegurarSemilla,
  estaAutenticado,
  leer,
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

  const usuarios = listarUsuarios();
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
        motivo: 'El nombre no corresponde al rol seleccionado.'
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

/** Cierra la sesión de demostración sin borrar los datos del módulo. */
export function cerrarSesion() {
  marcarAutenticacion(false);
  return { ok: true, autenticado: estaAutenticado() };
}
