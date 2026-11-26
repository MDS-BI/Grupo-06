import { describe, expect, it } from 'vitest';

import semilla from '../../../src/compras/semilla.json';
import { formatearRut, normalizarRut, validarRut } from '../../../src/compras/reglas.js';
import { RUT_OCULTO, rutEmpleadoVisible } from '../../../src/compras/visibilidad.js';

/** Roles que debe cubrir el padrón semilla: dos solicitantes, dos bodegas y dos jefaturas. */
const ROLES_ESPERADOS = [
  'solicitante',
  'solicitante',
  'comprador',
  'jefe_compras',
  'bodega',
  'bodega',
  'admin_ti',
  'jefe_compras'
];

describe('padrón de usuarios (FR-043)', () => {
  it('contiene exactamente ocho identidades con nombre propio, RUT Módulo 11 y correo corporativo', () => {
    expect(semilla.usuarios).toHaveLength(8);
    expect(new Set(semilla.usuarios.map((u) => u.id)).size).toBe(8);
    expect(semilla.usuarios.map((u) => u.rol).sort()).toEqual([...ROLES_ESPERADOS].sort());
    for (const usuario of semilla.usuarios) {
      expect(usuario.nombre.trim().length, usuario.id).toBeGreaterThan(0);
      expect(usuario.email, usuario.id).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      // Los usuarios del ERP usan el dominio corporativo, no dominios de ejemplo.
      expect(usuario.email.toLowerCase(), usuario.id).not.toMatch(/@example\.(com|org|net)$/);
      expect(validarRut(usuario.rut), usuario.rut).toBe(true);
      expect(usuario.activo).toBe(true);
    }
  });

  it('no repite correos ni RUT entre los ocho usuarios', () => {
    const correos = semilla.usuarios.map((u) => u.email.toLowerCase());
    const ruts = semilla.usuarios.map((u) => normalizarRut(u.rut));
    expect(new Set(correos).size).toBe(correos.length);
    expect(new Set(ruts).size).toBe(ruts.length);
  });

  it('normaliza y formatea el RUT sin alterar el dígito verificador', () => {
    const rut = '18123456-3';
    expect(normalizarRut('18.123.456-3')).toBe(rut);
    expect(formatearRut(rut)).toBe('18.123.456-3');
    expect(validarRut('18.123.456-4')).toBe(false);
  });

  it('solo expone el RUT completo a administración TI o al propio titular', () => {
    const empleado = semilla.usuarios[0];
    expect(rutEmpleadoVisible(empleado, { rol: 'admin_ti', id: 'u-admin-1' }, 'listado')).toBe(
      empleado.rut
    );
    expect(rutEmpleadoVisible(empleado, { rol: 'admin_ti', id: empleado.id }, 'listado')).toBe(
      empleado.rut
    );
    expect(rutEmpleadoVisible(empleado, { rol: 'comprador', id: 'u-comprador-1' }, 'listado')).toBe(
      RUT_OCULTO
    );
  });
});
