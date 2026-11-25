import {
  cargarSemilla,
  marcarAutenticacion,
  setSesion
} from '../../../src/compras/almacenamiento.js';

export const USUARIOS = Object.freeze({
  solicitante: { id: 'u-solicitante-1', nombre: 'Ana Pérez', rol: 'solicitante' },
  solicitante2: { id: 'u-solicitante-2', nombre: 'Diego Muñoz Vera', rol: 'solicitante' },
  comprador: { id: 'u-comprador-1', nombre: 'Carla Díaz', rol: 'comprador' },
  jefe: { id: 'u-jefe-1', nombre: 'Andrés Contreras Pérez', rol: 'jefe_compras' },
  jefe2: { id: 'u-jefe-2', nombre: 'Jorge Muñoz', rol: 'jefe_compras' },
  bodega: { id: 'u-bodega-1', nombre: 'Pedro Gil', rol: 'bodega' },
  admin: { id: 'u-admin-1', nombre: 'Admin TI', rol: 'admin_ti' }
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
