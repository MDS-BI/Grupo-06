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

const VISTAS = [
  'panel',
  'proveedores',
  'solicitudes',
  'cotizaciones',
  'ordenes',
  'recepciones',
  'facturas',
  'devoluciones',
  'catalogo',
  'evaluaciones'
];

function activarAdmin() {
  const selector = qs('rol-activo');
  selector.value = 'admin_ti';
  selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function luminancia(hex) {
  const canales = [1, 3, 5]
    .map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16) / 255)
    .map((valor) => (valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(primero, segundo) {
  const [claro, oscuro] = [luminancia(primero), luminancia(segundo)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('accesibilidad del módulo de compras', () => {
  it('asocia una etiqueta legible a cada campo de las diez vistas', () => {
    activarAdmin();
    VISTAS.forEach((vista) => {
      qs('compras-root').querySelector(`[data-tab="${vista}"]`).click();
      const controles = [
        ...qs('compras-content').querySelectorAll('input:not([type="hidden"]), select, textarea')
      ];
      expect(controles.length, `vista ${vista}`).toBeGreaterThanOrEqual(0);
      controles.forEach((control) => {
        const etiquetado = control.labels?.length > 0 || control.getAttribute('aria-label');
        expect(etiquetado, `${vista}: ${control.id || control.className}`).toBeTruthy();
      });
    });
  });

  it('permite enfocar los controles con teclado y muestra el indicador de foco', () => {
    activarAdmin();
    qs('compras-root').querySelector('[data-tab="proveedores"]').click();
    const boton = qs('prov-nuevo');
    boton.focus();
    expect(document.activeElement).toBe(boton);
    const controles = [
      ...qs('compras-content').querySelectorAll('button, input, select, textarea')
    ].filter((control) => !control.disabled);
    controles.forEach((control) => {
      expect(control.getAttribute('tabindex'), control.id || control.className).not.toBe('-1');
    });
    const css = fs.readFileSync(
      fileURLToPath(new URL('../../../src/styles.css', import.meta.url)),
      'utf8'
    );
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:/);
  });

  it('muestra el error de validación junto al campo afectado', () => {
    activarAdmin();
    qs('compras-root').querySelector('[data-tab="proveedores"]').click();
    qs('prov-nuevo').click();
    qs('prov-razon').value = 'Proveedor Prueba SpA';
    qs('prov-tipo').value = 'jurídica';
    qs('prov-giro').value = 'Servicios';
    qs('prov-region').value = 'Metropolitana';
    qs('prov-dias').value = '30';
    qs('prov-rut').value = '1-1';
    qs('prov-form').dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true })
    );

    const error = qs('compras-content').querySelector('.campo-error');
    expect(error).toBeTruthy();
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toMatch(/RUT/);
    expect(error.previousElementSibling).toBe(qs('prov-rut'));
    expect(qs('prov-rut').getAttribute('aria-invalid')).toBe('true');
    expect(qs('prov-rut').getAttribute('aria-describedby')).toBe(error.id);
  });

  it('cumple el contraste mínimo de 4,5:1 en texto normal', () => {
    const css = fs.readFileSync(
      fileURLToPath(new URL('../../../src/styles.css', import.meta.url)),
      'utf8'
    );
    const tokens = Object.fromEntries(
      [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]])
    );
    expect(contraste(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tokens.muted, tokens.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tokens.muted, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tokens.danger, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    const alerta = css.match(/\.badge-enviada[^}]*color:\s*(#[0-9a-f]{6})/i)[1];
    const fondo = css
      .match(/\.badge-enviada[^}]*background:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/i)
      .slice(1)
      .map(Number);
    const mezclado =
      '#' +
      [0, 1, 2]
        .map((i) => Math.round(fondo[i] * fondo[3] + 255 * (1 - fondo[3])).toString(16).padStart(2, '0'))
        .join('');
    expect(contraste(alerta, mezclado)).toBeGreaterThanOrEqual(4.5);
  });
});
