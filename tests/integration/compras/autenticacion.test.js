import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { CLAVE_DEMO } from '../../../src/compras/autenticacion.js';
import { clave } from '../../../src/compras/almacenamiento.js';
import { USUARIOS } from './helpers.js';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

let dom;

function qs(id) {
  return document.getElementById(id);
}

function enviarLogin() {
  qs('login-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
}

function ingresar(email, claveValor = CLAVE_DEMO) {
  qs('login-email').value = email;
  qs('login-clave').value = claveValor;
  enviarLogin();
}

beforeEach(async () => {
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
  const { boot } = await import('../../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('acceso a la interfaz de compras', () => {
  it('no muestra acceso por rol y rechaza una clave incorrecta', () => {
    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('btn-logout').hidden).toBe(true);
    expect(qs('login-rol')).toBeNull();
    expect(qs('login-nombre')).toBeNull();
    expect(qs('login-modo-rol')).toBeNull();

    ingresar('andres.contreras@pyme.cl', 'clave-erronea');

    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-error').textContent).toContain('Clave incorrecta');
    expect(qs('login-overlay').hidden).toBe(false);
  });

  it('rechaza un correo que no corresponde a ningún usuario', () => {
    ingresar('desconocido@example.com');

    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-error').textContent).toContain('correo');
    expect(qs('login-overlay').hidden).toBe(false);
  });

  it('ingresa con correo de comprador y muestra la sesión identificada', () => {
    ingresar('francisca.herrera@pyme.cl');

    expect(qs('login-error').hidden).toBe(true);
    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('btn-logout').hidden).toBe(false);
    expect(qs('rol-activo')).toBeNull();
    expect(qs('sesion-indicador').textContent).toContain(USUARIOS.comprador.nombre);
    expect(qs('sesion-indicador').textContent).toContain('Comprador');

    qs('btn-logout').click();

    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('login-email').value).toBe('');
    expect(localStorage.getItem(clave('sesion'))).toBeNull();
  });

  it('ingresa con correo de jefatura y muestra la sesión identificada', () => {
    ingresar('andres.contreras@pyme.cl');

    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('rol-activo')).toBeNull();
    expect(qs('sesion-indicador').textContent).toContain(USUARIOS.jefe.nombre);
    expect(qs('sesion-indicador').textContent).toContain('Jefe de Compras');
  });

  it('muestra el ingreso aunque exista una sesión guardada sin autenticación', async () => {
    const { setSesion } = await import('../../../src/compras/almacenamiento.js');
    setSesion({ usuario_id: 'u-admin-1', rol: 'admin_ti' });
    const { boot } = await import('../../../src/app.js');
    await boot();

    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('sesion-indicador').hidden).toBe(true);
  });

  it('mantiene accesibles encabezados, pestañas, etiquetas y tablas', () => {
    ingresar('camila.rojas@pyme.cl');

    const raiz = qs('compras-root');
    expect(qs('view-compras').getAttribute('aria-labelledby')).toBe('compras-titulo');
    expect(raiz.querySelector('h1').id).toBe('compras-titulo');

    const navegacion = [...document.querySelectorAll('.side-nav [data-nav-tab]')];
    expect(navegacion.length).toBe(5);
    expect(navegacion.every((p) => p.getAttribute('aria-controls') === 'compras-content')).toBe(
      true
    );
    expect(navegacion.filter((p) => p.getAttribute('aria-current') === 'page').length).toBe(1);
    expect(qs('compras-content').getAttribute('aria-labelledby')).toBe('compras-titulo');

    expect(raiz.querySelectorAll('label:not([for])').length).toBe(0);
    expect([...raiz.querySelectorAll('th')].every((th) => th.getAttribute('scope') === 'col')).toBe(
      true
    );
  });

  it('ingresa con RUT Módulo 11 y rechaza un dígito verificador inválido', () => {
    ingresar('18.100.001-5');

    expect(qs('login-error').hidden).toBe(true);
    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('sesion-indicador').textContent).toContain(USUARIOS.jefe.nombre);

    qs('btn-logout').click();
    ingresar('18.100.001-4');

    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-email-error').hidden).toBe(false);
    expect(qs('login-email-error').textContent).toContain('correo o RUT');
    expect(qs('login-email').getAttribute('aria-invalid')).toBe('true');
  });

  it('revela credenciales en Modo Demo pero nunca en Modo Real', async () => {
    qs('btn-modo-presentacion').click();
    expect(qs('login-directorio').hidden).toBe(false);
    expect(qs('login-directorio-lista').querySelectorAll('.directory-user')).toHaveLength(8);
    expect(qs('login-directorio-lista').textContent).toContain(CLAVE_DEMO);

    const modoReal = qs('modo-real');
    modoReal.checked = true;
    modoReal.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(qs('modo-demo').checked).toBe(false);
    expect(qs('btn-modo-presentacion').hidden).toBe(true);
    expect(qs('login-directorio').hidden).toBe(true);
    expect(qs('login-directorio-lista').querySelectorAll('.directory-user')).toHaveLength(0);
    expect(qs('login-modo-estado').textContent).toContain('Modo Real');

    const { leerDato } = await import('../../../src/compras/gobernanza.js');
    expect(leerDato('modo_datos')).toBe('real');
  });

  it('impide el ingreso de cuentas suspendidas y cierra una sesión suspendida', async () => {
    const { leer, guardar } = await import('../../../src/compras/almacenamiento.js');
    const usuarios = leer('usuarios').map((u) =>
      u.id === 'u-solicitante-1' ? { ...u, activo: false } : u
    );
    guardar('usuarios', usuarios);

    ingresar('18.123.456-3');
    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-overlay').hidden).toBe(false);

    const { setSesion, marcarAutenticacion } = await import(
      '../../../src/compras/almacenamiento.js'
    );
    setSesion({ usuario_id: 'u-solicitante-1', rol: 'solicitante' });
    marcarAutenticacion(true);
    const { boot } = await import('../../../src/app.js');
    await boot();

    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('btn-logout').hidden).toBe(true);
  });
});
