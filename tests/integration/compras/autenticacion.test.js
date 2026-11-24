import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { CLAVE_DEMO } from '../../../src/compras/autenticacion.js';

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

function elegirRol(rol) {
  qs('login-rol').value = rol;
  qs('login-rol').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
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
  it('muestra el acceso por rol y rechaza una clave incorrecta', () => {
    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('btn-logout').hidden).toBe(true);
    expect(qs('login-rol').options.length).toBe(6);
    expect(qs('campo-nombre').hidden).toBe(true);

    elegirRol('jefe_compras');
    expect(qs('campo-nombre').hidden).toBe(false);
    qs('login-nombre').value = 'Marcela Rojas';
    qs('login-clave').value = 'clave-erronea';
    enviarLogin();

    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-error').textContent).toContain('Clave incorrecta');
    expect(qs('login-overlay').hidden).toBe(false);
  });

  it('pide nombre para solicitante, comprador y jefatura', () => {
    elegirRol('solicitante');
    expect(qs('campo-nombre').hidden).toBe(false);
    expect([...qs('nombres-demo').options].map((opcion) => opcion.value)).toEqual([
      'Ana Pérez',
      'Luis Soto'
    ]);

    elegirRol('bodega');
    expect(qs('campo-nombre').hidden).toBe(true);
    expect(qs('login-nombre').value).toBe('');
    expect(qs('nombres-demo').options.length).toBe(0);

    elegirRol('comprador');
    expect(qs('campo-nombre').hidden).toBe(false);
    expect([...qs('nombres-demo').options].map((opcion) => opcion.value)).toEqual(['Carla Díaz']);

    elegirRol('jefe_compras');
    expect(qs('campo-nombre').hidden).toBe(false);
    expect([...qs('nombres-demo').options].map((opcion) => opcion.value)).toEqual([
      'Marcela Rojas',
      'Jorge Muñoz'
    ]);
  });

  it('ingresa con nombre para comprador y muestra la sesión identificada', () => {
    elegirRol('comprador');
    qs('login-nombre').value = 'carla diaz';
    qs('login-clave').value = CLAVE_DEMO;
    enviarLogin();

    expect(qs('login-error').hidden).toBe(true);
    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('btn-logout').hidden).toBe(false);
    expect(qs('admin-rol-control').hidden).toBe(true);
    expect(qs('sesion-indicador').textContent).toContain('Carla Díaz');
    expect(qs('sesion-indicador').textContent).toContain('Comprador');

    qs('btn-logout').click();

    expect(qs('login-overlay').hidden).toBe(false);
    expect(qs('login-rol').value).toBe('');
    expect(qs('campo-nombre').hidden).toBe(true);
  });

  it('ingresa con nombre para jefatura y muestra la sesión identificada', () => {
    elegirRol('jefe_compras');
    expect(qs('campo-nombre').hidden).toBe(false);
    qs('login-nombre').value = 'Marcela Rojas';
    qs('login-clave').value = CLAVE_DEMO;
    enviarLogin();

    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('admin-rol-control').hidden).toBe(true);
    expect(qs('sesion-indicador').textContent).toContain('Marcela Rojas');
    expect(qs('sesion-indicador').textContent).toContain('Jefe de Compras');
  });

  it('rechaza un nombre que no corresponde al rol', () => {
    elegirRol('solicitante');
    qs('login-nombre').value = 'Persona Inexistente';
    qs('login-clave').value = CLAVE_DEMO;
    enviarLogin();

    expect(qs('login-error').hidden).toBe(false);
    expect(qs('login-error').textContent).toContain('no corresponde al rol');
    expect(qs('login-overlay').hidden).toBe(false);
  });

  it('mantiene accesibles encabezados, pestañas, etiquetas y tablas', () => {
    elegirRol('solicitante');
    qs('login-nombre').value = 'Ana Pérez';
    qs('login-clave').value = CLAVE_DEMO;
    enviarLogin();

    const raiz = qs('compras-root');
    expect(qs('view-compras').getAttribute('aria-labelledby')).toBe('compras-titulo');
    expect(raiz.querySelector('h1').id).toBe('compras-titulo');

    const pestañas = [...raiz.querySelectorAll('[role="tab"]')];
    expect(pestañas.length).toBe(10);
    expect(pestañas.every((p) => p.getAttribute('aria-controls') === 'compras-content')).toBe(true);
    expect(pestañas.filter((p) => p.tabIndex === 0).length).toBe(1);
    expect(qs('compras-content').getAttribute('aria-labelledby')).toBe('tab-panel');

    expect(raiz.querySelectorAll('label:not([for])').length).toBe(0);
    expect([...raiz.querySelectorAll('th')].every((th) => th.getAttribute('scope') === 'col')).toBe(
      true
    );
  });
});
