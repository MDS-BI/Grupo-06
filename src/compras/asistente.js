/**
 * Asistente IA de Compras.
 *
 * Motor local (sin API keys ni backend): interpreta consultas en lenguaje natural,
 * las resuelve contra los servicios reales del módulo y prepara acciones que
 * siempre requieren confirmación. Toda respuesta pasa por dos guardrails:
 * dominio ERP y permisos por rol (RBAC).
 */

import { COMPRAS_PARAMETROS } from '../module-config.js';
import {
  PERMISOS,
  datosUsuario,
  estaAutenticado,
  getUsuarioActivo,
  leer,
  puede
} from './almacenamiento.js';
import { construirPanel } from './panel.js';
import {
  aprobarSolicitud,
  centrosCosto,
  crearSolicitud,
  precioSugerido,
  productosActivos
} from './solicitudes.js';
import { listarCotizaciones, registrarCotizacion } from './cotizaciones.js';
import {
  emitirOrdenCompra,
  lineasPendientes,
  listarOrdenes
} from './ordenes-compra.js';
import {
  listarRecepciones,
  ordenesPorRecepcionar,
  registrarRecepcion
} from './recepciones.js';
import {
  alertasVencimiento,
  aprobarPago,
  conciliarFactura,
  listarFacturas
} from './facturas.js';
import { listarDevoluciones, registrarDevolucion } from './devoluciones.js';
import {
  cambiarEstadoProveedor,
  listarProveedores,
  vistaProveedor
} from './proveedores.js';
import { listarEventos, registrarEvento } from './trazabilidad.js';
import {
  UMBRAL_COTIZACIONES,
  hoyISO,
  sumarDias,
  validarVisibilidadDatosBancarios
} from './reglas.js';

export const MENSAJE_FUERA_DE_AMBITO =
  'Solo estoy autorizado para asistir en operaciones y consultas del módulo de Adquisiciones y Compras del ERP.';

const SALUDO =
  'Estoy listo para ayudarte con Adquisiciones y Compras. Puedo consultar estados, pendientes y reglas, o preparar acciones según tu rol. Escribe «ayuda» para ver ejemplos.';

export const MENSAJE_NO_PUEDE_AYUDAR =
  'No puedo ayudarte a {tema}, quizás quisiste decir: {sugerencia1} o {sugerencia2}';

const TEMAS_ALCANCE = Object.freeze([
  'solicitudes de compra',
  'cotizaciones de proveedores',
  'órdenes de compra',
  'recepciones y bodega',
  'facturas y conciliación',
  'devoluciones',
  'proveedores y catálogo',
  'evaluaciones de desempeño',
  'trazabilidad',
  'pendientes por rol'
]);

function sugerenciasPorTema(tema) {
  const t = normalizar(tema);
  const coincidencias = TEMAS_ALCANCE.filter((item) => {
    const palabras = normalizar(item).split(/\s+/).filter((p) => p.length > 3);
    return palabras.some((palabra) => t.includes(palabra) || palabra.includes(t));
  });
  if (coincidencias.length >= 2) return coincidencias.slice(0, 2);
  return ['estado de una solicitud', 'pendientes de tu rol'];
}

export function mensajeNoPuedeAyudar(tema) {
  const [sugerencia1, sugerencia2] = sugerenciasPorTema(tema);
  return MENSAJE_NO_PUEDE_AYUDAR.replace('{tema}', tema || 'eso')
    .replace('{sugerencia1}', sugerencia1)
    .replace('{sugerencia2}', sugerencia2);
}

function respuestaCordial(intencion, usuario) {
  const nombre = usuario?.nombre || 'there';
  const rol = etiquetaRol(usuario?.rol);
  if (intencion.nombre === 'saludo') {
    return { texto: `¡Hola, ${nombre}! Como ${rol}, estoy aquí para ayudarte con tus compras. ¿Qué necesitas revisar hoy?` };
  }
  if (intencion.nombre === 'agradecimiento') {
    return { texto: `Con gusto, ${nombre}. Quedo atento para ayudarte con cualquier paso del ciclo de compras.` };
  }
  return {
    texto: `Claro, ${nombre}. Como ${rol} puedo ayudarte con: ${SUGERENCIAS[usuario?.rol]?.join(', ') || 'consultas y acciones de compras'}.`
  };
}

const ETIQUETAS_ROL = Object.freeze({
  solicitante: 'Solicitante',
  comprador: 'Comprador',
  jefe_compras: 'Jefe de Compras',
  bodega: 'Encargado de Bodega',
  admin_ti: 'Administrador TI'
});

const SUGERENCIAS = Object.freeze({
  solicitante: [
    '¿Qué tengo pendiente hoy?',
    'Estado de SC-2026-0002',
    'Crear solicitud de 3 Notebooks P-001 para Administración'
  ],
  comprador: ['Facturas con discrepancia', 'Órdenes sin recepción', 'Proveedores bloqueados'],
  jefe_compras: [
    'Ver solicitudes por aprobar',
    'Revisar facturas con discrepancia',
    'Resumen de monto comprometido'
  ],
  bodega: [
    'Órdenes por recepcionar',
    'Estado de OC-2026-0001',
    'Registrar recepción de la OC-2026-0001'
  ],
  admin_ti: [
    'Ver solicitudes por aprobar',
    'Facturas con discrepancia',
    'Ver cuentas bancarias completas'
  ]
});

const ENTIDAD_POR_COLECCION = Object.freeze({
  solicitudes: 'solicitud',
  cotizaciones: 'cotizacion',
  ordenes: 'orden',
  recepciones: 'recepcion',
  facturas: 'factura',
  devoluciones: 'devolucion'
});

let panel = null;
let mensajes = [];
let ultimoFoco = null;
let secuenciaMensaje = 0;

function etiquetaRol(rol) {
  return ETIQUETAS_ROL[rol] || String(rol || 'Sin rol');
}

function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

function clp(valor) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);
}

function fecha(valor) {
  return valor ? String(valor).split('-').reverse().join('-') : 'sin fecha';
}

function listaTexto(items, limite = 5) {
  if (items.length === 0) return '  • Sin registros.';
  const visibles = items.slice(0, limite).map((item) => `  • ${item}`);
  if (items.length > limite) visibles.push(`  • … y ${items.length - limite} más.`);
  return visibles.join('\n');
}

// ---------------------------------------------------------------------------
// Guardrail de dominio
// ---------------------------------------------------------------------------

function fueraDeAmbito(textoNormalizado) {
  const ajeno =
    /\b(clima|pronostico|chiste|broma|deporte|futbol|partido|receta|politica|pelicula|serie|musica|viaje|amor|mascota|juego)\b/.test(
      textoNormalizado
    ) || /\b(programar|codifica|debuggear|compilar|python|javascript|react)\b/.test(textoNormalizado);
  const propio =
    /\b(compras?|adquisiciones|erp|solicitud(?:es)?|requerimientos?|cotizacion(?:es)?|orden(?:es)?|oc|recepcion(?:es)?|facturas?|facturacion|devolucion(?:es)?|proveedores?|productos?|catalogo|evaluacion(?:es)?|centros? de costo|presupuesto|comprometido|pendientes?|estados?|trazabilidad|historial|bodega|almacen|entregas?|pagos?|conciliar|conciliacion|aprobar|aprueba|apruebo|rechazar|rechaza|rechazo|emite|emitir|umbral|montos?|rut|cuentas? bancarias|datos bancarios|discrepancias?|bloquead\w*|ayuda)\b/.test(
      textoNormalizado
    );
  return ajeno || !propio;
}

function extraerNumeroDocumento(texto) {
  const coincidencia = /\b([a-z]{2,4})[-\s]?(\d{4})[-\s]?(\d{3,4})\b/i.exec(
    String(texto ?? '')
  );
  if (!coincidencia) return '';
  return `${coincidencia[1].toUpperCase()}-${coincidencia[2]}-${coincidencia[3].padStart(4, '0')}`;
}

function identificarIntencion(texto) {
  const t = normalizar(texto);
  if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|saludos)\b/.test(t)) {
    return { nombre: 'saludo' };
  }
  if (/^(gracias|muchas gracias|agradezco|mil gracias)\b/.test(t)) {
    return { nombre: 'agradecimiento' };
  }
  if (fueraDeAmbito(t)) return { nombre: 'fuera_ambito' };

  if (/^(ayuda|que puedes hacer|comandos|opciones)$/.test(t)) return { nombre: 'ayuda' };

  const numero = extraerNumeroDocumento(texto);
  if (numero && /\b(estado|detalle|como va|consulta|informacion|seguimiento)\b/.test(t)) {
    return { nombre: 'estado_documento', numero };
  }

  if (/\bpor aprobar\b|\bpendientes de aprobacion\b/.test(t)) {
    return { nombre: 'solicitudes_por_aprobar' };
  }
  if (/\b(crear|generar|registrar|nueva|hacer|preparar)\b.*\b(solicitud(?:es)?|requerimientos?)\b|\bsolicitar\b/.test(t)) {
    return { nombre: 'crear_solicitud' };
  }
  const decide = /\b(aprobar|aprueba|apruebo|rechazar|rechaza|rechazo)\b/.test(t);
  const rechaza = /\b(rechazar|rechaza|rechazo)\b/.test(t);
  if (decide && /\b(solicitud(?:es)?|sc[-\s]?\d)/.test(t)) {
    return { nombre: rechaza ? 'rechazar_solicitud' : 'aprobar_solicitud' };
  }
  if (decide && /\bfacturas?\b|\bfolio\b|\b\d{3,4}\b/.test(t)) {
    return { nombre: 'aprobar_factura' };
  }
  if (/\bconciliar\b.*\bfacturas?\b|\bfacturas?\b.*\bconciliar\b/.test(t)) {
    return { nombre: 'conciliar_factura' };
  }
  if (/\b(emitir|emite|generar|crear)\b.*\b(orden(?:es)?|oc)\b/.test(t)) {
    return { nombre: 'emitir_orden' };
  }
  if (/\b(registrar|agregar|ingresar)\b.*\bcotizacion(?:es)?\b|\bcotizar\b/.test(t)) {
    return { nombre: 'registrar_cotizacion' };
  }
  if (/\b(registrar|hacer|iniciar)\b.*\brecepcion(?:es)?\b|\brecepcion(?:es)?\b.*\b(registrar|por registrar)\b|\brecepcionar\b/.test(t)) {
    return { nombre: 'registrar_recepcion' };
  }
  if (/\b(registrar|hacer|iniciar)\b.*\bdevolucion(?:es)?\b|\bdevolucion(?:es)?\b.*\b(registrar|por daño)\b|\bdevolver\b/.test(t)) {
    return { nombre: 'registrar_devolucion' };
  }
  if (/\bbloquear\b.*\bproveedores?\b/.test(t)) return { nombre: 'bloquear_proveedor' };
  if (
    /\brut(?:s)?\b.*\b(emplead\w*|funcionari\w*|trabajador\w*|personal|usuarios?)\b/.test(t) ||
    /\b(emplead\w*|funcionari\w*|trabajador\w*|personal)\b.*\brut/.test(t)
  ) {
    return { nombre: 'rut_empleados' };
  }
  if (/\b(cuentas? bancarias|datos bancarios|numero de cuenta|rut del proveedor)\b/.test(t)) {
    return { nombre: 'datos_bancarios' };
  }
  if (/\b(pendientes?|que tengo|resumen|bandeja)\b/.test(t)) return { nombre: 'pendientes' };
  if (/\bdiscrepancias?\b/.test(t)) return { nombre: 'discrepancias' };
  if (/\b(umbral|1\.?000\.?000|millon)\b/.test(t)) return { nombre: 'umbral' };
  if (/\bbloquead/.test(t)) return { nombre: 'proveedores_bloqueados' };
  if (/\bcomprometido\b/.test(t)) return { nombre: 'monto_comprometido' };
  if (/\b(vencid\w*|vencimiento|retraso)\b/.test(t)) return { nombre: 'vencimientos' };
  if (/\b(trazabilidad|historial)\b/.test(t)) return { nombre: 'trazabilidad' };
  if (/\bevaluacione?s?\b/.test(t)) return { nombre: 'evaluaciones' };
  if (/\bproveedores?\b/.test(t)) return { nombre: 'proveedores' };
  if (/\bcotizaciones?\b/.test(t)) return { nombre: 'cotizaciones' };
  if (/\borden(?:es)?\b.*\b(sin recepcion|por recepcionar|sin recepciones)\b|\b(sin recepcion|por recepcionar)\b.*\borden(?:es)?\b/.test(t))
    return { nombre: 'ordenes_sin_recepcion' };
  if (/\b(orden(?:es)?|oc)\b/.test(t)) return { nombre: 'ordenes' };
  if (/\brecepcion(?:es)?\b/.test(t)) return { nombre: 'recepciones' };
  if (/\bdevolucion(?:es)?\b/.test(t)) return { nombre: 'devoluciones' };
  if (/\bfacturas?\b/.test(t)) return { nombre: 'facturas' };
  if (/\bsolicitudes?\b/.test(t)) return { nombre: 'solicitudes' };
  return { nombre: 'fuera_ambito' };
}

// ---------------------------------------------------------------------------
// Buscadores sobre datos reales del módulo
// ---------------------------------------------------------------------------

function documentoPorNumero(numero) {
  const tablas = [
    ['solicitudes', 'numero'],
    ['cotizaciones', 'numero'],
    ['ordenes', 'numero'],
    ['recepciones', 'numero'],
    ['facturas', 'folio'],
    ['devoluciones', 'numero']
  ];
  for (const [coleccion, campo] of tablas) {
    const documento = leer(coleccion).find(
      (item) => normalizar(item[campo]) === normalizar(numero)
    );
    if (documento) return { documento, coleccion };
  }
  return null;
}

function facturaPorTexto(texto) {
  const numero = extraerNumeroDocumento(texto);
  const suelto = /\b(\d{3,4})\b/.exec(String(texto ?? ''))?.[1] || '';
  return (
    listarFacturas().find((factura) => {
      const folio = normalizar(factura.folio || factura.numero || '');
      return (numero && folio === normalizar(numero)) || (suelto && folio.includes(suelto));
    }) || null
  );
}

function solicitudPorTexto(texto) {
  const numero = normalizar(extraerNumeroDocumento(texto));
  if (!numero) return null;
  return leer('solicitudes').find((solicitud) => normalizar(solicitud.numero) === numero) || null;
}

function ordenPorTexto(texto) {
  const numero = normalizar(extraerNumeroDocumento(texto));
  const lista = listarOrdenes();
  if (numero) return lista.find((orden) => normalizar(orden.numero) === numero) || null;
  // Sin número explícito, se usa la primera OC pendiente de recepción.
  return ordenesPorRecepcionar()[0] || null;
}

function proveedorPorTexto(texto) {
  const t = normalizar(texto);
  const codigo = /\b(prv-\d{3})\b/.exec(t)?.[1] || '';
  const proveedores = listarProveedores();
  if (codigo) return proveedores.find((p) => normalizar(p.code) === codigo) || null;
  return (
    proveedores.find((proveedor) => {
      const palabras = normalizar(proveedor.name)
        .split(/\s+/)
        .filter((palabra) => palabra.length > 4);
      return palabras.some((palabra) => t.includes(palabra));
    }) || null
  );
}

function productoPorTexto(texto) {
  const t = normalizar(texto);
  const activos = productosActivos();
  const codigo = /\b([a-z]-\d{3})\b/.exec(t)?.[1] || '';
  if (codigo) {
    const porCodigo = activos.find((producto) => normalizar(producto.codigo) === codigo);
    if (porCodigo) return porCodigo;
  }
  return (
    activos.find((producto) => {
      const palabra = normalizar(producto.nombre).split(/\s+/).find((parte) => parte.length > 4);
      return palabra && t.includes(palabra);
    }) || null
  );
}

function centroPorTexto(texto) {
  const t = normalizar(texto);
  return (
    centrosCosto().find(
      (centro) => t.includes(normalizar(centro.nombre)) || t.includes(normalizar(centro.codigo))
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Guardrail RBAC
// ---------------------------------------------------------------------------

function denegar(permiso, usuario, descripcion) {
  registrarEvento('asistente', permiso, 'intento_denegado', {
    usuario,
    detalle: `Intento denegado: ${descripcion}`
  });
  const roles = (PERMISOS[permiso] || []).map(etiquetaRol).join(', ');
  return {
    texto: `No puedes ${descripcion} con el rol ${etiquetaRol(usuario.rol)}. Este privilegio corresponde a: ${roles || 'roles con permiso explícito'}.`
  };
}

function denegarDatosBancarios(usuario) {
  registrarEvento('asistente', 'datos_bancarios', 'intento_denegado', {
    usuario,
    detalle: 'Consulta de datos bancarios completos'
  });
  const roles = COMPRAS_PARAMETROS.datosBancarios.rolesVisibles.map(etiquetaRol).join(', ');
  return {
    texto: `No puedes ver cuentas bancarias completas con el rol ${etiquetaRol(usuario.rol)}. Este privilegio corresponde a: ${roles}.`
  };
}

// ---------------------------------------------------------------------------
// Consultas en lenguaje natural
// ---------------------------------------------------------------------------

function respuestaAyuda() {
  return {
    texto:
      'Puedo ayudarte con este módulo:\n' +
      '  • Consultas: «¿Qué tengo pendiente hoy?», «Estado de SC-2026-0002», «Facturas con discrepancia».\n' +
      '  • Reglas: «¿Qué solicitudes superan el umbral?», «Proveedores bloqueados».\n' +
      '  • Acciones: crear solicitudes, aprobar o rechazar solicitudes, aprobar facturas conciliadas, emitir OC, registrar cotizaciones, recepciones y devoluciones.\n' +
      'Todas las acciones muestran una tarjeta de confirmación y respetan tu rol.'
  };
}

function respuestaEstado(numero) {
  const encontrado = documentoPorNumero(numero);
  if (!encontrado) {
    return { texto: `No encontré un documento con el número ${numero}. Revisa el identificador e inténtalo de nuevo.` };
  }
  const { documento, coleccion } = encontrado;
  const etiqueta = {
    solicitudes: 'Solicitud',
    cotizaciones: 'Cotización',
    ordenes: 'Orden de compra',
    recepciones: 'Recepción',
    facturas: 'Factura / nota de crédito',
    devoluciones: 'Devolución'
  }[coleccion];
  const identificador = documento.numero || documento.folio || documento.id;
  const monto = documento.monto_estimado ?? documento.total ?? documento.neto;
  const eventos = listarEventos({
    entidad: ENTIDAD_POR_COLECCION[coleccion],
    entidad_id: documento.id
  });
  const ultimo = eventos[eventos.length - 1];
  return {
    texto:
      `${etiqueta} ${identificador}: estado «${documento.estado || 'sin estado'}».\n` +
      (monto ? `Monto: ${clp(monto)}.\n` : '') +
      (documento.proveedor_id ? `Proveedor: ${documento.proveedor_id}.\n` : '') +
      (ultimo ? `Último evento: ${ultimo.accion} (${fecha(ultimo.fecha)}).\n` : '') +
      `${etiqueta} localizada en la vista ${coleccion === 'ordenes' ? 'Órdenes de compra' : coleccion}.`
  };
}

function respuestaPendientes(usuario) {
  const panel = construirPanel(usuario);
  if (panel.pendientes.length === 0) {
    return { texto: 'No tienes pendientes registrados en este momento. Tu bandeja está al día.' };
  }
  return {
    texto:
      `Pendientes para ${etiquetaRol(usuario.rol)}:\n` +
      panel.pendientes
        .map(
          (pendiente) =>
            `  • ${pendiente.titulo}: ${pendiente.cantidad} (${pendiente.items
              .slice(0, 2)
              .map((item) => item.etiqueta)
              .join('; ')})`
        )
        .join('\n')
  };
}

function respuestaSolicitudesPorAprobar(usuario) {
  if (!puede('aprobar_solicitud', usuario)) return denegar('aprobar_solicitud', usuario, 'aprobar solicitudes');
  const pendientes = leer('solicitudes').filter(
    (solicitud) => solicitud.estado === 'enviada' && solicitud.solicitante_id !== usuario.id
  );
  return {
    texto:
      `Solicitudes enviadas por aprobar (${pendientes.length}):\n` +
      listaTexto(
        pendientes.map(
          (solicitud) =>
            `${solicitud.numero} · ${solicitud.justificacion} · ${clp(solicitud.monto_estimado)}`
        )
      )
  };
}

function respuestaRutEmpleados(usuario) {
  const empleados = leer('usuarios').map((empleado) => {
    const identidad = datosUsuario(empleado.id, usuario, 'auditoria');
    const sufijo = empleado.id === usuario.id ? ' (tú)' : '';
    return `${identidad.nombre}${sufijo} · ${identidad.cargo}: ${identidad.rut_visible || 'sin registro'}`;
  });
  return {
    texto:
      `RUT de empleados visibles para ${etiquetaRol(usuario.rol)}:\n` +
      listaTexto(empleados, 7)
  };
}

function respuestaDatosBancarios(usuario, texto) {
  if (!validarVisibilidadDatosBancarios(usuario.rol).visible) {
    return denegarDatosBancarios(usuario);
  }
  const especifico = proveedorPorTexto(texto);
  const proveedores = especifico ? [especifico] : listarProveedores();
  registrarEvento('asistente', 'datos_bancarios', 'consulta_autorizada', {
    usuario,
    detalle: `${proveedores.length} proveedor(es) consultado(s)`
  });
  return {
    texto:
      `Datos bancarios visibles para ${etiquetaRol(usuario.rol)}:\n` +
      listaTexto(
        proveedores.map((proveedor) => {
          const vista = vistaProveedor(proveedor, usuario.rol);
          return `${vista.name} (${vista.code}): RUT ${vista.rut_visible || 'sin registro'}, cuenta ${vista.cuenta_visible}`;
        })
      )
  };
}

function responderConsulta(intencion, usuario, texto) {
  switch (intencion.nombre) {
    case 'ayuda':
      return respuestaAyuda();
    case 'estado_documento':
      return respuestaEstado(intencion.numero);
    case 'pendientes':
      return respuestaPendientes(usuario);
    case 'solicitudes_por_aprobar':
      return respuestaSolicitudesPorAprobar(usuario);
    case 'rut_empleados':
      return respuestaRutEmpleados(usuario);
    case 'datos_bancarios':
      return respuestaDatosBancarios(usuario, texto);
    case 'discrepancias': {
      const facturas = listarFacturas({ estado: 'con_discrepancia' });
      return {
        texto:
          `Facturas con discrepancia (${facturas.length}):\n` +
          listaTexto(
            facturas.map(
              (factura) =>
                `Folio ${factura.folio} · OC ${factura.orden_id} · diferencia ${clp(factura.diferencia)}`
            )
          )
      };
    }
    case 'umbral': {
      const solicitudes = leer('solicitudes').filter(
        (solicitud) => Number(solicitud.monto_estimado) >= UMBRAL_COTIZACIONES
      );
      return {
        texto:
          `Solicitudes que igualan o superan el umbral de ${clp(UMBRAL_COTIZACIONES)} (${solicitudes.length}):\n` +
          listaTexto(
            solicitudes.map(
              (solicitud) =>
                `${solicitud.numero} · ${clp(solicitud.monto_estimado)} · ${solicitud.estado}`
            )
          )
      };
    }
    case 'proveedores_bloqueados': {
      const bloqueados = listarProveedores().filter(
        (proveedor) => proveedor.estado_proveedor === 'bloqueado'
      );
      return {
        texto:
          `Proveedores bloqueados (${bloqueados.length}):\n` +
          listaTexto(bloqueados.map((proveedor) => `${proveedor.name} (${proveedor.code})`))
      };
    }
    case 'monto_comprometido': {
      const indicadores = construirPanel(usuario).indicadores;
      return {
        texto:
          `Resumen de ${indicadores.mes}: monto comprometido ${clp(indicadores.monto_comprometido)}, ` +
          `${indicadores.ordenes_abiertas} órdenes abiertas y ${clp(indicadores.monto_aprobado_pago)} aprobados para pago.`
      };
    }
    case 'vencimientos': {
      const alertas = alertasVencimiento();
      return {
        texto:
          `Facturas próximas a vencer o vencidas (${alertas.length}):\n` +
          listaTexto(
            alertas.map(
              (factura) =>
                `Folio ${factura.folio} · vence ${fecha(factura.fecha_vencimiento)} · ${factura.dias_restantes} días · ${factura.estado}`
            )
          )
      };
    }
    case 'ordenes_sin_recepcion': {
      const pendientes = ordenesPorRecepcionar();
      return {
        texto:
          `Órdenes sin recepción total (${pendientes.length}):\n` +
          listaTexto(
            pendientes.map((orden) => `${orden.numero} · ${orden.proveedor_id} · ${orden.estado}`)
          )
      };
    }
    case 'trazabilidad': {
      if (!puede('consultar_trazabilidad', usuario)) {
        return denegar('consultar_trazabilidad', usuario, 'consultar la trazabilidad');
      }
      const eventos = listarEventos();
      return {
        texto:
          `Últimos eventos de trazabilidad (${eventos.length} en total):\n` +
          listaTexto(
            eventos.slice(-5).map(
              (evento) =>
                `${evento.accion} · ${evento.entidad} ${evento.entidad_id} · ${etiquetaRol(evento.usuario_rol)}`
            )
          )
      };
    }
    case 'evaluaciones': {
      const evaluaciones = leer('evaluaciones');
      return {
        texto:
          `Evaluaciones registradas (${evaluaciones.length}):\n` +
          listaTexto(
            evaluaciones.map(
              (evaluacion) =>
                `${evaluacion.proveedor_id} · promedio ${evaluacion.promedio} · ${fecha(evaluacion.fecha_evaluacion || evaluacion.fecha)}`
            )
          )
      };
    }
    case 'proveedores':
      return {
        texto:
          `Proveedores registrados (${listarProveedores().length}):\n` +
          listaTexto(
            listarProveedores().map(
              (proveedor) =>
                `${proveedor.name} (${proveedor.code}) · ${proveedor.estado_proveedor || 'sin estado'}`
            )
          )
      };
    case 'cotizaciones':
      return {
        texto:
          `Cotizaciones registradas (${listarCotizaciones().length}):\n` +
          listaTexto(
            listarCotizaciones().map(
              (cotizacion) =>
                `${cotizacion.numero} · ${cotizacion.proveedor_id} · ${cotizacion.estado}`
            )
          )
      };
    case 'ordenes':
      return {
        texto:
          `Órdenes de compra registradas (${listarOrdenes().length}):\n` +
          listaTexto(
            listarOrdenes().map((orden) => `${orden.numero} · ${orden.proveedor_id} · ${orden.estado}`)
          )
      };
    case 'recepciones':
      return {
        texto:
          `Recepciones registradas (${listarRecepciones().length}):\n` +
          listaTexto(
            listarRecepciones().map(
              (recepcion) =>
                `${recepcion.numero} · OC ${recepcion.orden_id} · ${recepcion.estado}`
            )
          )
      };
    case 'facturas':
      return {
        texto:
          `Documentos de facturación (${listarFacturas().length}):\n` +
          listaTexto(
            listarFacturas().map(
              (factura) => `Folio ${factura.folio} · ${factura.estado} · ${clp(factura.total)}`
            )
          )
      };
    case 'solicitudes': {
      const solicitudes = leer('solicitudes');
      return {
        texto:
          `Solicitudes registradas (${solicitudes.length}):\n` +
          listaTexto(
            solicitudes.map(
              (solicitud) =>
                `${solicitud.numero} · ${solicitud.estado} · ${clp(solicitud.monto_estimado)}`
            )
          )
      };
    }
    case 'devoluciones':
      return {
        texto:
          `Devoluciones registradas (${listarDevoluciones().length}):\n` +
          listaTexto(
            listarDevoluciones().map(
              (devolucion) => `${devolucion.numero} · OC ${devolucion.orden_id} · ${devolucion.estado}`
            )
          )
      };
    default:
      return { texto: MENSAJE_FUERA_DE_AMBITO };
  }
}

// ---------------------------------------------------------------------------
// Acciones guiadas (siempre con confirmación)
// ---------------------------------------------------------------------------

function confirmacion(texto, etiqueta, ejecutar) {
  return { texto, accion: { etiqueta, ejecutar } };
}

function prepararCrearSolicitud(texto, usuario) {
  if (!puede('crear_solicitud', usuario)) {
    return denegar('crear_solicitud', usuario, 'crear solicitudes de compra');
  }
  const producto = productoPorTexto(texto);
  if (!producto) {
    const codigos = productosActivos()
      .slice(0, 5)
      .map((item) => item.codigo)
      .join(', ');
    return {
      texto: `Necesito un producto activo del catálogo. Ejemplo: «Crear solicitud de 3 Notebooks P-001». Códigos disponibles: ${codigos}.`
    };
  }
  const precio = precioSugerido(producto.id);
  if (precio === null || precio === undefined) {
    return {
      texto: `El producto ${producto.codigo} no tiene precio vigente en el catálogo activo. Indícame otro producto disponible.`
    };
  }
  const cantidad = Number(/\b(\d+)\b/.exec(texto)?.[1] || 1);
  const centro =
    centroPorTexto(texto) ||
    centrosCosto().find((item) => item.id === usuario.centro_costo_id) ||
    centrosCosto()[0];
  const datos = {
    justificacion: `Solicitud preparada por el Asistente IA para ${centro.nombre}`,
    fecha_requerida: sumarDias(hoyISO(), 7),
    centro_costo_id: centro.id,
    prioridad: 'media',
    lineas: [{ producto_id: producto.id, cantidad, precio_estimado: Number(precio) }]
  };
  return confirmacion(
    `Preparé un borrador: ${cantidad} × ${producto.nombre} (${producto.codigo}) para ${centro.codigo} · ${centro.nombre}, por ${clp(Number(precio) * cantidad)}. Fecha requerida: ${datos.fecha_requerida}. Confirma para guardarlo.`,
    'Crear borrador de solicitud',
    () => {
      const solicitud = crearSolicitud(datos, usuario);
      return `Solicitud ${solicitud.numero} creada en estado «${solicitud.estado}». Puedes verla en la vista Solicitudes.`;
    }
  );
}

function prepararSolicitud(texto, usuario, aprobar) {
  const permiso = 'aprobar_solicitud';
  if (!puede(permiso, usuario)) {
    return denegar(permiso, usuario, aprobar ? 'aprobar solicitudes' : 'rechazar solicitudes');
  }
  const solicitud = solicitudPorTexto(texto);
  if (!solicitud) {
    return { texto: 'Indícame el número de la solicitud, por ejemplo: «Aprueba la solicitud SC-2026-0002».' };
  }
  if (solicitud.estado !== 'enviada') {
    return { texto: `La solicitud ${solicitud.numero} está en estado «${solicitud.estado}». Solo se pueden aprobar o rechazar solicitudes enviadas.` };
  }
  if (solicitud.solicitante_id === usuario.id) {
    return { texto: 'No puedes decidir sobre tu propia solicitud (segregación de funciones).' };
  }
  let motivo = '';
  if (!aprobar) {
    motivo = /(?:motivo|por)\s+(.+)$/i.exec(texto)?.[1]?.trim() || '';
    if (!motivo) {
      return { texto: `Para rechazar ${solicitud.numero} necesito un motivo. Escribe, por ejemplo: «Rechaza SC-2026-0002 por presupuesto insuficiente».` };
    }
  }
  return confirmacion(
    `${aprobar ? 'Aprobar' : 'Rechazar'} la solicitud ${solicitud.numero} (${clp(solicitud.monto_estimado)})${motivo ? `, motivo: «${motivo}»` : ''}. Confirma para registrar la decisión.`,
    aprobar ? 'Aprobar solicitud' : 'Rechazar solicitud',
    () => {
      const actualizada = aprobarSolicitud(solicitud.id, usuario, { aprobar, motivo });
      return `Solicitud ${solicitud.numero} actualizada a estado «${actualizada.estado}».`;
    }
  );
}

function prepararAprobarFactura(texto, usuario) {
  if (!puede('aprobar_pago', usuario)) {
    return denegar('aprobar_pago', usuario, 'aprobar facturas para pago');
  }
  const factura = facturaPorTexto(texto);
  if (!factura) return { texto: 'Indícame el folio de la factura, por ejemplo: «Aprueba la factura 1002».' };
  if (factura.tipo_documento !== 'factura' || factura.estado !== 'conciliada') {
    return { texto: `La factura folio ${factura.folio} está en estado «${factura.estado}». Solo se pueden aprobar facturas conciliadas.` };
  }
  return confirmacion(
    `Aprobar para pago la factura folio ${factura.folio} por ${clp(factura.total)}. Confirma para registrar la aprobación.`,
    'Aprobar factura',
    () => {
      const aprobada = aprobarPago(factura.id, usuario);
      return `Factura folio ${factura.folio} aprobada para pago${aprobada.alerta_fraude ? ', con alerta de cambio bancario reciente' : ''}.`;
    }
  );
}

function prepararConciliarFactura(texto, usuario) {
  if (!puede('conciliar_factura', usuario)) {
    return denegar('conciliar_factura', usuario, 'conciliar facturas');
  }
  const factura = facturaPorTexto(texto);
  if (!factura) return { texto: 'Indícame el folio de la factura a conciliar.' };
  return confirmacion(
    `Conciliar la factura folio ${factura.folio} (${factura.estado}) contra recepciones, notas de crédito y devoluciones. Confirma para ejecutar la regla de conciliación.`,
    'Conciliar factura',
    () => {
      const conciliada = conciliarFactura(factura.id, usuario);
      return `Factura folio ${factura.folio} conciliada con resultado «${conciliada.estado}» y diferencia ${clp(conciliada.diferencia)}.`;
    }
  );
}

function prepararEmitirOrden(texto, usuario) {
  if (!puede('emitir_oc', usuario)) {
    return denegar('emitir_oc', usuario, 'emitir órdenes de compra');
  }
  const solicitud = solicitudPorTexto(texto);
  if (!solicitud) {
    return { texto: 'Indícame la solicitud aprobada desde la cual emitir la OC, por ejemplo: «Emitir OC desde SC-2026-0003».' };
  }
  if (!['aprobada', 'en_cotizacion'].includes(solicitud.estado)) {
    return { texto: `La solicitud ${solicitud.numero} está en estado «${solicitud.estado}». Solo se puede emitir una OC desde una solicitud aprobada o en cotización.` };
  }
  const cotizacion = listarCotizaciones({ solicitud_id: solicitud.id }).find(
    (item) => item.estado === 'seleccionada'
  );
  if (!cotizacion && Number(solicitud.monto_estimado) >= UMBRAL_COTIZACIONES) {
    return {
      texto: `La solicitud ${solicitud.numero} supera el umbral de ${clp(UMBRAL_COTIZACIONES)}: primero debe haber una cotización seleccionada.`
    };
  }
  const proveedor = cotizacion ? null : proveedorPorTexto(texto);
  if (!cotizacion && !proveedor) {
    return { texto: `Indícame un proveedor aprobado para la compra directa de ${solicitud.numero}, por ejemplo: «Emitir OC para SC-2026-0003 con PRV-001».` };
  }
  const datos = {
    solicitud_id: solicitud.id,
    cotizacion_id: cotizacion?.id,
    proveedor_id: proveedor?.entity_id || proveedor?.id
  };
  return confirmacion(
    `Preparar emisión de OC desde ${solicitud.numero} ${cotizacion ? `con la cotización ${cotizacion.numero}` : `al proveedor ${proveedor.name}`}, por ${clp(solicitud.monto_estimado)}. Confirma para emitirla.`,
    'Emitir orden de compra',
    () => {
      const orden = emitirOrdenCompra(datos, usuario);
      return `Orden de compra ${orden.numero} emitida por ${clp(orden.total)}. Quedó registrada en la vista Órdenes de compra.`;
    }
  );
}

function prepararRegistrarCotizacion(texto, usuario) {
  if (!puede('gestionar_cotizaciones', usuario)) {
    return denegar('gestionar_cotizaciones', usuario, 'registrar cotizaciones');
  }
  const solicitud = solicitudPorTexto(texto);
  if (!solicitud) return { texto: 'Indícame la solicitud a cotizar, por ejemplo: «Registrar cotización para SC-2026-0003».' };
  const proveedor = proveedorPorTexto(texto);
  if (!proveedor) return { texto: `Indícame el proveedor de la cotización para ${solicitud.numero} (por ejemplo, PRV-001).` };
  const precio = Number(/\$\s*?([\d.]+)/.exec(texto)?.[1]?.replaceAll('.', '') || /\bprecio\s+(\d+)\b/i.exec(texto)?.[1] || 0);
  if (!precio) return { texto: `Indícame el precio total de la cotización, por ejemplo: «Registrar cotización para SC-2026-0003 con PRV-001 por $500000».` };
  const lineas = (solicitud.lineas || []).map((linea) => ({
    producto_id: linea.producto_id,
    cantidad: Number(linea.cantidad) || 1,
    precio_unitario: Math.round(precio / (solicitud.lineas.length || 1)),
    descuento_pct: 0
  }));
  const datos = {
    solicitud_id: solicitud.id,
    proveedor_id: proveedor.entity_id || proveedor.id,
    fecha_validez: sumarDias(hoyISO(), 15),
    lineas
  };
  return confirmacion(
    `Registrar cotización de ${proveedor.name} para ${solicitud.numero} por ${clp(precio)}, válida hasta ${datos.fecha_validez}. Confirma para guardarla.`,
    'Registrar cotización',
    () => {
      const cotizacion = registrarCotizacion(datos, usuario);
      return `Cotización ${cotizacion.numero} registrada por ${clp(cotizacion.total)}.`;
    }
  );
}

function ordenPorAccion(texto) {
  const orden = ordenPorTexto(texto);
  if (orden) return orden;
  const candidatas = ordenesPorRecepcionar();
  return candidatas.length === 1 ? candidatas[0] : null;
}

function prepararRegistrarRecepcion(texto, usuario) {
  if (!puede('registrar_recepcion', usuario)) {
    return denegar('registrar_recepcion', usuario, 'registrar recepciones');
  }
  const orden = ordenPorAccion(texto);
  if (!orden) return { texto: 'Indícame la OC a recepcionar, por ejemplo: «Registrar recepción de la OC-2026-0001».' };
  const pendientes = lineasPendientes(orden).filter((linea) => linea.cantidad_pendiente > 0);
  if (pendientes.length === 0) return { texto: `La OC ${orden.numero} ya no tiene unidades pendientes de recepción.` };
  const datos = {
    orden_id: orden.id,
    observaciones: 'Recepción preparada por el Asistente IA',
    lineas: pendientes.map((linea) => ({
      orden_linea_id: linea.linea_id,
      cantidad_recibida: linea.cantidad_pendiente,
      cantidad_aceptada: linea.cantidad_pendiente,
      cantidad_rechazada: 0
    }))
  };
  return confirmacion(
    `Registrar recepción total de ${pendientes.reduce((sum, linea) => sum + linea.cantidad_pendiente, 0)} unidades pendientes de la OC ${orden.numero}. Confirma para guardarla.`,
    'Registrar recepción',
    () => {
      const recepcion = registrarRecepcion(datos, usuario);
      return `Recepción ${recepcion.numero} registrada en estado «${recepcion.estado}».`;
    }
  );
}

function prepararRegistrarDevolucion(texto, usuario) {
  if (!puede('registrar_devolucion', usuario)) {
    return denegar('registrar_devolucion', usuario, 'registrar devoluciones');
  }
  const orden = ordenPorAccion(texto);
  if (!orden) return { texto: 'Indícame la OC sobre la cual registrar la devolución por daño.' };
  const linea = lineasPendientes(orden).find((item) => item.cantidad_aceptada > 0);
  if (!linea) return { texto: `La OC ${orden.numero} no tiene unidades aceptadas para devolver.` };
  const datos = {
    orden_id: orden.id,
    observaciones: 'Devolución por daño preparada por el Asistente IA',
    lineas: [{ orden_linea_id: linea.linea_id, cantidad: 1, motivo: 'daño' }]
  };
  return confirmacion(
    `Registrar devolución por daño de 1 unidad del producto ${linea.producto_id} de la OC ${orden.numero}. Confirma para guardarla.`,
    'Registrar devolución',
    () => {
      const devolucion = registrarDevolucion(datos, usuario);
      return `Devolución ${devolucion.numero} registrada en estado «${devolucion.estado}».`;
    }
  );
}

function prepararBloquearProveedor(texto, usuario) {
  if (!puede('gestionar_proveedores', usuario)) {
    return denegar('gestionar_proveedores', usuario, 'bloquear proveedores');
  }
  const proveedor = proveedorPorTexto(texto);
  if (!proveedor) return { texto: 'Indícame el proveedor a bloquear, por ejemplo: «Bloquear proveedor PRV-003».' };
  if (proveedor.estado_proveedor === 'bloqueado') {
    return { texto: `El proveedor ${proveedor.name} ya está bloqueado.` };
  }
  return confirmacion(
    `Bloquear al proveedor ${proveedor.name} (${proveedor.code}). Confirma para cambiar su estado.`,
    'Bloquear proveedor',
    () => {
      cambiarEstadoProveedor(proveedor.id || proveedor.entity_id, 'bloqueado', usuario);
      return `Proveedor ${proveedor.name} bloqueado. Ya no podrá usarse en nuevas cotizaciones.`;
    }
  );
}

function prepararAccion(intencion, texto, usuario) {
  switch (intencion.nombre) {
    case 'crear_solicitud':
      return prepararCrearSolicitud(texto, usuario);
    case 'aprobar_solicitud':
      return prepararSolicitud(texto, usuario, true);
    case 'rechazar_solicitud':
      return prepararSolicitud(texto, usuario, false);
    case 'aprobar_factura':
      return prepararAprobarFactura(texto, usuario);
    case 'conciliar_factura':
      return prepararConciliarFactura(texto, usuario);
    case 'emitir_orden':
      return prepararEmitirOrden(texto, usuario);
    case 'registrar_cotizacion':
      return prepararRegistrarCotizacion(texto, usuario);
    case 'registrar_recepcion':
      return prepararRegistrarRecepcion(texto, usuario);
    case 'registrar_devolucion':
      return prepararRegistrarDevolucion(texto, usuario);
    case 'bloquear_proveedor':
      return prepararBloquearProveedor(texto, usuario);
    default:
      return { texto: MENSAJE_FUERA_DE_AMBITO };
  }
}

/** Punto de entrada del motor. Devuelve `{ texto, accion? }`. */
export function responder(texto, usuario = getUsuarioActivo()) {
  const intencion = identificarIntencion(texto);
  if (['saludo', 'agradecimiento', 'ayuda'].includes(intencion.nombre)) {
    return respuestaCordial(intencion, usuario);
  }
  if (intencion.nombre === 'fuera_ambito') {
    return { texto: mensajeNoPuedeAyudar(String(texto ?? '').trim()) };
  }
  const acciones = new Set([
    'crear_solicitud',
    'aprobar_solicitud',
    'rechazar_solicitud',
    'aprobar_factura',
    'conciliar_factura',
    'emitir_orden',
    'registrar_cotizacion',
    'registrar_recepcion',
    'registrar_devolucion',
    'bloquear_proveedor'
  ]);
  try {
    return acciones.has(intencion.nombre)
      ? prepararAccion(intencion, texto, usuario)
      : responderConsulta(intencion, usuario, texto);
  } catch (error) {
    return { texto: `No se pudo completar la consulta: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// Interfaz: drawer de chat
// ---------------------------------------------------------------------------

function el(id) {
  return panel?.querySelector(`#${id}`) || null;
}

function enlaceCierre() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>`;
}

function iconoAsistente(tamano = 20) {
  return `<svg viewBox="0 0 24 24" width="${tamano}" height="${tamano}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a8 8 0 0 1-8 8H8l-4 2 1.2-4A8 8 0 1 1 21 12z"></path><path d="M12 8l1.1 2.4L15.5 11l-2.4 1.1L12 14.5l-1.1-2.4L8.5 11l2.4-.6L12 8z"></path></svg>`;
}

function construirDrawer() {
  if (panel && document.body.contains(panel)) return panel;
  panel = document.createElement('div');
  panel.id = 'asistente-overlay';
  panel.className = 'asistente-overlay';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="asistente-backdrop" data-asistente-cerrar aria-hidden="true"></div>
    <section class="asistente-drawer" role="dialog" aria-modal="true" aria-labelledby="asistente-titulo" aria-describedby="asistente-descripcion">
      <header class="asistente-head">
        <div class="asistente-head-fila">
          <span class="asistente-logo" aria-hidden="true">${iconoAsistente(22)}</span>
          <div class="asistente-head-texto">
            <p class="asistente-eyebrow">ERP · ADQUISICIONES Y COMPRAS</p>
            <h2 id="asistente-titulo">Asistente IA de Compras</h2>
            <p id="asistente-descripcion" class="muted">Consultas y acciones permitidas según tu rol.</p>
          </div>
          <button type="button" id="asistente-cerrar" class="asistente-icon-btn" aria-label="Cerrar asistente">${enlaceCierre()}</button>
        </div>
        <p id="asistente-sesion" class="asistente-sesion" aria-live="polite"></p>
        <p class="asistente-modo"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg> Modo Restringido por Rol · Solo ERP</p>
        <button type="button" id="asistente-limpiar" class="link asistente-limpiar">Limpiar conversación</button>
      </header>
      <div id="asistente-mensajes" class="asistente-mensajes" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div id="asistente-sugerencias" class="asistente-sugerencias" aria-label="Sugerencias según tu rol"></div>
      <form id="asistente-form" class="asistente-form" novalidate>
        <label for="asistente-input" class="sr-only">Escribe tu consulta sobre Adquisiciones y Compras</label>
        <input id="asistente-input" type="text" autocomplete="off" placeholder="Consulta estados o pide una acción…" />
        <button type="submit" class="primary asistente-enviar" aria-label="Enviar mensaje al asistente">Enviar</button>
      </form>
    </section>
  `;
  document.body.appendChild(panel);
  cablearPanel();
  return panel;
}

function renderMensajes() {
  const contenedor = el('asistente-mensajes');
  if (!contenedor) return;
  contenedor.innerHTML = mensajes
    .map((mensaje) => {
      const autor = mensaje.autor === 'usuario' ? 'Tú' : 'Asistente';
      return `<article class="asistente-mensaje asistente-mensaje--${mensaje.autor}">
        <p class="asistente-mensaje-autor">${autor}</p>
        <p class="asistente-mensaje-texto">${escapar(mensaje.texto)}</p>
        ${
          mensaje.accion
            ? `<div class="asistente-confirmar">
                <p class="asistente-confirmar-titulo">Confirmación requerida · ${escapar(mensaje.accion.etiqueta)}</p>
                <div class="asistente-confirmar-acciones">
                  <button type="button" class="primary" data-confirmar="${mensaje.id}">Confirmar acción</button>
                  <button type="button" class="secondary" data-cancelar="${mensaje.id}">Cancelar</button>
                </div>
              </div>`
            : ''
        }
      </article>`;
    })
    .join('');
  contenedor.scrollTop = contenedor.scrollHeight;
}

function agregarMensaje(autor, texto, accion = null) {
  secuenciaMensaje += 1;
  mensajes.push({ id: `msg-${secuenciaMensaje}`, autor, texto, accion });
  renderMensajes();
}

function renderSugerencias(usuario) {
  const contenedor = el('asistente-sugerencias');
  if (!contenedor) return;
  contenedor.innerHTML = (SUGERENCIAS[usuario.rol] || SUGERENCIAS.solicitante)
    .map(
      (sugerencia) =>
        `<button type="button" class="asistente-chip" data-sugerencia="${escapar(sugerencia)}">${escapar(sugerencia)}</button>`
    )
    .join('');
}

/** Actualiza identidad y sugerencias cuando cambia la sesión (p. ej. vista de rol). */
export function sincronizarAsistente() {
  if (!panel || panel.hidden) return;
  const usuario = getUsuarioActivo();
  const centros = leer('centros_costo');
  const centro = centros.find((item) => item.id === usuario.centro_costo_id);
  const sesion = el('asistente-sesion');
  if (sesion) {
    sesion.textContent = `${usuario.nombre || etiquetaRol(usuario.rol)} · ${etiquetaRol(usuario.rol)} · ${centro ? `${centro.codigo} · ${centro.nombre}` : 'Sin centro de costo'}`;
  }
  renderSugerencias(usuario);
}

function enviarMensaje(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return;
  agregarMensaje('usuario', limpio);
  const respuesta = responder(limpio, getUsuarioActivo());
  agregarMensaje('asistente', respuesta.texto, respuesta.accion || null);
}

function cablearPanel() {
  panel.querySelector('[data-asistente-cerrar]')?.addEventListener('click', cerrarAsistente);
  el('asistente-cerrar')?.addEventListener('click', cerrarAsistente);
  el('asistente-limpiar')?.addEventListener('click', () => {
    mensajes = [];
    agregarMensaje('asistente', SALUDO);
    el('asistente-input')?.focus();
  });

  el('asistente-form')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const input = el('asistente-input');
    if (!input) return;
    const texto = input.value;
    input.value = '';
    enviarMensaje(texto);
  });

  el('asistente-sugerencias')?.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-sugerencia]');
    if (!boton) return;
    enviarMensaje(boton.dataset.sugerencia);
    el('asistente-input')?.focus();
  });

  el('asistente-mensajes')?.addEventListener('click', (evento) => {
    const confirmar = evento.target.closest('[data-confirmar]');
    const cancelar = evento.target.closest('[data-cancelar]');
    if (!confirmar && !cancelar) return;
    const id = confirmar?.dataset.confirmar || cancelar?.dataset.cancelar;
    const mensaje = mensajes.find((item) => item.id === id && item.accion);
    if (!mensaje) return;
    const accion = mensaje.accion;
    mensaje.accion = null;
    if (cancelar) {
      agregarMensaje('asistente', 'Acción cancelada. No se realizaron cambios.');
      renderMensajes();
      return;
    }
    try {
      agregarMensaje('asistente', accion.ejecutar());
    } catch (error) {
      agregarMensaje('asistente', `No se pudo completar la acción: ${error.message}`);
      renderMensajes();
    }
    sincronizarAsistente();
  });

  panel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrarAsistente();
      return;
    }
    if (evento.key !== 'Tab') return;
    const enfocables = [
      ...panel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ].filter((elemento) => !elemento.closest('[hidden]'));
    if (enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  });
}

/** Abre el drawer; no hace nada si no hay sesión iniciada. */
export function abrirAsistente() {
  if (typeof document === 'undefined' || !estaAutenticado()) return;
  const nodo = construirDrawer();
  if (!nodo.hidden) {
    el('asistente-input')?.focus();
    return;
  }
  ultimoFoco = document.activeElement;
  nodo.hidden = false;
  if (mensajes.length === 0) agregarMensaje('asistente', SALUDO);
  sincronizarAsistente();
  el('asistente-input')?.focus();
}

/** Descarta el historial al iniciar una sesión nueva. */
export function reiniciarAsistente() {
  mensajes = [];
  secuenciaMensaje = 0;
  if (panel && document.body.contains(panel)) renderMensajes();
}

/** Cierra el drawer y devuelve el foco al control que lo abrió. */
export function cerrarAsistente() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  if (ultimoFoco && typeof ultimoFoco.focus === 'function' && document.body.contains(ultimoFoco)) {
    ultimoFoco.focus();
  }
  ultimoFoco = null;
}
