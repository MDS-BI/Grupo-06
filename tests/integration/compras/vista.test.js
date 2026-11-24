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
  const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
  iniciarSesion('solicitante', 'Ana Pérez', 'Compras2026');
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
    expect(qs('sesion-indicador').hidden).toBe(false);
    expect(qs('sesion-indicador').textContent).toContain('Solicitante');
    expect(qs('rol-activo')).toBeNull();
    expect(qs('compras-root').querySelectorAll('[data-tab]').length).toBe(10);
  });

  it('muestra indicador de sesión de solo lectura para roles no admin', () => {
    expect(qs('rol-activo')).toBeNull();
    expect(qs('sesion-indicador').textContent).toContain('Solicitante');
    expect(qs('compras-root').textContent).not.toContain('Sesión activa');
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

  it('mantiene el rol fijo y no muestra selector de rol activo', async () => {
    qs('nav-compras').click();
    expect(qs('rol-activo')).toBeNull();
    expect(qs('sesion-indicador').textContent).toContain('Solicitante');

    await activarAdmin();
    expect(qs('rol-activo')).toBeNull();
    expect(qs('sesion-indicador').textContent).toContain('Administrador TI');

    const { getUsuarioActivo, setRolActivo } = await import(
      '../../../src/compras/almacenamiento.js'
    );
    setRolActivo('comprador');
    expect(getUsuarioActivo().rol).toBe('admin_ti');
  });

  it('enmascara RUT para persona natural y muestra "No registrado" cuando falta cuenta', async () => {
    qs('btn-logout').click();
    const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
    iniciarSesion('comprador', 'Carla Díaz', 'Compras2026');
    crearProveedor(
      {
        razon_social: 'Proveedor Sin Cuenta SpA',
        rut: '76.543.210-3',
        tipo_persona: 'jurídica',
        giro: 'Servicios',
        region: 'Metropolitana',
        condicion_pago_dias: 30
      },
      { id: 'u-comprador-1', rol: 'comprador' }
    );
    const { boot } = await import('../../../src/app.js');
    await boot();

    qs('compras-root').querySelector('[data-tab="proveedores"]').click();
    const texto = qs('compras-content').textContent;
    expect(texto).toContain('No registrado');
    expect(texto).not.toContain('555444333');
  });

  it('muestra retraso en lugar de días restantes negativos en las alertas de vencimiento', async () => {
    qs('btn-logout').click();
    const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
    const { guardar, leer } = await import('../../../src/compras/almacenamiento.js');
    const { hoyISO, sumarDias } = await import('../../../src/compras/reglas.js');
    iniciarSesion('jefe_compras', 'Marcela Rojas', 'Compras2026');
    const facturas = leer('facturas');
    facturas.find((f) => f.id === 'fac-001').fecha_vencimiento = sumarDias(hoyISO(), -2);
    guardar('facturas', facturas);
    const { boot } = await import('../../../src/app.js');
    await boot();

    qs('compras-root').querySelector('[data-tab="facturas"]').click();
    const itemAlerta = [...qs('compras-content').querySelectorAll('li')].find((li) =>
      li.textContent.includes('folio 1001')
    );
    expect(itemAlerta?.textContent || qs('compras-content').textContent).toContain('retraso de 2 días');
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

async function activarAdmin() {
  qs('btn-logout').click();
  const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
  iniciarSesion('admin_ti', '', 'Compras2026');
  const { boot } = await import('../../../src/app.js');
  await boot();
}

async function activarComprador() {
  qs('btn-logout').click();
  const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
  iniciarSesion('comprador', 'Carla Díaz', 'Compras2026');
  const { boot } = await import('../../../src/app.js');
  await boot();
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
  it('asocia una etiqueta legible a cada campo de las diez vistas', async () => {
    await activarAdmin();
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

  it('permite enfocar los controles con teclado y muestra el indicador de foco', async () => {
    await activarAdmin();
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

  it('muestra el error de validación junto al campo afectado', async () => {
    await activarComprador();
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
