import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarDatosBancarios,
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearProveedor,
  cuentaCambiadaRecientemente,
  desbloquearProveedor,
  eliminarProveedor,
  listarProveedores,
  obtenerProveedor,
  validarProveedor,
  vistaProveedor
} from '../../../src/compras/proveedores.js';
import { listarEventos } from '../../../src/compras/trazabilidad.js';
import { validarRut } from '../../../src/compras/reglas.js';
import { BANCOS_CHILE, TIPOS_CUENTA } from '../../../src/compras/catalogos-bancarios.js';
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
    expect(proveedor.code).toBe('PRV-013');
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
        { ...DATOS_BASE, banco: 'BancoEstado', numero_cuenta: '123456' },
        USUARIOS.comprador
      )
    ).toThrow(/Solo el rol admin_ti/);

    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    expect(proveedor.banco).toBe('');
    expect(cuentaCambiadaRecientemente(proveedor)).toBe(false);

    expect(() =>
      actualizarProveedor(
        proveedor.id,
        { banco: 'BancoEstado', numero_cuenta: '999999' },
        USUARIOS.comprador
      )
    ).toThrow(/Solo el rol admin_ti/);
    expect(() =>
      actualizarDatosBancarios(
        proveedor.id,
        { banco: 'BancoEstado', numero_cuenta: '123456' },
        USUARIOS.comprador
      )
    ).toThrow(/no puede ejecutar esta acción/);

    const actualizado = actualizarDatosBancarios(
      proveedor.id,
      { banco: 'BancoEstado', numero_cuenta: '123456' },
      USUARIOS.admin
    );
    expect(actualizado.banco).toBe('BancoEstado');
    expect(actualizado.numero_cuenta).toBe('123456');
    expect(cuentaCambiadaRecientemente(actualizado)).toBe(true);
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

  it('permite solo a admin_ti desbloquear proveedores y registra el evento', () => {
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    cambiarEstadoProveedor(proveedor.id, 'aprobado', USUARIOS.comprador);
    cambiarEstadoProveedor(proveedor.id, 'bloqueado', USUARIOS.comprador);

    expect(() => desbloquearProveedor(proveedor.id, USUARIOS.comprador)).toThrow(
      /no puede ejecutar esta acción/
    );
    expect(() => desbloquearProveedor(proveedor.id, USUARIOS.admin)).not.toThrow();
    expect(obtenerProveedor(proveedor.id).estado_proveedor).toBe('aprobado');

    const eventos = listarEventos({
      entidad: 'proveedor',
      entidad_id: proveedor.entity_id,
      accion: 'desbloqueo'
    });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].estado_anterior).toBe('bloqueado');
    expect(eventos[0].estado_nuevo).toBe('aprobado');
    expect(eventos[0].usuario_id).toBe(USUARIOS.admin.id);
  });

  it('aplica la matriz RBAC al RUT tributario y a los datos bancarios', () => {
    const natural = obtenerProveedor('prov-003');
    const vistaComprador = vistaProveedor(natural, 'comprador');
    expect(vistaComprador.rut_visible).toBe('9.876.543-3');
    expect(vistaComprador.datos_bancarios_visibles).toBe(false);
    expect(vistaComprador.cuenta_visible).toBe('****4333');
    expect(vistaComprador.taxId).toBe('9.876.543-3');
    expect(vistaComprador.numero_cuenta).toBe('****4333');
    expect(vistaComprador.puede_editar_banco).toBe(false);

    const vistaBodega = vistaProveedor(natural, 'bodega');
    expect(vistaBodega.rut_visible).toBe('••••••••-•');
    expect(vistaBodega.cuenta_visible).toBe('No disponible');
    expect(vistaBodega.datos_bancarios_visibles).toBe(false);
    expect(vistaBodega.taxId).toBeUndefined();
    expect(vistaBodega.numero_cuenta).toBeUndefined();
    expect(vistaBodega.banco).toBeUndefined();
    expect(vistaBodega.puede_editar_banco).toBe(false);

    const vistaRecepcion = vistaProveedor(natural, 'bodega', 'recepcion');
    expect(vistaRecepcion.rut_visible).toBe('9.876.543-3');
    expect(vistaRecepcion.cuenta_visible).toBe('No disponible');

    const vistaSolicitante = vistaProveedor(natural, 'solicitante');
    expect(vistaSolicitante.rut_visible).toBe('••••••••-•');
    expect(vistaSolicitante.cuenta_visible).toBe('No disponible');

    const vistaJefe = vistaProveedor(natural, 'jefe_compras');
    expect(vistaJefe.rut_visible).toBe('9.876.543-3');
    expect(vistaJefe.cuenta_visible).toBe('555444333');
    expect(vistaJefe.datos_bancarios_visibles).toBe(true);
    expect(vistaJefe.puede_editar_banco).toBe(false);

    const vistaAdmin = vistaProveedor(natural, 'admin_ti');
    expect(vistaAdmin.rut_visible).toBe('9.876.543-3');
    expect(vistaAdmin.datos_bancarios_visibles).toBe(true);
    expect(vistaAdmin.cuenta_visible).toBe('555444333');
    expect(vistaAdmin.puede_editar_banco).toBe(true);
  });

  it('no filtra campos sensibles de proveedores jurídicos desde el registro original', () => {
    const juridica = obtenerProveedor('prov-001');
    expect(juridica.tipo_persona).toBe('jurídica');

    const oculta = vistaProveedor(juridica, 'solicitante');
    for (const clave of [
      'rut',
      'taxId',
      'banco',
      'tipo_cuenta',
      'numero_cuenta',
      'fecha_cambio_cuenta'
    ]) {
      expect(oculta[clave]).toBeUndefined();
    }
    expect(oculta.rut_visible).toBe('••••••••-•');
    expect(oculta.cuenta_visible).toBe('No disponible');

    const comprador = vistaProveedor(juridica, 'comprador');
    expect(comprador.taxId).toBe('12.345.678-5');
    expect(comprador.numero_cuenta).toBe('****6789');
    expect(comprador.banco).toBeUndefined();
    expect(comprador.rut).toBeUndefined();
  });

  it('muestra "No registrado" cuando el proveedor no tiene cuenta bancaria', () => {
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    const vista = vistaProveedor(proveedor, 'comprador');
    expect(vista.cuenta_visible).toBe('No registrado');
    expect(vista.datos_bancarios_visibles).toBe(false);
  });

  it('registra los cambios bancarios con el valor enmascarado', () => {
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    actualizarDatosBancarios(
      proveedor.id,
      { banco: 'BancoEstado', numero_cuenta: '123456' },
      USUARIOS.admin
    );
    actualizarDatosBancarios(proveedor.id, { numero_cuenta: '999999' }, USUARIOS.admin);

    const eventos = listarEventos({
      entidad: 'proveedor',
      entidad_id: proveedor.entity_id,
      accion: 'cambio_datos_bancarios'
    });
    expect(eventos).toHaveLength(2);
    expect(eventos[0].usuario_id).toBe('u-admin-1');
    expect(eventos[0].detalle).toBe('Cuenta ****3456');
    expect(eventos[1].detalle).toBe('Cuenta ****9999');
    expect(eventos.every((e) => !e.detalle.includes('123456'))).toBe(true);
    expect(eventos.every((e) => !e.detalle.includes('999999'))).toBe(true);
  });

  it('no elimina proveedores con órdenes de compra', () => {
    expect(() => eliminarProveedor('prov-001', USUARIOS.comprador)).toThrow(/órdenes de compra/);
    const proveedor = crearProveedor(DATOS_BASE, USUARIOS.comprador);
    eliminarProveedor(proveedor.id, USUARIOS.comprador);
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
      banco: 'BancoEstado'
    });
    expect(resultado.valid).toBe(false);
    expect(resultado.errors.razon_social).toBeDefined();
    expect(resultado.errors.rut).toBeDefined();
    expect(resultado.errors.tipo_persona).toBeDefined();
    expect(resultado.errors.numero_cuenta).toBeDefined();
  });

  it('semilla incluye doce proveedores sintéticos completos con RUT válido', () => {
    const proveedores = listarProveedores();
    expect(proveedores).toHaveLength(12);
    for (const proveedor of proveedores) {
      expect(validarRut(proveedor.taxId)).toBe(true);
      expect(proveedor.nombre_fantasia).toBeTruthy();
      expect(proveedor.rubro).toBeTruthy();
      expect(proveedor.email).toBeTruthy();
      expect(proveedor.phone).toBeTruthy();
      expect(proveedor.address).toBeTruthy();
      expect(['Activo', 'En evaluación', 'Suspendido']).toContain(proveedor.estado);
      expect(proveedor.calificacion_promedio).toBeGreaterThan(0);
      expect(BANCOS_CHILE).toContain(proveedor.banco);
      expect(TIPOS_CUENTA).toContain(proveedor.tipo_cuenta);
      expect(proveedor.numero_cuenta).toBeTruthy();
    }
  });

  it('valida el catálogo bancario y la regla exclusiva de CuentaRUT', () => {
    const fueraDeCatalogo = validarProveedor({
      ...DATOS_BASE,
      banco: 'Banco X',
      numero_cuenta: '123456'
    });
    expect(fueraDeCatalogo.errors.banco).toMatch(/catálogo chileno/);

    const alias = validarProveedor({
      ...DATOS_BASE,
      banco: 'Banco Estado',
      numero_cuenta: '123456',
      tipo_cuenta: 'corriente'
    });
    expect(alias.valid).toBe(true);

    const cuentaRutOtroBanco = validarProveedor({
      ...DATOS_BASE,
      banco: 'Banco BCI',
      numero_cuenta: '123456',
      tipo_cuenta: 'CuentaRUT (BancoEstado)'
    });
    expect(cuentaRutOtroBanco.errors.banco).toMatch(/BancoEstado/);

    const cuentaRutValida = validarProveedor({
      ...DATOS_BASE,
      banco: 'BancoEstado',
      numero_cuenta: '11111111',
      tipo_cuenta: 'CuentaRUT (BancoEstado)'
    });
    expect(cuentaRutValida.valid).toBe(true);
  });
});
