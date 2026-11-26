import semilla from '../../../src/compras/semilla.json';
import {
  cargarSemilla,
  marcarAutenticacion,
  setSesion
} from '../../../src/compras/almacenamiento.js';

/** Identidad tomada de `semilla.json`: los tests no declaran usuarios propios. */
export function usuarioSemilla(id) {
  const usuario = (semilla.usuarios || []).find((u) => u.id === id);
  if (!usuario) throw new Error(`El usuario semilla ${id} no existe en semilla.json`);
  return Object.freeze({ ...usuario });
}

/** Identidad mínima que consumen las reglas de negocio en los tests. */
function identidad(id) {
  const { id: idUsuario, nombre, rol } = usuarioSemilla(id);
  return Object.freeze({ id: idUsuario, nombre, rol });
}

export const USUARIOS = Object.freeze({
  solicitante: identidad('u-solicitante-1'),
  solicitante2: identidad('u-solicitante-2'),
  comprador: identidad('u-comprador-1'),
  jefe: identidad('u-jefe-1'),
  jefe2: identidad('u-jefe-2'),
  bodega: identidad('u-bodega-1'),
  bodega2: identidad('u-bodega-2'),
  admin: identidad('u-admin-1')
});

export function iniciarSesionPorRol(rol, nombre) {
  const candidatos = Object.values(USUARIOS).filter((usuario) => usuario.rol === rol);
  const usuario = (nombre && candidatos.find((c) => c.nombre === nombre)) ||
    candidatos[0] || { id: `u-${rol}`, rol };
  setSesion({ usuario_id: usuario.id, rol });
  marcarAutenticacion(true);
  return usuario;
}

export function cerrarSesionPrueba() {
  marcarAutenticacion(false);
}

export function instalarAlmacenamiento() {
  const store = new Map();
  globalThis.localStorage = {
    getItem(clave) {
      return store.has(clave) ? store.get(clave) : null;
    },
    setItem(clave, valor) {
      store.set(clave, String(valor));
    },
    removeItem(clave) {
      store.delete(clave);
    },
    clear() {
      store.clear();
    },
    key(indice) {
      return [...store.keys()][indice] ?? null;
    },
    get length() {
      return store.size;
    }
  };
  return store;
}

export function cargarDatos(hoy = '2026-11-03') {
  instalarAlmacenamiento();
  return cargarSemilla({ forzar: true, hoy });
}
