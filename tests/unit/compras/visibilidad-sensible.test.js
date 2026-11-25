import { describe, expect, it } from 'vitest';

import {
  CUENTA_NO_DISPONIBLE,
  RUT_OCULTO,
  enmascararCuentaPorRol,
  enmascararDatosEnTexto,
  enmascararRut,
  enmascararRutProveedor,
  puedeVerDatosBancarios,
  puedeVerRutEmpleado,
  puedeVerRutProveedor,
  rutEmpleadoVisible
} from '../../../src/compras/visibilidad.js';

const ROLES = ['solicitante', 'comprador', 'jefe_compras', 'bodega', 'admin_ti'];
const RUT_EMPLEADO = '18.123.456-5';
const RUT_PROVEEDOR = '12.345.678-5';

describe('visibilidad y enmascaramiento sensibles', () => {
  it('oculta el RUT de terceros a solicitante, comprador y bodega', () => {
    for (const rol of ['solicitante', 'comprador', 'bodega']) {
      expect(puedeVerRutEmpleado(rol)).toBe(false);
      expect(enmascararRut(RUT_EMPLEADO, rol)).toBe(RUT_OCULTO);
    }
  });

  it('muestra el RUT propio a cualquier rol', () => {
    for (const rol of ROLES) {
      expect(puedeVerRutEmpleado(rol, 'listado', true)).toBe(true);
      expect(enmascararRut(RUT_EMPLEADO, rol, 'listado', true)).toBe(RUT_EMPLEADO);
    }
  });

  it('admin_ti ve el RUT completo y jefe_compras solo en auditoría', () => {
    expect(puedeVerRutEmpleado('admin_ti')).toBe(true);
    expect(enmascararRut(RUT_EMPLEADO, 'admin_ti')).toBe(RUT_EMPLEADO);
    expect(puedeVerRutEmpleado('jefe_compras', 'auditoria')).toBe('parcial');
    expect(enmascararRut(RUT_EMPLEADO, 'jefe_compras', 'auditoria')).toBe('18.XXX.XXX-5');
    expect(puedeVerRutEmpleado('jefe_compras', 'listado')).toBe(false);
  });

  it('aplica la matriz completa de RUT de empleado por rol y contexto', () => {
    const tercero = { id: 'u-otro', rut: RUT_EMPLEADO };
    const sesion = (rol, id = 'u-activo') => ({ id, rol });
    const esperado = {
      solicitante: { listado: RUT_OCULTO, auditoria: RUT_OCULTO },
      comprador: { listado: RUT_OCULTO, auditoria: RUT_OCULTO },
      bodega: { listado: RUT_OCULTO, auditoria: RUT_OCULTO },
      jefe_compras: { listado: RUT_OCULTO, auditoria: '18.XXX.XXX-5' },
      admin_ti: { listado: RUT_EMPLEADO, auditoria: RUT_EMPLEADO }
    };
    for (const rol of ROLES) {
      for (const contexto of ['listado', 'auditoria']) {
        expect(rutEmpleadoVisible(tercero, sesion(rol), contexto)).toBe(
          esperado[rol][contexto]
        );
      }
      expect(rutEmpleadoVisible({ id: 'u-activo', rut: RUT_EMPLEADO }, sesion(rol))).toBe(
        RUT_EMPLEADO
      );
    }
  });

  it('aplica la matriz de RUT tributario de proveedores', () => {
    expect(puedeVerRutProveedor('solicitante')).toBe(false);
    expect(puedeVerRutProveedor('bodega')).toBe(false);
    expect(puedeVerRutProveedor('bodega', 'recepcion')).toBe(true);
    expect(puedeVerRutProveedor('bodega', 'guia_despacho')).toBe(true);
    expect(puedeVerRutProveedor('comprador')).toBe(true);
    expect(puedeVerRutProveedor('jefe_compras')).toBe(true);
    expect(puedeVerRutProveedor('admin_ti')).toBe(true);
  });

  it('muestra el RUT del proveedor por rol y canal', () => {
    const esperado = {
      solicitante: RUT_OCULTO,
      comprador: RUT_PROVEEDOR,
      jefe_compras: RUT_PROVEEDOR,
      bodega: RUT_OCULTO,
      admin_ti: RUT_PROVEEDOR
    };
    for (const rol of ROLES) {
      expect(enmascararRutProveedor(RUT_PROVEEDOR, rol, 'general')).toBe(esperado[rol]);
    }
    expect(enmascararRutProveedor(RUT_PROVEEDOR, 'bodega', 'recepcion')).toBe(RUT_PROVEEDOR);
    expect(enmascararRutProveedor(RUT_PROVEEDOR, 'bodega', 'guia_despacho')).toBe(RUT_PROVEEDOR);
    expect(enmascararRutProveedor('', 'admin_ti')).toBe('');
  });

  it('limita datos bancarios a jefe_compras y admin_ti', () => {
    expect(puedeVerDatosBancarios('solicitante')).toBe(false);
    expect(puedeVerDatosBancarios('bodega')).toBe(false);
    expect(puedeVerDatosBancarios('comprador')).toBe(false);
    expect(puedeVerDatosBancarios('jefe_compras')).toBe(true);
    expect(puedeVerDatosBancarios('admin_ti')).toBe(true);
  });

  it('aplica la matriz completa de cuentas bancarias por rol', () => {
    const cuenta = '123456789';
    expect(enmascararCuentaPorRol(cuenta, 'solicitante')).toBe('');
    expect(enmascararCuentaPorRol(cuenta, 'bodega')).toBe('');
    expect(enmascararCuentaPorRol(cuenta, 'comprador')).toBe('****6789');
    expect(enmascararCuentaPorRol(cuenta, 'jefe_compras')).toBe(cuenta);
    expect(enmascararCuentaPorRol(cuenta, 'admin_ti')).toBe(cuenta);
    expect(CUENTA_NO_DISPONIBLE).toBe('No disponible');
  });

  it('determinista cuentas vacías y cortas sin revelar dígitos a roles sin acceso', () => {
    expect(enmascararCuentaPorRol('', 'admin_ti')).toBe('');
    expect(enmascararCuentaPorRol('1234', 'comprador')).toBe('**34');
    expect(enmascararCuentaPorRol('123', 'comprador')).toBe('*23');
    expect(enmascararCuentaPorRol('12', 'comprador')).toBe('**');
    expect(enmascararCuentaPorRol('1', 'comprador')).toBe('*');
    for (const rol of ['solicitante', 'bodega']) {
      for (const cuenta of ['123456789', '1234', '12', '1', '']) {
        expect(enmascararCuentaPorRol(cuenta, rol)).toBe('');
      }
    }
  });

  it('enmascara RUT de empleados y cuentas en texto según el rol', () => {
    const detalle = 'RUT 18.123.456-5 y cuenta 555444333 del proveedor 9.876.543-3';
    const empleados = ['18.123.456-5'];
    expect(enmascararDatosEnTexto(detalle, 'admin_ti', empleados)).toBe(detalle);
    expect(enmascararDatosEnTexto(detalle, 'jefe_compras', empleados)).toBe(
      'RUT 18.XXX.XXX-5 y cuenta 555444333 del proveedor 9.876.543-3'
    );
    expect(enmascararDatosEnTexto(detalle, 'comprador', empleados)).toBe(
      `RUT ${RUT_OCULTO} y cuenta ****4333 del proveedor 9.876.543-3`
    );
    expect(enmascararDatosEnTexto(detalle, 'bodega', empleados)).toBe(
      `RUT ${RUT_OCULTO} y cuenta **** del proveedor ${RUT_OCULTO}`
    );
    expect(enmascararDatosEnTexto('sin datos sensibles', 'bodega')).toBe('sin datos sensibles');
  });

  it('enmascara RUT tributario con puntos y guion en texto según el rol', () => {
    const detalle = 'RUT proveedor 9.876.543-3 y 12.345.678-5';
    expect(enmascararDatosEnTexto(detalle, 'solicitante')).toBe(
      `RUT proveedor ${RUT_OCULTO} y ${RUT_OCULTO}`
    );
    expect(enmascararDatosEnTexto(detalle, 'bodega')).toBe(
      `RUT proveedor ${RUT_OCULTO} y ${RUT_OCULTO}`
    );
    expect(enmascararDatosEnTexto(detalle, 'comprador')).toBe(detalle);
  });
});
