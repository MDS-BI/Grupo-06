import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);

const TODAS = [
  'panel',
  'proveedores',
  'catalogo',
  'evaluaciones',
  'solicitudes',
  'cotizaciones',
  'ordenes',
  'recepciones',
  'facturas',
  'devoluciones'
];

const VISIBLES_POR_ROL = {
  solicitante: ['panel', 'catalogo', 'solicitudes', 'ordenes', 'recepciones'],
  comprador: TODAS,
  jefe_compras: TODAS,
  bodega: ['panel', 'solicitudes', 'ordenes', 'recepciones', 'devoluciones'],
  admin_ti: TODAS
};

const NOMBRES_POR_ROL = {
  solicitante: 'Ana Pérez',
  comprador: 'Carla Díaz',
  jefe_compras: 'Marcela Rojas',
  bodega: '',
  admin_ti: ''
};

let dom;

function qs(id) {
  return document.getElementById(id);
}

function tabsVisibles() {
  return [...document.querySelectorAll('.side-nav [data-nav-tab]')].map(
    (b) => b.dataset.navTab
  );
}

function abrirVista(id) {
  const boton = document.querySelector(`.side-nav [data-nav-tab="${id}"]`);
  expect(boton, `vista ${id}`).toBeTruthy();
  boton.click();
}

async function preparar(rol) {
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
  const helpers = await import('./helpers.js');
  helpers.iniciarSesionPorRol(rol, NOMBRES_POR_ROL[rol]);
  const { boot } = await import('../../../src/app.js');
  await boot();
  return { almacenamiento, helpers };
}

afterEach(() => {
  dom?.window.close();
});

describe('permisos y visibilidad por rol', () => {
  it('muestra en la barra lateral solo las vistas permitidas para cada rol', async () => {
    for (const rol of Object.keys(VISIBLES_POR_ROL)) {
      await preparar(rol);
      const laterales = [...document.querySelectorAll('.side-nav [data-nav-tab]')].map(
        (b) => b.dataset.navTab
      );
      expect(laterales, rol).toEqual(VISIBLES_POR_ROL[rol]);
      expect(tabsVisibles(), rol).toEqual(VISIBLES_POR_ROL[rol]);
      dom.window.close();
    }
  });

  it('muestra botones de operación solo a los roles que pueden operar cada vista', async () => {
    const { almacenamiento } = await preparar('bodega');
    const solicitudes = almacenamiento.leer('solicitudes');
    solicitudes.push({
      ...solicitudes[0],
      id: 'sol-propia-bodega',
      numero: 'SC-PROPIA-BODEGA',
      solicitante_id: 'u-bodega-1',
      estado: 'borrador'
    });
    almacenamiento.guardar('solicitudes', solicitudes);
    abrirVista('solicitudes');
    expect(qs('sol-nuevo')).toBeTruthy();
    expect(qs('compras-content').querySelector('[data-sol-accion="aprobar"]')).toBeNull();
    expect(qs('compras-content').querySelector('[data-sol-accion="cotizar"]')).toBeNull();
    const filas = [...qs('compras-content').querySelectorAll('tbody tr')];
    expect(filas.length).toBe(1);
    expect(filas[0].textContent).toContain('SC-PROPIA-BODEGA');
    expect(qs('compras-content').textContent).not.toContain('Ana Pérez');
  });

  it('admin_ti edita solo datos bancarios y no gestiona proveedores', async () => {
    await preparar('admin_ti');
    abrirVista('proveedores');
    expect(qs('prov-nuevo')).toBeNull();
    expect(qs('compras-content').querySelector('[data-prov-accion="editar"]')).toBeNull();
    expect(qs('compras-content').querySelector('[data-prov-accion="desbloquear"]')).toBeTruthy();
    expect(qs('prov-banco-form')).toBeTruthy();
  });

  it('comprador gestiona proveedores pero no edita datos bancarios', async () => {
    await preparar('comprador');
    abrirVista('proveedores');
    expect(qs('prov-nuevo')).toBeTruthy();
    expect(qs('prov-banco-form')).toBeNull();
    expect(qs('compras-content').querySelector('[data-prov-accion="editar"]')).toBeTruthy();
  });

  it('jefe_compras ve facturas en solo lectura para conciliación y registro', async () => {
    await preparar('jefe_compras');
    abrirVista('facturas');
    expect(qs('fac-form')).toBeNull();
    expect(qs('compras-content').querySelector('[data-fac-accion="conciliar"]')).toBeNull();
    expect(qs('compras-content').querySelector('[data-fac-accion="rechazar"]')).toBeNull();
    expect(qs('fac-exportar')).toBeTruthy();
  });

  it('filtra OC y recepciones del solicitante en tabla y CSV', async () => {
    const { almacenamiento } = await preparar('solicitante');
    const ordenes = almacenamiento.leer('ordenes');
    ordenes.push(
      {
        ...ordenes[0],
        id: 'oc-propia',
        numero: 'OC-PROPIA',
        solicitud_id: 'sol-001'
      },
      {
        ...ordenes[0],
        id: 'oc-ajena',
        numero: 'OC-AJENA',
        solicitud_id: 'sol-003'
      }
    );
    almacenamiento.guardar('ordenes', ordenes);
    const recepciones = almacenamiento.leer('recepciones');
    recepciones.push(
      { ...recepciones[0], id: 'rec-propia', numero: 'REC-PROPIA', orden_id: 'oc-propia' },
      { ...recepciones[0], id: 'rec-ajena', numero: 'REC-AJENA', orden_id: 'oc-ajena' }
    );
    almacenamiento.guardar('recepciones', recepciones);

    abrirVista('ordenes');
    expect(qs('compras-content').textContent).toContain('OC-PROPIA');
    expect(qs('compras-content').textContent).not.toContain('OC-AJENA');
    abrirVista('recepciones');
    expect(qs('compras-content').textContent).toContain('REC-PROPIA');
    expect(qs('compras-content').textContent).not.toContain('REC-AJENA');

    const { exportarOrdenes, exportarRecepciones } = await import(
      '../../../src/compras/exportacion.js'
    );
    const usuario = almacenamiento.getUsuarioActivo();
    const csvOrdenes = exportarOrdenes({ descargar: false, usuario });
    const csvRecepciones = exportarRecepciones({ descargar: false, usuario });
    expect(csvOrdenes).toContain('OC-PROPIA');
    expect(csvOrdenes).not.toContain('OC-AJENA');
    expect(csvRecepciones).toContain('REC-PROPIA');
    expect(csvRecepciones).not.toContain('REC-AJENA');
  });

  it('aplica el mismo filtro de solicitudes propias al CSV de bodega', async () => {
    const { almacenamiento } = await preparar('bodega');
    const solicitudes = almacenamiento.leer('solicitudes');
    solicitudes.push({
      ...solicitudes[0],
      id: 'sol-propia-bodega',
      numero: 'SC-PROPIA-BODEGA',
      solicitante_id: 'u-bodega-1'
    });
    almacenamiento.guardar('solicitudes', solicitudes);
    const { exportarSolicitudes } = await import('../../../src/compras/exportacion.js');
    const csv = exportarSolicitudes(almacenamiento.getUsuarioActivo(), { descargar: false });
    expect(csv).toContain('SC-PROPIA-BODEGA');
    expect(csv).not.toContain('SC-2026-0002');
  });

  it('bloquea enlaces internos a vistas no visibles', async () => {
    await preparar('bodega');
    const intruso = document.createElement('button');
    intruso.type = 'button';
    intruso.dataset.ir = 'proveedores';
    intruso.textContent = 'Intruso';
    qs('compras-content').appendChild(intruso);
    intruso.click();
    expect(qs('compras-aviso').textContent).toBe('Tu rol no tiene acceso a esta vista');
    expect(qs('compras-aviso').hidden).toBe(false);
    expect(qs('compras-titulo').textContent).toBe('Panel');
  });

  it('muestra el historial solo a roles con permiso y el botón de exportación solo a admin_ti', async () => {
    await preparar('comprador');
    abrirVista('solicitudes');
    qs('compras-content').querySelector('[data-traza="solicitud"]').click();
    expect(qs('compras-traza').textContent).not.toContain('Historial de cambios');
    expect(qs('traza-exportar')).toBeNull();
  });

  it('jefe_compras consulta el historial sin exportarlo', async () => {
    await preparar('jefe_compras');
    abrirVista('solicitudes');
    qs('compras-content').querySelector('[data-traza="solicitud"]').click();
    expect(qs('compras-traza').textContent).toContain('Historial de cambios');
    expect(qs('traza-exportar')).toBeNull();
  });

  it('admin_ti consulta y exporta el historial', async () => {
    await preparar('admin_ti');
    abrirVista('solicitudes');
    qs('compras-content').querySelector('[data-traza="solicitud"]').click();
    expect(qs('compras-traza').textContent).toContain('Historial de cambios');
    expect(qs('traza-exportar')).toBeTruthy();
  });

  it('muestra el encabezado Grupo › Vista y nunca la tarjeta de sesión', async () => {
    await preparar('bodega');
    expect(qs('compras-titulo').textContent).toBe('Panel');
    abrirVista('solicitudes');
    expect(qs('compras-titulo').textContent).toBe('Solicitudes');
    expect(qs('compras-root').querySelector('.compras-seccion').textContent).toBe(
      'Compras › Solicitudes'
    );
    expect(qs('compras-root').textContent).not.toContain('Sesión activa');
  });
});
