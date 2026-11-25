/**
 * Log de Auditoría Forense (FR-045): operaciones administrativas sensibles.
 * Es independiente de `trazabilidad.js`, que cubre el ciclo de compras.
 * Los eventos solo se agregan: no existe función pública para editarlos ni borrarlos.
 */

import { generarCSV, descargarCSV } from './exportacion.js';
import { guardarDato, leerDato } from './gobernanza.js';

const CLAVE = 'auditoria_forense';

/** Hash determinista de integridad encadenada (demostración, no firma criptográfica). */
function hash(texto) {
  let valor = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    valor ^= texto.charCodeAt(i);
    valor = Math.imul(valor, 16777619);
  }
  return (valor >>> 0).toString(16).padStart(8, '0');
}

export const COLUMNAS_AUDITORIA = Object.freeze([
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'actor', header: 'Actor' },
  { key: 'usuario_afectado', header: 'Usuario afectado' },
  { key: 'tipo_evento', header: 'Tipo de evento' },
  { key: 'campos_modificados', header: 'Campos modificados' },
  { key: 'otp_validado', header: 'OTP validado' },
  { key: 'hash', header: 'Hash de integridad' }
]);

/** Devuelve los eventos forenses, opcionalmente filtrados. */
export function listarEventosForenses({ tipo_evento, usuario_afectado, actor } = {}) {
  const eventos = Array.isArray(leerDato(CLAVE, [])) ? leerDato(CLAVE, []) : [];
  return eventos.filter(
    (evento) =>
      (!tipo_evento || evento.tipo_evento === tipo_evento) &&
      (!usuario_afectado || evento.usuario_afectado === usuario_afectado) &&
      (!actor || evento.actor === actor)
  );
}

/** Agrega un evento inmutable con encadenamiento de hash. */
export function registrarEventoForense({
  actor = '',
  usuario_afectado = '',
  tipo_evento = '',
  campos_modificados = '',
  otp_validado = false,
  timestamp = new Date().toISOString()
} = {}) {
  const eventos = Array.isArray(leerDato(CLAVE, [])) ? [...leerDato(CLAVE, [])] : [];
  const anterior = eventos.at(-1)?.hash || '0';
  const base = JSON.stringify({
    actor,
    usuario_afectado,
    tipo_evento,
    campos_modificados: String(campos_modificados ?? ''),
    otp_validado: Boolean(otp_validado),
    timestamp,
    anterior
  });
  const evento = {
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    actor,
    usuario_afectado,
    tipo_evento,
    campos_modificados: String(campos_modificados ?? ''),
    otp_validado: Boolean(otp_validado),
    timestamp,
    hash_anterior: anterior,
    hash: hash(base)
  };
  guardarDato(CLAVE, [...eventos, evento]);
  return evento;
}

/** Comprueba que la cadena de integridad no haya sido alterada. */
export function verificarIntegridadAuditoria() {
  const eventos = Array.isArray(leerDato(CLAVE, [])) ? leerDato(CLAVE, []) : [];
  let anterior = '0';
  for (const evento of eventos) {
    const base = JSON.stringify({
      actor: evento.actor,
      usuario_afectado: evento.usuario_afectado,
      tipo_evento: evento.tipo_evento,
      campos_modificados: evento.campos_modificados,
      otp_validado: evento.otp_validado,
      timestamp: evento.timestamp,
      anterior
    });
    if (evento.hash_anterior !== anterior || evento.hash !== hash(base)) return false;
    anterior = evento.hash;
  }
  return true;
}

/** Exporta el log forense a CSV; devuelve el contenido aunque no haya navegador. */
export function exportarAuditoriaForense({ descargar = true, filtro = '' } = {}) {
  const q = String(filtro ?? '').toLowerCase();
  const eventos = listarEventosForenses().filter((evento) =>
    [evento.timestamp, evento.actor, evento.usuario_afectado, evento.tipo_evento, evento.campos_modificados]
      .some((valor) => String(valor ?? '').toLowerCase().includes(q))
  );
  const contenido = generarCSV(COLUMNAS_AUDITORIA, eventos);
  if (descargar) descargarCSV('auditoria-forense', contenido);
  return contenido;
}
