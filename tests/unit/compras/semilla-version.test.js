import { afterEach, describe, expect, it, vi } from 'vitest';

import semilla from '../../../src/compras/semilla.json';

/** localStorage mínimo para probar el versionado sin jsdom. */
function instalarAlmacenamiento(inicial = {}) {
  const store = new Map(Object.entries(inicial));
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
    }
  };
  return store;
}

afterEach(() => {
  delete globalThis.localStorage;
  vi.resetModules();
});

describe('versión de la semilla en localStorage', () => {
  it('recarga la semilla y descarta usuarios de una versión antigua', async () => {
    const store = instalarAlmacenamiento({
      'erp_compras:meta': JSON.stringify({ semilla_cargada: true }),
      'erp_compras:usuarios': JSON.stringify([
        {
          id: 'u-antiguo-1',
          nombre: 'Ana Pérez',
          rol: 'solicitante',
          rut: '11.111.111-1',
          email: 'ana.perez@pyme.cl',
          activo: true
        }
      ])
    });
    vi.resetModules();
    const almacenamiento = await import('../../../src/compras/almacenamiento.js');

    expect(almacenamiento.semillaCargada()).toBe(false);
    expect(almacenamiento.versionSemillaCargada()).toBe(0);

    const resultado = almacenamiento.asegurarSemilla();

    expect(resultado.cargada).toBe(true);
    expect(resultado.motivo).toBe('version_actualizada');
    const usuarios = almacenamiento.leer('usuarios');
    expect(usuarios).toHaveLength(semilla.usuarios.length);
    expect(usuarios.map((u) => u.nombre).sort()).toEqual(
      semilla.usuarios.map((u) => u.nombre).sort()
    );
    expect(usuarios.some((u) => u.nombre === 'Ana Pérez')).toBe(false);
    expect(almacenamiento.semillaCargada()).toBe(true);
    expect(JSON.parse(store.get('erp_compras:meta')).version).toBe(semilla.version);
  });

  it('considera cargada solo la versión actual de la semilla', async () => {
    instalarAlmacenamiento({
      'erp_compras:meta': JSON.stringify({ semilla_cargada: true, version: semilla.version - 1 })
    });
    vi.resetModules();
    const almacenamiento = await import('../../../src/compras/almacenamiento.js');

    expect(almacenamiento.semillaCargada()).toBe(false);

    almacenamiento.marcarSemillaCargada(true);

    expect(almacenamiento.semillaCargada()).toBe(true);
    expect(almacenamiento.versionSemillaCargada()).toBe(semilla.version);
  });
});
