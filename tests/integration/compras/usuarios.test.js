import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { USUARIOS } from './helpers.js';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

let dom;

function qs(id) {
  return document.getElementById(id);
}

async function preparar() {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();

  const almacenamiento = await import('../../../src/compras/almacenamiento.js');
  almacenamiento.cargarSemilla({ forzar: true });
  const { iniciarSesionConIdentificador, CLAVE_DEMO } = await import(
    '../../../src/compras/autenticacion.js'
  );
  const ingreso = iniciarSesionConIdentificador('admin.ti@pyme.cl', CLAVE_DEMO);
  expect(ingreso.ok).toBe(true);
  const { boot } = await import('../../../src/app.js');
  await boot();
  return { almacenamiento, CLAVE_DEMO };
}

/** Solicita y valida un OTP de simulación en el modal de administración. */
function autorizarEnModal(botonSolicitar, contexto = 'edicion_usuario') {
  qs(botonSolicitar).click();
  const ayuda = document.querySelector('.otp-demo-help strong');
  expect(ayuda, `ayuda OTP para ${contexto}`).toBeTruthy();
  qs('modal-admin-otp').value = ayuda.textContent.trim();
  qs('modal-admin-validar').click();
  expect(document.querySelector('.modal-admin-card .error')).toBeNull();
}

beforeEach(preparar);

afterEach(() => {
  dom?.window.close();
});

describe('padrón y administración de usuarios', () => {
  it('muestra los ocho usuarios con RUT completo y enlaces clicables solo para admin_ti', async () => {
    const padron = qs('padron-usuarios');
    expect(padron).toBeTruthy();
    expect(padron.querySelectorAll('tbody tr')).toHaveLength(8);
    const columnas = [...padron.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    expect(columnas).toEqual([
      'Nombre',
      'Rol',
      'RUT',
      'Correo corporativo',
      'Centro de costo',
      'Estado',
      'Acciones'
    ]);
    expect(padron.textContent).toContain('18.100.001-5');
    expect(padron.textContent).not.toContain('••••••••-•');
    expect(padron.querySelectorAll('.usuario-link')).toHaveLength(8);
    expect(qs('admin-auditoria')).toBeTruthy();
    expect(qs('admin-parametros')).toBeTruthy();

    qs('btn-logout').click();
    const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
    iniciarSesion('comprador', USUARIOS.comprador.nombre, 'Compras2026');
    const { boot } = await import('../../../src/app.js');
    await boot();
    expect(qs('padron-usuarios')).toBeNull();
    expect(qs('admin-auditoria')).toBeNull();
  });

  it('abre la ficha con campos bloqueados y habilita la edición tras validar OTP', async () => {
    const enlace = qs('padron-usuarios').querySelector('[data-usuario-id="u-solicitante-1"]');
    expect(enlace).toBeTruthy();
    enlace.click();

    expect(qs('modal-admin')).toBeTruthy();
    expect(qs('usuario-nombre').disabled).toBe(true);
    expect(qs('usuario-email').disabled).toBe(true);
    expect(qs('usuario-rut').disabled).toBe(true);
    expect(qs('usuario-rol').disabled).toBe(true);
    expect(qs('usuario-centro').disabled).toBe(true);
    expect(qs('modal-admin-guardar').disabled).toBe(true);
    expect(document.body.textContent).toContain(
      'Solicitar autorización del titular (Código OTP)'
    );

    autorizarEnModal('modal-admin-solicitar');

    expect(qs('usuario-nombre').disabled).toBe(false);
    expect(qs('modal-admin-guardar').disabled).toBe(false);
    qs('usuario-nombre').value = 'Camila Rojas Actualizada';
    qs('modal-admin-guardar').click();

    expect(qs('padron-usuarios').textContent).toContain('Camila Rojas Actualizada');
    expect(qs('admin-auditoria').textContent).toContain('edicion_usuario');
    expect(qs('admin-auditoria').textContent).toContain('OTP');

    const { validarOtp, solicitarOtp } = await import('../../../src/compras/gobernanza.js');
    const nueva = solicitarOtp({ usuario_id: 'u-solicitante-1', contexto: 'edicion_usuario' });
    expect(validarOtp(nueva.solicitud.id, nueva.codigo).ok).toBe(true);
    expect(validarOtp(nueva.solicitud.id, nueva.codigo).ok).toBe(false);
  });

  it('impide el ingreso de una cuenta suspendida y mantiene un admin_ti activo', async () => {
    const enlace = qs('padron-usuarios').querySelector('[data-usuario-id="u-solicitante-2"]');
    enlace.click();
    autorizarEnModal('modal-admin-solicitar-estado', 'suspension_usuario');
    qs('modal-admin-estado').click();

    expect(qs('padron-usuarios').textContent).toContain('Suspendido');

    const { validarCredencialesIdentificador, CLAVE_DEMO } = await import(
      '../../../src/compras/autenticacion.js'
    );
    expect(validarCredencialesIdentificador('diego.munoz@pyme.cl', CLAVE_DEMO).ok).toBe(false);
    expect(validarCredencialesIdentificador('17.234.567-0', CLAVE_DEMO).ok).toBe(false);

    const {
      cambiarEstadoUsuario,
      usuarioSuspendido
    } = await import('../../../src/compras/administracion.js');
    const { solicitarOtp, validarOtp } = await import('../../../src/compras/gobernanza.js');
    expect(usuarioSuspendido('u-solicitante-2')).toBe(true);

    const propia = solicitarOtp({
      usuario_id: 'u-admin-1',
      actor_id: 'u-admin-1',
      contexto: 'suspension_usuario'
    });
    expect(() =>
      cambiarEstadoUsuario({
        id: 'u-admin-1',
        suspendido: true,
        token: validarOtp(propia.solicitud.id, propia.codigo).token
      })
    ).toThrow('No puedes suspender tu propia cuenta');
  });

  it('aplica parámetros dinámicos validados por OTP a las reglas de negocio', async () => {
    const { cambiarParametros } = await import('../../../src/compras/administracion.js');
    const { obtenerUmbralCotizaciones, solicitarOtp, validarOtp } = await import(
      '../../../src/compras/gobernanza.js'
    );
    expect(obtenerUmbralCotizaciones()).toBe(1000000);

    const solicitud = solicitarOtp({
      usuario_id: 'u-admin-1',
      actor_id: 'u-admin-1',
      contexto: 'cambio_parametro'
    });
    const token = validarOtp(solicitud.solicitud.id, solicitud.codigo).token;
    expect(() => cambiarParametros({ cambios: { umbralCotizaciones: -1 }, token })).toThrow(
      'positivo'
    );

    const otra = solicitarOtp({
      usuario_id: 'u-admin-1',
      actor_id: 'u-admin-1',
      contexto: 'cambio_parametro'
    });
    const tokenValido = validarOtp(otra.solicitud.id, otra.codigo).token;
    cambiarParametros({
      cambios: { umbralCotizaciones: 900000, toleranciaConciliacion: 0.02 },
      token: tokenValido
    });
    expect(obtenerUmbralCotizaciones()).toBe(900000);

    const { umbralCotizaciones } = await import('../../../src/compras/reglas.js');
    expect(umbralCotizaciones()).toBe(900000);
  });
});
