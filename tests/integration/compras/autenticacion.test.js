import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { CLAVE_DEMO } from '../../../src/compras/autenticacion.js';
import { clave } from '../../../src/compras/almacenamiento.js';

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
    expect(qs('sesion-indicador').textContent).toContain('Francisca Herrera Díaz');
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
    expect(qs('sesion-indicador').textContent).toContain('Andrés Contreras Pérez');
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
});
