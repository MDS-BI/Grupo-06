import { describe, expect, it } from 'vitest';
import {
  AYUDA_CUENTA_RUT,
  BANCOS_CHILE,
  BANCO_ESTADO,
  TIPOS_CUENTA,
  TIPO_CUENTA_RUT,
  cuerpoRutSinDigito,
  datosCuentaRut,
  esBancoValido,
  esCuentaRut,
  esTipoCuentaValido,
  normalizarBanco,
  normalizarTipoCuenta
} from '../../../src/compras/catalogos-bancarios.js';

describe('catálogos bancarios chilenos', () => {
  it('expone los bancos y tipos de cuenta operantes en Chile', () => {
    expect(BANCOS_CHILE).toHaveLength(12);
    expect(BANCOS_CHILE).toContain('BancoEstado');
    expect(BANCOS_CHILE).toContain('Banco de Chile');
    expect(BANCOS_CHILE).toContain('Banco Santander Chile');
    expect(BANCOS_CHILE).toContain('Coopeuch / Tenpo / Mercado Pago (Prepago)');
    expect(TIPOS_CUENTA).toEqual([
      'Cuenta Corriente',
      'Cuenta Vista / Chequera Electrónica',
      TIPO_CUENTA_RUT,
      'Cuenta de Ahorro',
      'Cuenta Prepago'
    ]);
  });

  it('normaliza alias históricos sin inventar nuevos valores', () => {
    expect(normalizarBanco('Banco Estado')).toBe(BANCO_ESTADO);
    expect(normalizarBanco('Banco Santander')).toBe('Banco Santander Chile');
    expect(normalizarTipoCuenta('corriente')).toBe('Cuenta Corriente');
    expect(normalizarTipoCuenta('Ahorro')).toBe('Cuenta de Ahorro');
    expect(esBancoValido('Banco Estado')).toBe(true);
    expect(esBancoValido('Banco X')).toBe(false);
    expect(esTipoCuentaValido('corriente')).toBe(true);
    expect(esTipoCuentaValido('otra')).toBe(false);
    expect(esCuentaRut('CuentaRUT')).toBe(true);
  });

  it('deriva el número de CuentaRUT del cuerpo del RUT sin dígito verificador', () => {
    expect(cuerpoRutSinDigito('76.543.210-3')).toBe('76543210');
    expect(cuerpoRutSinDigito('765432103')).toBe('76543210');
    expect(cuerpoRutSinDigito('12.345.678-K')).toBe('12345678');
    expect(cuerpoRutSinDigito('invalido')).toBe('');
    expect(datosCuentaRut({ taxId: '76.543.210-3' })).toEqual({
      banco: BANCO_ESTADO,
      tipo_cuenta: TIPO_CUENTA_RUT,
      numero_cuenta: '76543210'
    });
    expect(AYUDA_CUENTA_RUT).toBe(
      'Auto-completado desde el RUT del proveedor sin dígito verificador'
    );
  });
});
