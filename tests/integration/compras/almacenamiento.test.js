import { afterEach, describe, expect, it } from 'vitest';
import { guardar, leer } from '../../../src/compras/almacenamiento.js';

describe('almacenamiento de compras', () => {
  const original = globalThis.localStorage;

  afterEach(() => {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  });

  it('usa memoria cuando localStorage no está disponible', () => {
    delete globalThis.localStorage;
    guardar('productos', [{ id: 'prod-memoria' }]);
    expect(leer('productos')).toEqual([{ id: 'prod-memoria' }]);
  });

  it('entrega un error claro cuando localStorage está lleno', () => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {}
    };
    expect(() => guardar('productos', [])).toThrow(/No se pudo guardar en el almacenamiento local/);
  });
});
