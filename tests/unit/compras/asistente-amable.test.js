import { describe, expect, it } from 'vitest';

import { mensajeNoPuedeAyudar, responder } from '../../../src/compras/asistente.js';

const usuario = {
  id: 'u-solicitante-1',
  nombre: 'Camila Rojas Soto',
  rol: 'solicitante'
};

describe('asistente amable', () => {
  it('responde un saludo con el nombre y rol del usuario', () => {
    const { texto } = responder('Hola', usuario);
    expect(texto).toContain('Camila Rojas Soto');
    expect(texto).toContain('Solicitante');
  });

  it('responde un agradecimiento', () => {
    const { texto } = responder('Gracias', usuario);
    expect(texto).toContain('Con gusto');
  });

  it('da ayuda con sugerencias del rol', () => {
    const { texto } = responder('ayuda', usuario);
    expect(texto).toContain('Camila Rojas Soto');
    expect(texto).toContain('pendiente');
  });

  it('rechaza fuera de alcance con el patrón acordado', () => {
    const { texto } = responder('¿Cómo está el clima?', usuario);
    expect(texto).toMatch(
      /^No puedo ayudarte a .+, quizás quisiste decir: .+ o .+$/
    );
  });

  it('construye el mensaje de rechazo con dos sugerencias', () => {
    expect(mensajeNoPuedeAyudar('fútbol')).toContain('quizás quisiste decir:');
  });
});
