import { describe, expect, it } from 'vitest';
import { COMPRAS_CONFIG, COMPRAS_PARAMETROS, normalizeConfig } from '../../../src/module-config.js';

describe('configuración de compras', () => {
  it('expone los parámetros definitivos', () => {
    expect(COMPRAS_PARAMETROS).toEqual({
      iva: 0.19,
      umbralCotizaciones: 1000000,
      toleranciaConciliacion: 0.01
    });
  });

  it('es una configuración válida para el template base', () => {
    const { config, errors } = normalizeConfig(COMPRAS_CONFIG);
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe('Adquisiciones y Compras');
    expect(config.labels.entity).toBe('Proveedor');
    expect(config.labels.document).toBe('Orden de Compra');
    expect(config.statusLifecycle.statuses).toContain('recibida_total');
    expect(config.statusLifecycle.transitions.emitida).toContain('anulada');
    expect(config.customFields.some((f) => f.key === 'tipo_persona' && f.required)).toBe(true);
    expect(
      config.customFields.some((f) => f.key === 'proveedor_id' && f.target === 'document')
    ).toBe(true);
  });
});
