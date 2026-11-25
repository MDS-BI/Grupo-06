import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { USUARIOS } from './helpers.js';

const html = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8'
);
const CLAVE_AUDITORIA = 'erp_compras:auditoria_forense';

let dom;
let modulos;

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

  const almacenamiento = await import('../../../src/compras/almacenamiento.js');
  almacenamiento.cargarSemilla({ forzar: true });
  const { iniciarSesionConIdentificador, CLAVE_DEMO } = await import(
    '../../../src/compras/autenticacion.js'
  );
  expect(iniciarSesionConIdentificador('admin.ti@pyme.cl', CLAVE_DEMO).ok).toBe(true);
  modulos = {
    almacenamiento,
    auditoria: await import('../../../src/compras/auditoria.js'),
    administracion: await import('../../../src/compras/administracion.js'),
    gobernanza: await import('../../../src/compras/gobernanza.js'),
    proveedores: await import('../../../src/compras/proveedores.js'),
    boot: (await import('../../../src/app.js')).boot
  };
  await modulos.boot();
});

afterEach(() => {
  dom?.window.close();
});

/** Obtiene un token OTP válido para el contexto y titular indicados. */
function tokenPara(contexto, usuario_id = 'u-admin-1') {
  const { solicitarOtp, validarOtp } = modulos.gobernanza;
  const solicitud = solicitarOtp({ usuario_id, actor_id: 'u-admin-1', contexto });
  const resultado = validarOtp(solicitud.solicitud.id, solicitud.codigo);
  expect(resultado.ok).toBe(true);
  return resultado.token;
}

describe('Log de Auditoría Forense (FR-045)', () => {
  it('registra los seis datos obligatorios y conserva la cadena de integridad', () => {
    const { listarEventosForenses, registrarEventoForense, verificarIntegridadAuditoria } =
      modulos.auditoria;
    const evento = registrarEventoForense({
      actor: 'u-admin-1',
      usuario_afectado: 'u-solicitante-1',
      tipo_evento: 'edicion_usuario',
      campos_modificados: 'nombre: Camila Rojas Soto → Camila Rojas Actualizada',
      otp_validado: true,
      timestamp: '2026-11-25T10:00:00.000Z'
    });

    expect(evento.actor).toBe('u-admin-1');
    expect(evento.usuario_afectado).toBe('u-solicitante-1');
    expect(evento.tipo_evento).toBe('edicion_usuario');
    expect(evento.campos_modificados).toContain('→');
    expect(evento.otp_validado).toBe(true);
    expect(evento.timestamp).toBe('2026-11-25T10:00:00.000Z');
    expect(evento.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(listarEventosForenses()).toHaveLength(1);
    expect(verificarIntegridadAuditoria()).toBe(true);
  });

  it('detecta una alteración manual del historial', () => {
    const { registrarEventoForense, verificarIntegridadAuditoria } = modulos.auditoria;
    registrarEventoForense({ actor: 'u-admin-1', tipo_evento: 'cambio_parametro' });
    const eventos = JSON.parse(localStorage.getItem(CLAVE_AUDITORIA));
    eventos[0].campos_modificados = 'valor manipulado';
    localStorage.setItem(CLAVE_AUDITORIA, JSON.stringify(eventos));
    expect(verificarIntegridadAuditoria()).toBe(false);
  });

  it('registra edición, suspensión, parámetros y desbloqueo con OTP validado', () => {
    const { cambiarEstadoUsuario, cambiarParametros, desbloquearExcepcion, editarUsuario } =
      modulos.administracion;
    const { listarEventosForenses, verificarIntegridadAuditoria } = modulos.auditoria;

    editarUsuario({
      id: 'u-solicitante-1',
      cambios: { nombre: 'Camila Rojas Actualizada' },
      token: tokenPara('edicion_usuario', 'u-solicitante-1')
    });
    cambiarEstadoUsuario({
      id: 'u-solicitante-2',
      suspendido: true,
      token: tokenPara('suspension_usuario', 'u-solicitante-2')
    });
    cambiarParametros({
      cambios: { umbralCotizaciones: 750000 },
      token: tokenPara('cambio_parametro')
    });

    const aprobado = modulos.proveedores.listarProveedores().find(
      (p) => p.estado_proveedor === 'aprobado'
    );
    expect(aprobado).toBeTruthy();
    modulos.proveedores.cambiarEstadoProveedor(aprobado.id, 'bloqueado', {
      id: 'u-comprador-1',
      rol: 'comprador'
    });
    desbloquearExcepcion({ id: aprobado.id, token: tokenPara('desbloqueo_excepcion') });

    const eventos = listarEventosForenses();
    expect(eventos.map((e) => e.tipo_evento)).toEqual([
      'edicion_usuario',
      'suspension',
      'cambio_parametro',
      'desbloqueo_excepcion'
    ]);
    expect(eventos.every((e) => e.otp_validado === true)).toBe(true);
    expect(eventos.every((e) => Boolean(e.actor && e.timestamp && e.hash))).toBe(true);
    expect(
      listarEventosForenses({ tipo_evento: 'suspension', usuario_afectado: 'u-solicitante-2' })
    ).toHaveLength(1);
    expect(verificarIntegridadAuditoria()).toBe(true);
  });

  it('mantiene el historial aun cuando se suspende al usuario afectado', () => {
    const { cambiarEstadoUsuario } = modulos.administracion;
    const { listarEventosForenses, registrarEventoForense } = modulos.auditoria;
    registrarEventoForense({
      actor: 'u-admin-1',
      usuario_afectado: 'u-solicitante-1',
      tipo_evento: 'edicion_usuario',
      campos_modificados: 'nombre: anterior → nuevo',
      otp_validado: true
    });
    cambiarEstadoUsuario({
      id: 'u-solicitante-1',
      suspendido: true,
      token: tokenPara('suspension_usuario', 'u-solicitante-1')
    });
    expect(listarEventosForenses({ usuario_afectado: 'u-solicitante-1' })).toHaveLength(2);
  });

  it('exporta el log a CSV con las columnas forenses y respeta los permisos', () => {
    const { exportarAuditoriaForense, registrarEventoForense } = modulos.auditoria;
    registrarEventoForense({
      actor: 'u-admin-1',
      usuario_afectado: 'u-solicitante-1',
      tipo_evento: 'edicion_usuario',
      campos_modificados: 'rut: ••••••••-• → 18.123.456-3',
      otp_validado: true
    });
    const csv = exportarAuditoriaForense({ descargar: false });
    expect(csv).toContain('Timestamp;Actor;Usuario afectado;Tipo de evento');
    expect(csv).toContain('OTP validado;Hash de integridad');
    expect(csv).toContain('edicion_usuario');
    expect(exportarAuditoriaForense({ descargar: false, filtro: 'no-coincide' })).not.toContain(
      'edicion_usuario'
    );

    const { exigirPermiso } = modulos.almacenamiento;
    expect(() =>
      exigirPermiso('consultar_auditoria_forense', { id: 'u-comprador-1', rol: 'comprador' })
    ).toThrow();
    expect(() =>
      exigirPermiso('consultar_auditoria_forense', { id: 'u-admin-1', rol: 'admin_ti' })
    ).not.toThrow();
    expect(qs('admin-auditoria')).toBeTruthy();
  });

  it('muestra el log forense solo en el panel de administración TI', async () => {
    qs('btn-logout').click();
    const { iniciarSesion } = await import('../../../src/compras/autenticacion.js');
    iniciarSesion('jefe_compras', USUARIOS.jefe.nombre, 'Compras2026');
    await modulos.boot();
    expect(qs('admin-auditoria')).toBeNull();
    expect(qs('padron-usuarios')).toBeNull();
  });
});
