import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

const CORREOS = [
  'ana.perez@example.com',
  'luis.soto@example.com',
  'carla.diaz@example.com',
  'jefe.compras@example.com',
  'jorge.munoz@example.com',
  'bodega@example.com',
  'admin.ti@example.com'
];

let dom;

function qs(id) {
  return document.getElementById(id);
}

function enviarLogin() {
  qs('login-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
}

function ingresar(email) {
  qs('login-rol').value = '';
  qs('login-email').value = email;
  qs('login-clave').value = 'Compras2026';
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

describe('portal corporativo de acceso', () => {
  it('carga todas las colecciones semilla en el primer arranque', async () => {
    const { leer } = await import('../../../src/compras/almacenamiento.js');
    const expected = {
      usuarios: 7,
      centros_costo: 4,
      productos: 20,
      proveedores: 8,
      solicitudes: 10,
      cotizaciones: 7,
      ordenes: 8,
      recepciones: 5,
      facturas: 7,
      devoluciones: 2,
      catalogo: 10,
      evaluaciones: 2
    };

    for (const [coleccion, cantidad] of Object.entries(expected)) {
      expect(leer(coleccion), coleccion).toHaveLength(cantidad);
    }

    const usuarios = leer('usuarios');
    expect(usuarios.find((u) => u.id === 'u-bodega-1').nombre).toBe('Encargado de Bodega');
    expect(usuarios.find((u) => u.id === 'u-admin-1').nombre).toBe('Administrador TI');
  });

  it('muestra el directorio con los siete usuarios reales y sus centros', () => {
    const botones = [...qs('login-directorio-lista').querySelectorAll('.directory-user')];
    expect(botones.map((b) => b.dataset.email).sort()).toEqual([...CORREOS].sort());
    expect(botones).toHaveLength(7);
    expect(botones.map((b) => b.textContent).join(' ')).toContain('CC-ADM');
    expect(botones.map((b) => b.textContent).join(' ')).toContain('CC-OPE');
    expect(botones.map((b) => b.textContent).join(' ')).toContain('CC-COM');
    expect(botones.map((b) => b.textContent).join(' ')).toContain('CC-BOD');
  });

  it('autentica por correo corporativo y muestra identidad, rol y centro activos', () => {
    ingresar('carla.diaz@example.com');

    expect(qs('login-error').hidden).toBe(true);
    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('btn-logout').hidden).toBe(false);
    expect(qs('admin-rol-control').hidden).toBe(true);
    expect(qs('sesion-indicador').textContent).toContain('Carla Díaz');
    expect(qs('sesion-indicador').textContent).toContain('Comprador');
    expect(qs('sesion-indicador').textContent).toContain('CC-COM · Compras');
  });

  it('ingresa con un clic desde el acceso rápido de bodega', () => {
    const boton = [...qs('login-directorio-lista').querySelectorAll('.directory-user')].find(
      (item) => item.dataset.email === 'bodega@example.com'
    );
    boton.click();

    expect(qs('login-overlay').hidden).toBe(true);
    expect(qs('sesion-indicador').textContent).toContain('Encargado de Bodega');
    expect(qs('sesion-indicador').textContent).toContain('CC-BOD · Bodega');
  });

  it('asocia el error al campo y lo limpia al escribir', () => {
    ingresar('desconocido@example.com');

    expect(qs('login-email-error').hidden).toBe(false);
    expect(qs('login-email-error').textContent).toContain('correo');
    expect(qs('login-email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(qs('login-email'));

    qs('login-email').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('login-email-error').hidden).toBe(true);
    expect(qs('login-email').hasAttribute('aria-invalid')).toBe(false);
  });

  it('permite la vista de rol solo a administrador TI', () => {
    ingresar('admin.ti@example.com');
    expect(qs('admin-rol-control').hidden).toBe(false);
    expect(qs('sesion-indicador').textContent).toContain('Administrador TI');
    expect(qs('sesion-indicador').textContent).toContain('CC-COM · Compras');
  });

  it('muestra los registros semilla en las diez vistas desde el inicio', () => {
    ingresar('admin.ti@example.com');

    const conteos = {
      proveedores: 8,
      catalogo: 10,
      evaluaciones: 2,
      solicitudes: 10,
      ordenes: 8,
      recepciones: 5,
      facturas: 7,
      devoluciones: 2
    };
    for (const [vista, cantidad] of Object.entries(conteos)) {
      qs('compras-root').querySelector(`[data-tab="${vista}"]`).click();
      expect(qs('compras-content').querySelectorAll('tbody tr'), vista).toHaveLength(cantidad);
    }

    qs('compras-root').querySelector('[data-tab="cotizaciones"]').click();
    qs('cot-solicitud').value = 'sol-004';
    qs('cot-solicitud').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('compras-content').querySelectorAll('tbody tr')).toHaveLength(5);

    qs('compras-root').querySelector('[data-tab="panel"]').click();
    expect(qs('compras-content').textContent).toContain('Acciones rápidas');
  });
});
