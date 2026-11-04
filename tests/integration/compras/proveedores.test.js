import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearProveedor,
  cuentaCambiadaRecientemente,
  eliminarProveedor,
  obtenerProveedor,
  validarProveedor,
  vistaProveedor
} from '../../../src/compras/proveedores.js';
import { cargarDatos, USUARIOS } from './helpers.js';

const DATOS_BASE = Object.freeze({
  razon_social: 'Proveedor de Prueba SpA',
  rut: '11111111-1',
  tipo_persona: 'jurídica',
  giro: 'Servicios de prueba',
  region: 'Metropolitana',
  condicion_pago_dias: 30,
  email: 'contacto@proveedor.cl'
});

describe('proveedores', () => {
  beforeEach(() => {
    cargarDatos();
  });

  it('crea un proveedor potencial con RUT formateado', () => {
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    expect(proveedor.entity_id).toMatch(/^prov-/);
    expect(proveedor.name).toBe(DATOS_BASE.razon_social);
    expect(proveedor.taxId).toBe('11.111.111-1');
    expect(proveedor.code).toBe('PRV-009');
    expect(proveedor.estado_proveedor).toBe('potencial');
    expect(obtenerProveedor(proveedor.id)).toBeTruthy();
  });

  it('rechaza RUT duplicado y datos inválidos', () => {
    expect(() => crearProveedor({ ...DATOS_BASE, rut: '12345678-5' }, USUARIOS.comprador)).toThrow(
      /RUT ya está registrado/
    );
    expect(() => crearProveedor({ ...DATOS_BASE, rut: '12345678-9' }, USUARIOS.comprador)).toThrow(
      /RUT no es válido/
    );
    expect(() =>
      crearProveedor({ ...DATOS_BASE, email: 'no-es-email' }, USUARIOS.comprador)
    ).toThrow(/correo/);
    expect(() =>
      crearProveedor({ ...DATOS_BASE, condicion_pago_dias: 45 }, USUARIOS.comprador)
    ).toThrow(/acuerdo de plazo mayor/);
  });

  it('solo admin_ti puede registrar y modificar datos bancarios', () => {
    expect(() =>
      crearProveedor(
        { ...DATOS_BASE, banco: 'Banco X', numero_cuenta: '123456' },
        USUARIOS.comprador
      )
    ).toThrow(/Solo el rol admin_ti/);

    const proveedor = crearProveedor(
      { ...DATOS_BASE, banco: 'Banco X', numero_cuenta: '123456' },
      USUARIOS.admin
    );
    expect(proveedor.banco).toBe('Banco X');
    expect(cuentaCambiadaRecientemente(proveedor)).toBe(true);

    expect(() =>
      actualizarProveedor(proveedor.id, { numero_cuenta: '999999' }, USUARIOS.comprador)
    ).toThrow(/Solo el rol admin_ti/);

    const actualizado = actualizarProveedor(
      proveedor.id,
      { numero_cuenta: '999999' },
      USUARIOS.admin
    );
    expect(actualizado.numero_cuenta).toBe('999999');
    expect(actualizado.fecha_cambio_cuenta).toBeTruthy();
  });

  it('respeta el ciclo de estados del proveedor', () => {
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    expect(
      cambiarEstadoProveedor(proveedor.id, 'aprobado', USUARIOS.comprador).estado_proveedor
    ).toBe('aprobado');
    expect(
      cambiarEstadoProveedor(proveedor.id, 'bloqueado', USUARIOS.comprador).estado_proveedor
    ).toBe('bloqueado');
    expect(() => cambiarEstadoProveedor(proveedor.id, 'aprobado', USUARIOS.comprador)).toThrow(
      /Transición/
    );
    expect(() => cambiarEstadoProveedor(proveedor.id, 'inexistente', USUARIOS.comprador)).toThrow(
      /inválido/
    );
  });

  it('enmascara RUT de persona natural y datos bancarios según rol', () => {
    const natural = obtenerProveedor('prov-003');
    const vistaComprador = vistaProveedor(natural, 'comprador');
    expect(vistaComprador.rut_visible).toBe('98.***.***-3');
    expect(vistaComprador.datos_bancarios_visibles).toBe(false);
    expect(vistaComprador.cuenta_visible).toBe('****4333');

    const vistaAdmin = vistaProveedor(natural, 'admin_ti');
    expect(vistaAdmin.rut_visible).toBe('9.876.543-3');
    expect(vistaAdmin.datos_bancarios_visibles).toBe(true);
    expect(vistaAdmin.cuenta_visible).toBe('555444333');
  });

  it('no elimina proveedores con órdenes de compra', () => {
    expect(() => eliminarProveedor('prov-001', USUARIOS.admin)).toThrow(/órdenes de compra/);
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    eliminarProveedor(proveedor.id, USUARIOS.admin);
    expect(obtenerProveedor(proveedor.id)).toBeUndefined();
  });

  it('valida campos obligatorios y consistencia bancaria', () => {
    const resultado = validarProveedor({
      razon_social: '',
      rut: '',
      tipo_persona: 'otro',
      giro: '',
      region: '',
      condicion_pago_dias: '',
      banco: 'Banco X'
    });
    expect(resultado.valid).toBe(false);
    expect(resultado.errors.razon_social).toBeDefined();
    expect(resultado.errors.rut).toBeDefined();
    expect(resultado.errors.tipo_persona).toBeDefined();
    expect(resultado.errors.numero_cuenta).toBeDefined();
  });
});
