import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { crearProveedor } from '../../../src/compras/proveedores.js';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

let dom;

function qs(id) {
  return document.getElementById(id);
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

describe('vista de compras', () => {
  it('abre el módulo desde la navegación y muestra el panel', () => {
    qs('nav-compras').click();
    expect(qs('view-compras').hidden).toBe(false);
    expect(qs('compras-root').textContent).toContain('Adquisiciones y Compras');
    expect(document.querySelector('.topbar-rol label').textContent).toBe('Rol Activo');
    expect(qs('rol-activo').value).toBe('solicitante');
    expect(qs('compras-root').querySelectorAll('[data-tab]').length).toBe(10);
  });

  it('muestra etiquetas legibles para los roles sin cambiar sus valores', () => {
    const esperado = [
      ['solicitante', 'Solicitante'],
      ['comprador', 'Comprador'],
      ['jefe_compras', 'Jefe de Compras'],
      ['bodega', 'Encargado de Bodega'],
      ['admin_ti', 'Administrador TI']
    ];
    expect([...qs('rol-activo').options].map((opcion) => [opcion.value, opcion.textContent])).toEqual(
      esperado
    );

    const selector = qs('rol-activo');
    selector.value = 'jefe_compras';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const sesion = qs('compras-root').querySelector('.compras-session').textContent;
    expect(sesion).toContain('Jefe de Compras');
    expect(sesion).not.toContain('Marta Ruiz');
    expect(sesion).not.toContain('jefe_compras');
  });

  it('navega entre las pestañas de compras', () => {
    qs('nav-compras').click();

    qs('compras-root').querySelector('[data-tab="proveedores"]').click();
    expect(qs('compras-content').textContent).toContain('Proveedores');
    expect(qs('compras-content').querySelectorAll('tbody tr').length).toBe(8);

    qs('compras-root').querySelector('[data-tab="solicitudes"]').click();
    expect(qs('compras-content').textContent).toContain('Solicitudes');
    expect(qs('compras-content').querySelectorAll('tbody tr').length).toBeGreaterThan(0);

    qs('compras-root').querySelector('[data-tab="panel"]').click();
    expect(qs('compras-content').textContent).toContain('Acciones rápidas');
  });

  it('cambia el rol activo y vuelve a renderizar', () => {
    qs('nav-compras').click();
    const selector = qs('rol-activo');
    selector.value = 'admin_ti';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('rol-activo').value).toBe('admin_ti');
    expect(qs('compras-content').textContent).toContain('Pendientes por rol');
  });

  it('muestra u oculta la cuenta bancaria al cambiar el rol activo', () => {
    qs('nav-compras').click();
    qs('compras-root').querySelector('[data-tab="proveedores"]').click();
    const selector = qs('rol-activo');

    selector.value = 'jefe_compras';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('compras-content').textContent).toContain('555444333');
    expect(qs('compras-content').textContent).not.toContain('****4333');
    expect(qs('prov-visibilidad').textContent).toContain('visibles para tu rol');

    selector.value = 'comprador';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('compras-content').textContent).toContain('****4333');
    expect(qs('compras-content').textContent).not.toContain('555444333');
    expect(qs('prov-visibilidad').textContent).toContain('enmascarados para tu rol');
  });

  it('enmascara RUT y cuenta y muestra "No registrado" en la tabla de proveedores', () => {
    qs('nav-compras').click();
    const selector = qs('rol-activo');
    selector.value = 'comprador';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('compras-root').querySelector('[data-tab="proveedores"]').click();

    const texto = qs('compras-content').textContent;
    expect(texto).toContain('98.***.***-3');
    expect(texto).toContain('****4333');
    expect(texto).not.toContain('9.876.543-3');
    expect(texto).not.toContain('555444333');

    crearProveedor(
      {
        razon_social: 'Proveedor Sin Cuenta SpA',
        rut: '76.543.210-3',
        tipo_persona: 'jurídica',
        giro: 'Servicios',
        region: 'Metropolitana',
        condicion_pago_dias: 30
      },
      { id: 'u-admin-1', rol: 'admin_ti' }
    );
    selector.value = 'admin_ti';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('compras-root').querySelector('[data-tab="proveedores"]').click();

    expect(qs('compras-content').textContent).toContain('No registrado');
  });

  it('abre la cadena documental y el historial desde una solicitud', () => {
    qs('nav-compras').click();
    qs('compras-root').querySelector('[data-tab="solicitudes"]').click();

    const boton = qs('compras-content').querySelector('[data-traza="solicitud"]');
    expect(boton).toBeTruthy();
    boton.click();

    const card = qs('compras-traza');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Cadena documental y trazabilidad');
    expect(card.querySelectorAll('.traza-cadena li').length).toBeGreaterThan(0);

    qs('traza-cerrar').click();
    expect(qs('compras-traza')).toBeNull();
  });
});
