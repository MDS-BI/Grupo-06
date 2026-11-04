import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

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
    expect(qs('view-dashboard').hidden).toBe(true);
    expect(qs('compras-root').textContent).toContain('Adquisiciones y Compras');
    expect(qs('compras-rol').value).toBe('solicitante');
    expect(qs('compras-root').querySelectorAll('[data-tab]').length).toBe(10);
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
    const selector = qs('compras-rol');
    selector.value = 'admin_ti';
    selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('compras-rol').value).toBe('admin_ti');
    expect(qs('compras-content').textContent).toContain('Pendientes por rol');
  });
});
