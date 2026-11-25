import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLAVE_CONSENTIMIENTO,
  aceptarTodas,
  guardarConsentimiento,
  leerConsentimiento,
  soloEsenciales
} from '../../../src/compras/cookies.js';

describe('consentimiento de cookies', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (clave) => (store.has(clave) ? store.get(clave) : null),
      setItem: (clave, valor) => store.set(clave, valor),
      removeItem: (clave) => store.delete(clave),
      clear: () => store.clear()
    });
  });

  it('aceptar todas guarda preferencias UI y analítica', () => {
    aceptarTodas();
    const estado = leerConsentimiento();
    expect(estado.esenciales).toBe(true);
    expect(estado.preferenciasUI).toBe(true);
    expect(estado.analiticaInterna).toBe(true);
    expect(estado.aceptadoTodas).toBe(true);
  });

  it('solo esenciales guarda el resto desactivado', () => {
    soloEsenciales();
    const estado = leerConsentimiento();
    expect(estado.esenciales).toBe(true);
    expect(estado.preferenciasUI).toBe(false);
    expect(estado.analiticaInterna).toBe(false);
    expect(estado.soloEsenciales).toBe(true);
  });

  it('la personalización respeta las opciones elegidas', () => {
    guardarConsentimiento({ preferenciasUI: true, analiticaInterna: false });
    const estado = leerConsentimiento();
    expect(estado.esenciales).toBe(true);
    expect(estado.preferenciasUI).toBe(true);
    expect(estado.analiticaInterna).toBe(false);
    expect(sessionStorage.getItem(CLAVE_CONSENTIMIENTO)).toContain('preferenciasUI');
  });

  it('devuelve null cuando no hay consentimiento', () => {
    expect(leerConsentimiento()).toBeNull();
  });
});
