import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consumirToken,
  listarNotificaciones,
  guardarModo,
  listarSolicitudesOtp,
  obtenerModo,
  reiniciarGobernanza,
  solicitarOtp,
  validarOtp,
  validarToken
} from '../../../src/compras/gobernanza.js';

const INICIO = new Date('2026-11-25T10:00:00.000Z');

function instalarAlmacenamiento() {
  const store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (clave) => (store.has(clave) ? store.get(clave) : null),
    setItem: (clave, valor) => store.set(clave, String(valor)),
    removeItem: (clave) => store.delete(clave),
    clear: () => store.clear()
  });
  return store;
}

beforeEach(() => {
  instalarAlmacenamiento();
  reiniciarGobernanza();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('autorización OTP del titular (FR-044)', () => {
  it('genera un código de seis dígitos, una notificación y expiración de cinco minutos', () => {
    const resultado = solicitarOtp({
      usuario_id: 'u-solicitante-1',
      actor_id: 'u-admin-1',
      campos: ['nombre', 'rut'],
      contexto: 'edicion_usuario',
      ahora: INICIO
    });

    expect(resultado.codigo).toMatch(/^\d{6}$/);
    expect(resultado.solicitud.id_usuario).toBe('u-solicitante-1');
    expect(resultado.solicitud.campos_solicitados).toEqual(['nombre', 'rut']);
    expect(new Date(resultado.solicitud.expira_en).getTime()).toBe(
      INICIO.getTime() + 5 * 60 * 1000
    );
    expect(resultado.notificacion.id_destinatario).toBe('u-solicitante-1');
    expect(resultado.notificacion.codigo).toBe(resultado.codigo);
    expect(resultado.notificacion.mensaje).toContain(resultado.codigo);
    expect(listarNotificaciones('u-solicitante-1')).toHaveLength(1);
  });

  it('entrega la ayuda visual con el código solo en Modo Demo', () => {
    const demo = solicitarOtp({ usuario_id: 'u-admin-1', modo: 'demo', ahora: INICIO });
    expect(demo.ayudaDemo).toBe(demo.codigo);

    const real = solicitarOtp({ usuario_id: 'u-admin-1', modo: 'real', ahora: INICIO });
    expect(real.ayudaDemo).toBe('');
    expect(real.codigo).toMatch(/^\d{6}$/);
  });

  it('acepta un código vigente una sola vez y consume el token', () => {
    const { solicitud, codigo } = solicitarOtp({
      usuario_id: 'u-solicitante-1',
      contexto: 'edicion_usuario',
      ahora: INICIO
    });
    const validacion = validarOtp(solicitud.id, codigo, new Date(INICIO.getTime() + 1000));

    expect(validacion.ok).toBe(true);
    expect(validacion.token).toMatch(/^tok-/);
    const instante = new Date(INICIO.getTime() + 2000);
    expect(validarToken(validacion.token, instante)?.id).toBe(solicitud.id);
    expect(consumirToken(validacion.token, instante)).toBe(true);
    expect(validarToken(validacion.token, instante)).toBeNull();
    expect(consumirToken(validacion.token, instante)).toBe(false);
    expect(validarOtp(solicitud.id, codigo, INICIO).ok).toBe(false);
  });

  it('rechaza códigos erróneos, con formato inválido y después de tres intentos', () => {
    const { solicitud, codigo } = solicitarOtp({
      usuario_id: 'u-solicitante-1',
      ahora: INICIO
    });
    const incorrecto = String((Number(codigo) + 1) % 1000000).padStart(6, '0');

    expect(validarOtp(solicitud.id, '12345', INICIO).motivo).toContain('6 dígitos');
    for (let intento = 0; intento < 3; intento += 1) {
      const resultado = validarOtp(solicitud.id, incorrecto, INICIO);
      expect(resultado.ok).toBe(false);
      expect(resultado.motivo).toContain('incorrecto');
    }
    expect(validarOtp(solicitud.id, codigo, INICIO).motivo).toContain('Demasiados intentos');
    expect(listarSolicitudesOtp()[0].intentos).toBe(3);
  });

  it('rechaza un código expirado y marca la notificación como expirada', () => {
    const { solicitud, codigo } = solicitarOtp({
      usuario_id: 'u-solicitante-1',
      ahora: INICIO
    });
    const despues = new Date(INICIO.getTime() + 5 * 60 * 1000);
    const resultado = validarOtp(solicitud.id, codigo, despues);

    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toContain('expiró');
    expect(listarNotificaciones('u-solicitante-1')[0].estado).toBe('expirada');
    expect(validarOtp('otp-inexistente', codigo, INICIO).ok).toBe(false);
  });

  it('el modo de datos persiste y solo admite demo o real', () => {
    expect(obtenerModo()).toBe('demo');
    expect(guardarModo('real')).toBe('real');
    expect(obtenerModo()).toBe('real');
    expect(guardarModo('demo')).toBe('demo');
    expect(() => guardarModo('otro')).toThrow('demo o real');
    expect(obtenerModo()).toBe('demo');
  });
});
