import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

const RECHAZO_DOMINIO =
  'Solo estoy autorizado para asistir en operaciones y consultas del módulo de Adquisiciones y Compras del ERP.';

let dom;

function qs(id) {
  return document.getElementById(id);
}

function ingresar(email) {
  qs('login-rol').value = '';
  qs('login-email').value = email;
  qs('login-clave').value = 'Compras2026';
  qs('login-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
}

function abrirAsistenteDesdeTarjeta() {
  const tarjeta = qs('compras-content').querySelector('[data-accion="asistente-ia"]');
  tarjeta.click();
  return qs('asistente-overlay');
}

function enviar(texto) {
  qs('asistente-input').value = texto;
  qs('asistente-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
}

function mensajes() {
  return [...qs('asistente-mensajes').querySelectorAll('.asistente-mensaje')];
}

function ultimoMensaje() {
  return mensajes().at(-1).textContent;
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

describe('asistente IA de compras', () => {
  it('muestra la tarjeta al final de acciones rápidas con el estilo de las demás', () => {
    ingresar('ana.perez@example.com');
    const tarjetas = [...qs('compras-content').querySelectorAll('.action-grid .action-card')];
    const asistente = tarjetas.at(-1);

    expect(asistente).toBeTruthy();
    expect(asistente.classList.contains('action-card')).toBe(true);
    expect(asistente.classList.contains('action-card--asistente')).toBe(true);
    expect(asistente.textContent).toContain('Asistente IA de Compras');
    expect(asistente.textContent).toContain(
      'Consulta estados y ejecuta acciones permitidas según tu rol.'
    );
    expect(asistente.querySelector('.action-card-badge').textContent).toBe('IA Corporativa');
    expect(asistente.querySelector('.action-card-icon svg')).toBeTruthy();
    expect(asistente.querySelector('.action-card-icon svg').getAttribute('aria-hidden')).toBe(
      'true'
    );
  });

  it('abre un drawer fuera del root con identidad, modo restringido y 3 chips del rol', () => {
    ingresar('jefe.compras@example.com');
    const overlay = abrirAsistenteDesdeTarjeta();

    expect(overlay.hidden).toBe(false);
    expect(qs('compras-root').contains(overlay)).toBe(false);
    expect(qs('asistente-sesion').textContent).toContain('Marcela Rojas');
    expect(qs('asistente-sesion').textContent).toContain('Jefe de Compras');
    expect(qs('asistente-sesion').textContent).toContain('CC-COM · Compras');
    expect(qs('asistente-overlay').textContent).toContain(
      'Modo Restringido por Rol · Solo ERP'
    );
    const chips = [...qs('asistente-sugerencias').querySelectorAll('button')];
    expect(chips).toHaveLength(3);
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Ver solicitudes por aprobar',
      'Revisar facturas con discrepancia',
      'Resumen de monto comprometido'
    ]);
  });

  it('rechaza consultas fuera del dominio con el mensaje estándar exacto', async () => {
    const { responder } = await import('../../../src/compras/asistente.js');
    expect(responder('¿Cómo está el clima en Santiago?').texto).toBe(RECHAZO_DOMINIO);
    expect(responder('Cuéntame un chiste').texto).toBe(RECHAZO_DOMINIO);

    ingresar('ana.perez@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('¿Y si jugamos fútbol?');
    expect(ultimoMensaje()).toContain(RECHAZO_DOMINIO);
  });

  it('responde el estado de un documento real por número', () => {
    ingresar('jefe.compras@example.com');
    abrirAsistenteDesdeTarjeta();

    enviar('Estado de SC-2026-0002');
    expect(ultimoMensaje()).toContain('Solicitud SC-2026-0002');
    expect(ultimoMensaje()).toContain('enviada');

    enviar('Detalle de OC-2026-0001');
    expect(ultimoMensaje()).toContain('Orden de compra');
    expect(ultimoMensaje()).toContain('OC-2026-0001');
  });

  it('deniega acciones no permitidas por rol y registra el intento en trazabilidad', async () => {
    ingresar('ana.perez@example.com');
    abrirAsistenteDesdeTarjeta();

    enviar('Aprueba la factura 1004');
    expect(ultimoMensaje()).toContain('No puedes aprobar facturas para pago');
    expect(ultimoMensaje()).toContain('Jefe de Compras');

    enviar('Emite una orden de compra');
    expect(ultimoMensaje()).toContain('No puedes emitir órdenes de compra');
    expect(ultimoMensaje()).toContain('Comprador');

    const { leer } = await import('../../../src/compras/almacenamiento.js');
    const intentos = leer('trazabilidad').filter(
      (evento) => evento.entidad === 'asistente' && evento.accion === 'intento_denegado'
    );
    expect(intentos).toHaveLength(2);
    expect(intentos.map((evento) => evento.entidad_id).sort()).toEqual([
      'aprobar_pago',
      'emitir_oc'
    ]);
  });

  it('aplica enmascaramiento bancario: comprador denegado, admin TI ve la cuenta completa', () => {
    ingresar('carla.diaz@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('Ver cuentas bancarias completas');
    expect(ultimoMensaje()).toContain('No puedes ver cuentas bancarias completas');
    expect(ultimoMensaje()).not.toContain('123456789');

    qs('btn-logout').click();
    ingresar('admin.ti@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('Ver cuentas bancarias completas');
    expect(ultimoMensaje()).toContain('123456789');
  });

  it('prepara una solicitud y solo la crea tras confirmar la acción', async () => {
    ingresar('ana.perez@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('Crear solicitud de 3 Notebooks P-001 para Administración');

    expect(ultimoMensaje()).toContain('Preparé un borrador');
    expect(ultimoMensaje()).toContain('Administración');
    const confirmar = qs('asistente-mensajes').querySelector('[data-confirmar]');
    expect(confirmar).toBeTruthy();
    expect(confirmar.textContent).toBe('Confirmar acción');
    expect(qs('asistente-mensajes').querySelector('[data-cancelar]').textContent).toBe('Cancelar');

    const { leer } = await import('../../../src/compras/almacenamiento.js');
    const antes = leer('solicitudes').length;
    confirmar.click();

    expect(ultimoMensaje()).toContain('creada en estado «borrador»');
    expect(leer('solicitudes')).toHaveLength(antes + 1);
    const creada = leer('solicitudes').at(-1);
    expect(creada.centro_costo_id).toBe('cc-001');
    expect(creada.lineas[0].producto_id).toBe('prod-001');
    expect(creada.lineas[0].cantidad).toBe(3);
    expect(qs('asistente-mensajes').querySelector('[data-confirmar]')).toBeNull();
  });

  it('cancela una acción sin escribir datos', async () => {
    ingresar('ana.perez@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('Crear solicitud de 2 Notebooks P-001 para Administración');
    qs('asistente-mensajes').querySelector('[data-cancelar]').click();

    expect(ultimoMensaje()).toContain('Acción cancelada. No se realizaron cambios.');
    const { leer } = await import('../../../src/compras/almacenamiento.js');
    expect(leer('solicitudes')).toHaveLength(10);
  });

  it('limpia la conversación y conserva solo el saludo', () => {
    ingresar('bodega@example.com');
    abrirAsistenteDesdeTarjeta();
    enviar('¿Qué tengo pendiente hoy?');
    expect(mensajes().length).toBeGreaterThan(2);

    qs('asistente-limpiar').click();
    expect(mensajes()).toHaveLength(1);
    expect(ultimoMensaje()).toContain('Estoy listo para ayudarte');
  });

  it('cierra el drawer con Escape y devuelve el foco', () => {
    ingresar('ana.perez@example.com');
    const tarjeta = qs('compras-content').querySelector('[data-accion="asistente-ia"]');
    tarjeta.focus();
    tarjeta.click();

    qs('asistente-input').dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(qs('asistente-overlay').hidden).toBe(true);
    expect(document.activeElement).toBe(tarjeta);
  });
});
