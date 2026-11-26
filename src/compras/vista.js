import {
  getUsuarioActivo,
  asegurarSemilla,
  cargarCatalogoBase,
  datosUsuario,
  leer,
  puede
} from './almacenamiento.js';
import { hoyISO, umbralCotizaciones, validarVisibilidadDatosBancarios } from './reglas.js';
import {
  cambiarEstadoUsuario,
  cambiarParametros,
  desbloquearExcepcion,
  editarUsuario,
  listarPadronUsuarios
} from './administracion.js';
import {
  exportarAuditoriaForense,
  listarEventosForenses,
  verificarIntegridadAuditoria
} from './auditoria.js';
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  obtenerModo,
  obtenerParametros,
  solicitarOtp,
  validarOtp
} from './gobernanza.js';
import {
  listarProveedores,
  buscarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  actualizarDatosBancarios,
  cambiarEstadoProveedor,
  eliminarProveedor,
  vistaProveedor
} from './proveedores.js';
import {
  listarSolicitudes,
  obtenerSolicitud,
  crearSolicitud,
  enviarSolicitud,
  aprobarSolicitud,
  anularSolicitud,
  productosActivos,
  centrosCosto,
  productoPorId,
  precioSugerido
} from './solicitudes.js';
import {
  compararCotizaciones,
  registrarCotizacion,
  seleccionarCotizacion,
  descartarCotizacion
} from './cotizaciones.js';
import {
  listarOrdenes,
  emitirOrdenCompra,
  anularOrdenCompra,
  lineasPendientes
} from './ordenes-compra.js';
import {
  listarRecepciones,
  registrarRecepcion,
  unidadesAceptadasPorProducto,
  vistaRecepcion
} from './recepciones.js';
import {
  listarFacturas,
  registrarFactura,
  conciliarFactura,
  aprobarPago,
  rechazarFactura,
  alertasVencimiento
} from './facturas.js';
import {
  listarDevoluciones,
  registrarDevolucion,
  aprobarDevolucion,
  rechazarDevolucion
} from './devoluciones.js';
import {
  listarCatalogo,
  catalogoEnriquecido,
  agregarProductoCatalogo,
  actualizarProductoCatalogo,
  desactivarProductoCatalogo,
  precioReferenciaVigente
} from './catalogo.js';
import { listarEvaluaciones, registrarEvaluacion, promedioProveedor } from './evaluaciones.js';
import { construirPanel } from './panel.js';
import { cadenaDocumental, historialDe } from './trazabilidad.js';
import {
  GRUPOS,
  RUT_OCULTO,
  nivelVista,
  puedeVerRutProveedor,
  vistasVisibles
} from './visibilidad.js';
import { abrirAsistente } from './asistente.js';
import {
  AYUDA_CUENTA_RUT,
  BANCOS_CHILE,
  TIPOS_CUENTA,
  datosCuentaRut,
  esCuentaRut,
  normalizarBanco,
  normalizarTipoCuenta
} from './catalogos-bancarios.js';
import {
  exportarProveedores,
  exportarSolicitudes,
  exportarOrdenes,
  exportarRecepciones,
  exportarFacturas,
  exportarTrazabilidad
} from './exportacion.js';

/** Etiquetas legibles de los roles; las claves internas se mantienen intactas. */
export const ETIQUETAS_ROL = Object.freeze({
  solicitante: 'Solicitante',
  comprador: 'Comprador',
  jefe_compras: 'Jefe de Compras',
  bodega: 'Encargado de Bodega',
  admin_ti: 'Administrador TI'
});

/** Devuelve la etiqueta legible de un rol, sin exponer guiones bajos. */
export function etiquetaRol(rol) {
  const clave = String(rol ?? '');
  if (ETIQUETAS_ROL[clave]) return ETIQUETAS_ROL[clave];
  return (
    clave
      .split('_')
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ') || 'Sin rol'
  );
}

/** Devuelve la etiqueta legible de un estado, sin guiones bajos. */
export function etiquetaEstado(estado) {
  const texto = String(estado ?? '')
    .replace(/aprobacion/g, 'aprobación')
    .split('_')
    .filter(Boolean)
    .join(' ');
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const TABS = [
  { id: 'panel', label: 'Panel', grupo: 'Panel' },
  { id: 'proveedores', label: 'Proveedores', grupo: 'Adquisiciones' },
  { id: 'catalogo', label: 'Catálogo', grupo: 'Adquisiciones' },
  { id: 'evaluaciones', label: 'Evaluaciones', grupo: 'Adquisiciones' },
  { id: 'solicitudes', label: 'Solicitudes', grupo: 'Compras' },
  { id: 'cotizaciones', label: 'Cotizaciones', grupo: 'Compras' },
  { id: 'ordenes', label: 'Órdenes de compra', grupo: 'Compras' },
  { id: 'recepciones', label: 'Recepciones', grupo: 'Compras' },
  { id: 'facturas', label: 'Facturas', grupo: 'Compras' },
  { id: 'devoluciones', label: 'Devoluciones', grupo: 'Compras' }
];

function grupoDeTab(id) {
  return TABS.find((t) => t.id === id)?.grupo || 'Panel';
}

/** Ícono lineal de 16 px para cada entrada de la barra lateral de compras. */
function iconoNavegacion(id) {
  const paths = {
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 9v12"></path>',
    proveedores: '<path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-6h6v6"></path><path d="M9 10h1"></path><path d="M14 10h1"></path>',
    catalogo: '<path d="M4 5h16v14H4z"></path><path d="M4 9h16"></path><path d="M9 9v10"></path>',
    evaluaciones: '<path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.1l5.8-.8L12 3z"></path>',
    solicitudes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 15h6"></path><path d="M12 12v6"></path>',
    cotizaciones: '<path d="M4 6h16v12H4z"></path><path d="M8 10h8"></path><path d="M8 14h5"></path><circle cx="17" cy="14" r="1"></circle>',
    ordenes: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h10"></path><path d="M7 12h6"></path><path d="M16 16h2"></path>',
    recepciones: '<path d="M3 7h11v10H3z"></path><path d="M14 11h4l3 3v3h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    facturas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"></path><path d="M9 8h6"></path><path d="M9 12h6"></path>',
    devoluciones: '<path d="M9 7L4 12l5 5"></path><path d="M4 12h10a6 6 0 0 1 6 6"></path>'
  };
  const contenido = paths[id] || paths.panel;
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${contenido}</svg>`;
}

function botonNavegacion(tabActual, idActual) {
  const activo = tabActual.id === idActual;
  return `<button type="button" id="nav-tab-${tabActual.id}" class="side-nav-item${activo ? ' active' : ''}" data-nav-tab="${tabActual.id}" aria-controls="compras-content"${activo ? ' aria-current="page"' : ''}>${iconoNavegacion(tabActual.id)}<span>${esc(tabActual.label)}</span></button>`;
}

function tabsPara(usuario) {
  const visibles = new Set(vistasVisibles(usuario));
  return TABS.filter((t) => visibles.has(t.id));
}

function puedeOperar(vista, permiso, usuario) {
  return nivelVista(vista, usuario) === 'opera' && puede(permiso, usuario);
}

function esPropia(registro, usuario) {
  return registro?.solicitante_id === usuario?.id;
}

function ordenesVisibles(usuario) {
  return listarOrdenes({ usuario });
}

function recepcionesVisibles(usuario) {
  return listarRecepciones({ usuario });
}

let tab = 'panel';
let provFiltro = '';
let provEditId = null;
let provFormVisible = false;
let provBancoId = '';
let solFiltro = '';
let solEstado = '';
let solFormVisible = false;
let cotSolicitudId = '';
let ocSolicitudId = '';
let ocCotizacionId = '';
let recOrdenId = '';
let facOrdenId = '';
let devOrdenId = '';
let catProveedorId = '';
let catFiltro = '';
let evalOrdenId = '';
let traza = null;
let modalAdmin = null;

export function reiniciarVistaCompras() {
  tab = 'panel';
  traza = null;
  modalAdmin = null;
  qs('modal-admin')?.remove();
}

function qs(id) {
  return document.getElementById(id);
}
function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
function clp(v) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(v) || 0);
}
function fecha(v) {
  return v ? String(v).split('-').reverse().join('-') : '';
}
function textoPlazo(dias, conUnidad = false) {
  const n = Number(dias) || 0;
  if (n < 0) {
    const retraso = Math.abs(n);
    return `retraso de ${retraso} ${retraso === 1 ? 'día' : 'días'}`;
  }
  return conUnidad ? `${n} ${n === 1 ? 'día' : 'días'}` : String(n);
}
function badge(estado) {
  return `<span class="badge badge-${esc(estado)}">${esc(etiquetaEstado(estado))}</span>`;
}
/** Celda de identidad con el RUT solo cuando la sesión puede verlo. */
function celdaUsuario(id, contexto = 'listado') {
  const identidad = datosUsuario(id, getUsuarioActivo(), contexto);
  const rut =
    identidad.rut_visible && identidad.rut_visible !== RUT_OCULTO
      ? ` <span class="muted">${esc(identidad.rut_visible)}</span>`
      : '';
  return `${esc(identidad.nombre)}${rut}`;
}
function nombreProveedor(id) {
  return obtenerProveedor(id)?.name || id || '';
}
function nombreProducto(id) {
  return productoPorId(id)?.nombre || id || '';
}
function pedirTexto(mensaje) {
  return typeof window !== 'undefined' && typeof window.prompt === 'function'
    ? window.prompt(mensaje)
    : '';
}
function aviso(mensaje) {
  const banner = qs('compras-aviso');
  if (banner) {
    banner.textContent = mensaje;
    banner.hidden = false;
    banner.focus();
    return;
  }
  if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(mensaje);
  else console.warn(mensaje);
}
function confirmar(mensaje) {
  return typeof window !== 'undefined' && typeof window.confirm === 'function'
    ? window.confirm(mensaje)
    : true;
}
function opciones(items, seleccionado, vacio = '-- Selecciona --') {
  return `<option value="">${esc(vacio)}</option>${items
    .map((item) => {
      const value = typeof item === 'string' ? item : item.value;
      const label =
        typeof item === 'string' ? etiquetaEstado(item) : item.label;
      return `<option value="${esc(value)}"${String(value) === String(seleccionado) ? ' selected' : ''}>${esc(label)}</option>`;
    })
    .join('')}`;
}

const ERRORES_POR_CAMPO = [
  [/razón social|razon social/i, ['#prov-razon']],
  [/rut/i, ['#prov-rut']],
  [/banco|cuenta/i, ['#prov-banco-cuenta', '#prov-banco-banco', '#prov-cuenta', '#prov-banco']],
  [/condición de pago|condicion de pago|plazo mayor|días/i, ['#prov-dias', '#cot-condicion', '#oc-condicion']],
  [/correo/i, ['#prov-email']],
  [/justificación|justificacion/i, ['#sol-justificacion']],
  [/producto/i, ['.sol-producto', '#cat-form-producto']],
  [/cantidad/i, ['.sol-cantidad', '.rec-aceptada', '.dev-cantidad', '.cot-cantidad']],
  [/precio/i, ['#cat-form-precio', '.cot-precio']],
  [/fecha|validez/i, ['#cot-validez', '#sol-fecha']],
  [/folio/i, ['#fac-folio']],
  [/neto/i, ['#fac-neto']],
  [/iva/i, ['#fac-iva']],
  [/total/i, ['#fac-total']],
  [/nota de crédito|referencia/i, ['#fac-referencia']],
  [/motivo/i, ['.dev-motivo', '.rec-motivo']],
  [/calidad/i, ['#eval-calidad']],
  [/atención|atencion/i, ['#eval-atencion']],
  [/proveedor/i, ['#cot-proveedor', '#cat-form-proveedor', '#oc-proveedor']]
];

let contadorEtiquetas = 0;

function asociarEtiquetas(raiz = document) {
  raiz.querySelectorAll('label').forEach((label) => {
    if (label.htmlFor) return;
    const control = label.parentElement?.querySelector('input, select, textarea');
    if (!control) return;
    if (!control.id) control.id = `campo-${++contadorEtiquetas}`;
    label.htmlFor = control.id;
  });
}

function mostrarErrorCampo(formulario, mensaje) {
  formulario.querySelectorAll('.campo-error').forEach((nodo) => nodo.remove());
  const patron = ERRORES_POR_CAMPO.find(([expresion]) => expresion.test(mensaje));
  let control = null;
  if (patron) {
    for (const selector of patron[1]) {
      const candidato = formulario.querySelector(selector);
      if (candidato) {
        control = candidato;
        break;
      }
    }
  }
  if (!control) {
    control = formulario.querySelector(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
  }
  const id = `error-campo-${++contadorEtiquetas}`;
  const error = document.createElement('p');
  error.className = 'error campo-error';
  error.id = id;
  error.setAttribute('role', 'alert');
  error.textContent = mensaje;
  if (control) {
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', id);
    control.insertAdjacentElement('afterend', error);
    control.focus();
  } else {
    formulario.prepend(error);
  }
}

/** Asocia etiquetas huérfanas y nombres accesibles a los controles del módulo. */
function mejorarAccesibilidad(root) {
  const controles = 'input:not([type="hidden"]), select, textarea';

  root.querySelectorAll('th').forEach((th) => th.setAttribute('scope', 'col'));

  root.querySelectorAll('label:not([for])').forEach((etiqueta) => {
    const control = etiqueta.parentElement?.querySelector(controles);
    if (!control) return;
    control.id = control.id || `campo-${++contadorEtiquetas}`;
    etiqueta.setAttribute('for', control.id);
  });

  const etiquetasPorId = new Map(
    [...root.querySelectorAll('label[for]')].map((etiqueta) => [
      etiqueta.getAttribute('for'),
      etiqueta.textContent.replace(/\*/g, '').trim()
    ])
  );

  root.querySelectorAll(controles).forEach((control) => {
    const nombre =
      control.getAttribute('aria-label') ||
      control.getAttribute('aria-labelledby') ||
      etiquetasPorId.get(control.id);
    if (nombre) return;
    const texto =
      control.getAttribute('placeholder') ||
      control.closest('div')?.querySelector('label')?.textContent ||
      'Campo del formulario';
    control.setAttribute('aria-label', texto.replace(/\*/g, '').trim());
  });
}

function ejecutar(fn, formulario) {
  try {
    fn();
    renderComprasView();
  } catch (e) {
    if (formulario) mostrarErrorCampo(formulario, e.message);
    else aviso(e.message);
  }
}

export function renderComprasView() {
  const root = qs('compras-root');
  if (!root) return;
  asegurarSemilla();
  const usuario = getUsuarioActivo();
  const visibles = tabsPara(usuario);
  if (!visibles.some((t) => t.id === tab)) tab = 'panel';
  const activo = visibles.find((t) => t.id === tab);
  const esAdminTI = usuario.rol === 'admin_ti';

  const nav = document.querySelector('.side-nav');
  if (nav) {
    nav.innerHTML = `
      <p class="side-nav-titulo">Adquisiciones y Compras</p>
      ${Object.entries(GRUPOS)
        .map(([grupo, ids]) => {
          const items = visibles.filter((t) => ids.includes(t.id));
          if (!items.length) return '';
          const tituloGrupo =
            grupo === 'Panel'
              ? '<p class="side-nav-grupo-titulo sr-only">Panel</p>'
              : `<p class="side-nav-grupo-titulo">${esc(grupo)}</p>`;
          return `<div class="side-nav-grupo" aria-label="${esc(grupo)}">
            ${tituloGrupo}
            ${items.map((t) => botonNavegacion(t, tab)).join('')}
          </div>`;
        })
        .join('')}
    `;
  }

  const esPanel = tab === 'panel';
  const kicker = esPanel ? 'ADQUISICIONES Y COMPRAS' : seccionActual(visibles);
  const titulo = esPanel ? 'Resumen General' : activo?.label || 'Panel';
  const subtitulo = esPanel
    ? 'Vista general del ciclo de compra, pendientes por rol y alertas del período.'
    : 'Ciclo completo de compra: solicitud, cotización, OC, recepción, factura y devolución.';

  root.innerHTML = `
    <div id="compras-aviso" class="compras-aviso" role="alert" aria-live="assertive" tabindex="-1" hidden></div>
    <div class="compras-header${esAdminTI ? ' admin-ti-activo' : ''}">
      <div>
        <p class="muted compras-seccion" aria-live="polite">${esc(kicker)}</p>
        <div class="compras-titulo-fila">
          <h1 id="compras-titulo" tabindex="-1">${esc(titulo)}</h1>
          ${esAdminTI ? '<span class="admin-ti-badge" aria-label="Privilegios elevados: Administrador TI"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.6 4.4 12.5l.7-4L2.2 5.7l4-.6L8 1.5z"></path></svg>Privilegios elevados</span>' : ''}
        </div>
        <p class="muted">${esc(subtitulo)}</p>
      </div>
    </div>

    <div id="compras-content" class="compras-content" role="region" aria-labelledby="compras-titulo" tabindex="0"></div>
  `;

  (nav ? [...nav.querySelectorAll('[data-nav-tab]')] : []).forEach((btn) => {
    btn.addEventListener('click', () => irA(btn.dataset.navTab));
  });

  renderComprasTab();
  renderTrazaCadena();
  mejorarAccesibilidad(root);
  root.querySelectorAll('[data-traza]').forEach((btn) =>
    btn.addEventListener('click', () => {
      traza = { tipo: btn.dataset.traza, id: btn.dataset.id };
      renderComprasView();
    })
  );
  root.onclick = (evento) => {
    const boton = evento.target.closest?.(
      '[data-ir], [data-traza-ir], [data-usuario-id], [data-admin-accion]'
    );
    if (!boton || !root.contains(boton)) return;
    if (boton.dataset.usuarioId) {
      abrirModalAdmin({ tipo: 'usuario', id: boton.dataset.usuarioId });
      return;
    }
    if (boton.dataset.adminAccion) {
      manejarAccionAdmin(boton.dataset.adminAccion, boton.dataset.id);
      return;
    }
    irA(boton.dataset.ir || boton.dataset.trazaIr);
  };
}

function renderComprasTab() {
  const vistas = {
    panel: renderPanel,
    proveedores: renderProveedores,
    solicitudes: renderSolicitudes,
    cotizaciones: renderCotizaciones,
    ordenes: renderOrdenes,
    recepciones: renderRecepciones,
    facturas: renderFacturas,
    devoluciones: renderDevoluciones,
    catalogo: renderCatalogo,
    evaluaciones: renderEvaluaciones
  };
  (vistas[tab] || renderPanel)();
  asociarEtiquetas(qs('compras-content'));
}

function seccionActual(visibles = TABS) {
  const actual = visibles.find((t) => t.id === tab);
  if (!actual) return 'Panel';
  return tab === 'panel' ? 'Panel' : `${grupoDeTab(tab)} › ${actual.label}`;
}

function irA(nuevaTab) {
  if (!nuevaTab || !nivelVista(nuevaTab, getUsuarioActivo())) {
    aviso('Tu rol no tiene acceso a esta vista');
    return;
  }
  tab = nuevaTab;
  renderComprasView();
}

function iconoSvg(nombre, tamano = 20) {
  const attrs = `viewBox="0 0 24 24" width="${tamano}" height="${tamano}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"`;
  const paths = {
    solicitud:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 15h6"></path><path d="M12 12v6"></path>',
    orden:
      '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h10"></path><path d="M7 12h6"></path><path d="M16 16h2"></path>',
    recepcion:
      '<path d="M21 8l-9-5-9 5 9 5 9-5z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path>',
    factura:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path>',
    pago: '<circle cx="12" cy="12" r="9"></circle><path d="M8.5 15.5c.7.9 1.9 1.5 3.5 1.5 2 0 3.5-1 3.5-2.6 0-1.5-1.1-2.3-3.2-2.7l-1-.2c-1.7-.3-2.5-.9-2.5-2 0-1.3 1.3-2.2 3-2.2 1.4 0 2.5.5 3.1 1.3"></path><path d="M12 6v2"></path><path d="M12 17v2"></path>',
    proveedor:
      '<path d="M3 21h18"></path><path d="M5 21V7l8-4 6 3v15"></path><path d="M9 10h1"></path><path d="M14 10h1"></path><path d="M9 14h1"></path><path d="M14 14h1"></path><path d="M10 21v-4h4v4"></path>',
    comprometido: '<path d="M3 17l5-5 4 4 7-9"></path><path d="M14 7h5v5"></path>',
    abiertas: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    aprobadas: '<path d="M20 6L9 17l-5-5"></path>',
    asistente:
      '<path d="M21 12a8 8 0 0 1-8 8H8l-4 2 1.2-4A8 8 0 1 1 21 12z"></path><path d="M12 8l1.1 2.4L15.5 11l-2.4 1.1L12 14.5l-1.1-2.4L8.5 11l2.4-.6L12 8z"></path>',
    montoPago:
      '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path><path d="M6 15h4"></path>'
  };
  return `<svg ${attrs}>${paths[nombre] || ''}</svg>`;
}

function resumenFlujo() {
  const usuario = getUsuarioActivo();
  const solicitudes = listarSolicitudes(usuario).filter(
    (s) => usuario.rol !== 'bodega' || esPropia(s, usuario)
  );
  const ordenes = ordenesVisibles(usuario);
  const recepciones = recepcionesVisibles(usuario);
  const facturas = listarFacturas();
  const etapas = [
    {
      id: 'solicitudes',
      label: 'Solicitudes',
      valor: solicitudes.filter((s) =>
        ['aprobada', 'en_cotizacion', 'adjudicada'].includes(s.estado)
      ).length,
      total: solicitudes.length
    },
    {
      id: 'ordenes',
      label: 'Órdenes',
      valor: ordenes.filter((o) => o.estado !== 'anulada').length,
      total: ordenes.length
    },
    {
      id: 'recepciones',
      label: 'Recepciones',
      valor: recepciones.length,
      total: Math.max(recepciones.length, ordenes.length)
    },
    {
      id: 'facturas',
      label: 'Facturas',
      valor: facturas.filter((f) => ['conciliada', 'aprobada_pago'].includes(f.estado)).length,
      total: facturas.length
    }
  ];
  const permitidas = new Set(tabsPara(usuario).map((t) => t.id));
  const etapasVisibles = etapas.filter((e) => permitidas.has(e.id));
  const max = Math.max(1, ...etapasVisibles.map((e) => e.total));
  return etapasVisibles
    .map((e) => {
      const pct = Math.round((e.valor / max) * 100);
      return `<button type="button" class="flow-step" data-ir="${esc(e.id)}" aria-label="${esc(e.label)}: ${e.valor} de ${e.total}">
        <span class="flow-step-head"><span>${esc(e.label)}</span><strong>${e.valor}</strong></span>
        <span class="flow-bar" role="presentation"><span class="flow-bar-fill" style="width:${pct}%"></span></span>
        <span class="muted flow-step-meta">${e.valor} de ${e.total}</span>
      </button>`;
    })
    .join('');
}

function fechaHora(valor) {
  return String(valor ?? '')
    .replace('T', ' ')
    .slice(0, 16);
}

function renderTrazaCadena() {
  if (!traza) return;
  const content = qs('compras-content');
  if (!content) return;
  const usuario = getUsuarioActivo();
  const cadena = cadenaDocumental(traza.tipo, traza.id);
  const eventos = historialDe(traza.tipo, traza.id);
  const puedeHistorial =
    Boolean(nivelVista('trazabilidad', usuario)) && puede('consultar_trazabilidad', usuario);
  const puedeExportar = puedeHistorial && puede('exportar_trazabilidad', usuario);
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'compras-traza';
  card.innerHTML = `
    <div class="toolbar"><h2>Cadena documental y trazabilidad</h2><button type="button" id="traza-cerrar" class="secondary">Cerrar</button></div>
    ${
      cadena.length === 0
        ? '<div class="empty">No se encontró la cadena documental.</div>'
        : `<ol class="traza-cadena">${cadena
            .map((n) => {
              const visible = Boolean(nivelVista(n.tab, usuario));
              const factura =
                n.tipo === 'factura' ? leer('facturas').find((f) => f.id === n.id) : null;
              const credito = Number(factura?.credito_a_favor) || 0;
              const detalleCredito =
                credito > 0 ? ` <span class="muted">Crédito a favor: ${clp(credito)}</span>` : '';
              return `<li>${badge(n.estado)} ${
                visible
                  ? `<button type="button" class="link" data-traza-ir="${esc(n.tab)}">${esc(n.etiqueta)}</button>`
                  : `<span class="traza-nodo-sin-acceso" aria-disabled="true">${esc(n.etiqueta)}</span>`
              }${detalleCredito}</li>`;
            })
            .join('')}</ol>`
    }
    ${
      puedeHistorial
        ? `<div class="toolbar"><h3>Historial de cambios</h3>${puedeExportar ? '<button type="button" id="traza-exportar" class="secondary">Exportar historial</button>' : ''}</div>
    ${
      eventos.length === 0
        ? '<div class="empty">Sin eventos registrados.</div>'
        : `<table><thead><tr><th>Fecha y hora</th><th>Acción</th><th>Estado anterior</th><th>Estado nuevo</th><th>Usuario</th><th>Detalle</th></tr></thead><tbody>
      ${eventos
        .map(
          (e) =>
            `<tr><td>${esc(fechaHora(e.fecha_hora))}</td><td>${esc(e.accion)}</td><td>${esc(etiquetaEstado(e.estado_anterior))}</td><td>${esc(etiquetaEstado(e.estado_nuevo))}</td><td>${celdaUsuario(e.usuario_id, 'auditoria')}</td><td>${esc(
              e.detalle
            )}</td></tr>`
        )
        .join('')}
      </tbody></table>`
    }`
        : '<p class="muted">El historial de eventos no está disponible para tu rol.</p>'
    }
  `;
  content.appendChild(card);
  qs('traza-cerrar').addEventListener('click', () => {
    traza = null;
    renderComprasView();
  });
  if (puedeExportar) {
    qs('traza-exportar').addEventListener('click', () =>
      exportarTrazabilidad({ entidad: traza.tipo, entidad_id: traza.id, usuario })
    );
  }
}

/** Padrón de usuarios de Administración TI con RUT resuelto por la matriz canónica. */
function renderPadronUsuarios(usuario, usuarios = listarPadronUsuarios(usuario)) {
  const filas = usuarios
    .map((empleado) => {
      return `<tr>
        <td><button type="button" class="link usuario-link" data-usuario-id="${esc(empleado.id)}" aria-label="Abrir ficha de ${esc(empleado.nombre)}">${esc(empleado.nombre)}</button></td>
        <td>${esc(ETIQUETAS_ROL[empleado.rol] || empleado.rol)}</td>
        <td>${esc(empleado.rut_visible)}</td>
        <td>${esc(empleado.email)}</td>
        <td>${esc(empleado.centro_codigo)} · ${esc(empleado.centro_nombre)}</td>
        <td><span class="badge badge-${empleado.activo ? 'aprobado' : 'bloqueado'}">${esc(empleado.estado)}</span></td>
        <td class="actions">${
          empleado.id === usuario?.id
            ? '—'
            : `<button type="button" class="link" data-admin-accion="estado" data-id="${esc(empleado.id)}">${empleado.activo ? 'Suspender' : 'Reactivar'}</button>`
        }</td>
      </tr>`;
    })
    .join('');
  return `<div class="card" id="padron-usuarios">
    <div class="toolbar">
      <h2>Padrón de Usuarios · Administración TI</h2>
      <span class="muted">${usuarios.length} cuentas · RUT completo para este rol</span>
    </div>
    <table>
      <thead><tr><th>Nombre</th><th>Rol</th><th>RUT</th><th>Correo corporativo</th><th>Centro de costo</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>`;
}

/** Panel de gobernanza: padrón, notificaciones, parámetros y auditoría forense. */
function renderPanelAdministracion(usuario) {
  const usuarios = listarPadronUsuarios(usuario);
  const notificaciones = listarNotificaciones(usuario.id);
  const eventos = listarEventosForenses();
  const parametros = obtenerParametros();
  const ultimos = eventos.slice(-8).reverse();

  const filasNotificaciones = notificaciones.length
    ? `<table><thead><tr><th>Fecha</th><th>Destinatario</th><th>Asunto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${notificaciones
        .map(
          (n) => `<tr>
            <td>${esc(fechaHora(n.fecha_creacion))}</td>
            <td>${esc(leer('usuarios').find((u) => u.id === n.id_destinatario)?.nombre || n.id_destinatario)}</td>
            <td>${esc(n.mensaje)}</td>
            <td>${esc(n.estado)}</td>
            <td>${n.leida ? '<span class="muted">Leída</span>' : `<button type="button" class="link" data-admin-accion="leer-notif" data-id="${esc(n.id)}">Marcar leída</button>`}</td>
          </tr>`
        )
        .join('')}</tbody></table>`
    : '<div class="empty">No hay notificaciones internas.</div>';

  const filasAuditoria = ultimos.length
    ? `<table><thead><tr><th>Timestamp</th><th>Actor</th><th>Afectado</th><th>Evento</th><th>Campos modificados</th><th>OTP</th></tr></thead><tbody>${ultimos
        .map(
          (e) => `<tr>
            <td>${esc(fechaHora(e.timestamp))}</td>
            <td>${esc(e.actor)}</td>
            <td>${esc(e.usuario_afectado || '—')}</td>
            <td>${esc(e.tipo_evento)}</td>
            <td>${esc(e.campos_modificados)}</td>
            <td>${e.otp_validado ? 'Sí' : 'No'}</td>
          </tr>`
        )
        .join('')}</tbody></table>`
    : '<div class="empty">Todavía no hay eventos forenses.</div>';

  return `
    ${renderPadronUsuarios(usuario, usuarios)}
    <div class="card" id="admin-notificaciones">
      <div class="toolbar"><h2>Notificaciones internas</h2><span class="muted">${notificaciones.length} registros</span></div>
      ${filasNotificaciones}
    </div>
    <div class="card" id="admin-parametros">
      <div class="toolbar"><h2>Parámetros de compras</h2><span class="muted">Requieren OTP del titular</span></div>
      <form id="admin-parametros-form" class="card-inner">
        <div class="field-row">
          <div><label for="param-umbral">Umbral de cotizaciones (CLP neto)</label><input id="param-umbral" type="number" min="1" step="1" value="${esc(parametros.umbralCotizaciones)}" /></div>
          <div><label for="param-tolerancia">Tolerancia de conciliación (0,01 = 1 %)</label><input id="param-tolerancia" type="number" min="0.0001" max="1" step="0.0001" value="${esc(parametros.toleranciaConciliacion)}" /></div>
        </div>
        <div class="form-actions">
          <button type="button" class="primary" data-admin-accion="parametros">Solicitar OTP y guardar parámetros</button>
        </div>
      </form>
    </div>
    <div class="card" id="admin-auditoria">
      <div class="toolbar">
        <h2>Log de Auditoría Forense</h2>
        <span class="badge badge-${verificarIntegridadAuditoria() ? 'aprobado' : 'bloqueado'}">${verificarIntegridadAuditoria() ? 'Integridad verificada' : 'Integridad alterada'}</span>
        <button type="button" class="secondary" data-admin-accion="exportar-auditoria">Exportar CSV</button>
      </div>
      ${filasAuditoria}
    </div>
  `;
}

function manejarAccionAdmin(accion, id) {
  if (accion === 'parametros') {
    abrirModalAdmin({ tipo: 'parametros' });
    return;
  }
  if (accion === 'estado') {
    abrirModalAdmin({ tipo: 'usuario', id });
    return;
  }
  if (accion === 'leer-notif') {
    marcarNotificacionLeida(id);
    renderComprasView();
    return;
  }
  if (accion === 'exportar-auditoria') exportarAuditoriaForense();
}

function abrirModalAdmin(config) {
  modalAdmin = {
    solicitud: null,
    token: '',
    contexto: '',
    codigoDemo: '',
    aviso: '',
    error: '',
    ...config
  };
  renderModalAdmin();
}

function cerrarModalAdmin() {
  modalAdmin = null;
  qs('modal-admin')?.remove();
}

function nombreTitular(id) {
  return leer('usuarios').find((u) => u.id === id)?.nombre || id;
}

/** Solicita el OTP del titular; la ayuda con el código solo aparece en Modo Demo. */
function solicitarOtpModal(contexto) {
  const titular =
    modalAdmin.tipo === 'usuario' ? modalAdmin.id : getUsuarioActivo()?.id || 'u-admin-1';
  const campos =
    modalAdmin.tipo === 'usuario'
      ? ['nombre', 'email', 'rut', 'rol', 'centro_costo_id']
      : [];
  const resultado = solicitarOtp({
    usuario_id: titular,
    actor_id: getUsuarioActivo()?.id || '',
    campos,
    contexto,
    modo: obtenerModo()
  });
  modalAdmin.solicitud = resultado.solicitud;
  modalAdmin.codigoDemo = resultado.ayudaDemo;
  modalAdmin.token = '';
  modalAdmin.aviso = `Notificación interna enviada a ${nombreTitular(titular)}.`;
  modalAdmin.error = '';
  renderModalAdmin();
}

/** Ejecuta una operación administrativa autorizada y refresca padrón y auditoría. */
function ejecutarAdmin(operacion, mensaje = 'Cambio guardado y registrado en la auditoría forense.') {
  try {
    operacion();
    modalAdmin.solicitud = null;
    modalAdmin.token = '';
    modalAdmin.contexto = '';
    modalAdmin.codigoDemo = '';
    modalAdmin.aviso = mensaje;
    modalAdmin.error = '';
    renderComprasView();
    renderModalAdmin();
  } catch (e) {
    modalAdmin.error = e.message;
    renderModalAdmin();
  }
}

/** Modal de detalle/edición de usuarios, parámetros y desbloqueo de excepciones. */
function renderModalAdmin() {
  qs('modal-admin')?.remove();
  if (!modalAdmin) return;
  const usuario = getUsuarioActivo();
  if (usuario?.rol !== 'admin_ti') {
    modalAdmin = null;
    return;
  }

  let titulo = '';
  let cuerpo = '';
  let acciones = '';

  if (modalAdmin.tipo === 'usuario') {
    const persona = listarPadronUsuarios(usuario).find((p) => p.id === modalAdmin.id);
    if (!persona) {
      modalAdmin = null;
      return;
    }
    const editable = Boolean(modalAdmin.token && modalAdmin.contexto === 'edicion_usuario');
    const estadoEditable = Boolean(modalAdmin.token && modalAdmin.contexto === 'suspension_usuario');
    const centros = leer('centros_costo');
    const deshabilitado = editable ? '' : 'disabled';
    titulo = `Ficha de ${persona.nombre}`;
    cuerpo = `
      <p class="muted">Los datos personales están bloqueados hasta que el titular valide un código OTP de 6 dígitos.</p>
      <div class="field-row">
        <div><label for="usuario-nombre">Nombre</label><input id="usuario-nombre" value="${esc(persona.nombre)}" ${deshabilitado} /></div>
        <div><label for="usuario-email">Correo corporativo</label><input id="usuario-email" value="${esc(persona.email)}" ${deshabilitado} /></div>
      </div>
      <div class="field-row">
        <div><label for="usuario-rut">RUT</label><input id="usuario-rut" value="${esc(persona.rut)}" ${deshabilitado} /></div>
        <div><label for="usuario-rol">Rol</label><select id="usuario-rol" ${deshabilitado}>${Object.entries(ETIQUETAS_ROL)
          .map(
            ([clave, etiqueta]) =>
              `<option value="${esc(clave)}"${clave === persona.rol ? ' selected' : ''}>${esc(etiqueta)}</option>`
          )
          .join('')}</select></div>
      </div>
      <div class="field-row">
        <div><label for="usuario-centro">Centro de costo</label><select id="usuario-centro" ${deshabilitado}>${centros
          .map(
            (c) =>
              `<option value="${esc(c.id)}"${c.id === persona.centro_costo_id ? ' selected' : ''}>${esc(c.codigo)} · ${esc(c.nombre)}</option>`
          )
          .join('')}</select></div>
        <div><label>Estado actual</label><p class="form-control-static">${esc(persona.estado)}</p></div>
      </div>
    `;
    acciones = `
      <button type="button" id="modal-admin-solicitar" class="secondary">Solicitar autorización del titular (Código OTP)</button>
      ${
        persona.id !== usuario.id
          ? '<button type="button" id="modal-admin-solicitar-estado" class="secondary">Solicitar autorización para cambiar estado</button>'
          : ''
      }
      <button type="button" id="modal-admin-guardar" class="primary" ${editable ? '' : 'disabled'}>Guardar cambios</button>
      ${
        persona.id !== usuario.id
          ? `<button type="button" id="modal-admin-estado" class="${persona.activo ? 'danger' : 'primary'}" ${estadoEditable ? '' : 'disabled'}>${persona.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}</button>`
          : ''
      }
    `;
  } else if (modalAdmin.tipo === 'parametros') {
    const parametros = obtenerParametros();
    const editable = Boolean(modalAdmin.token && modalAdmin.contexto === 'cambio_parametro');
    const deshabilitado = editable ? '' : 'disabled';
    titulo = 'Parametrización de compras';
    cuerpo = `
      <p class="muted">La titular de la solicitud (Administración TI) debe validar un código OTP antes de aplicar nuevos valores.</p>
      <div class="field-row">
        <div><label for="param-modal-umbral">Umbral de cotizaciones (CLP neto)</label><input id="param-modal-umbral" type="number" min="1" step="1" value="${esc(parametros.umbralCotizaciones)}" ${deshabilitado} /></div>
        <div><label for="param-modal-tolerancia">Tolerancia de conciliación</label><input id="param-modal-tolerancia" type="number" min="0.0001" max="1" step="0.0001" value="${esc(parametros.toleranciaConciliacion)}" ${deshabilitado} /></div>
      </div>
    `;
    acciones = `
      <button type="button" id="modal-admin-solicitar" class="secondary">Solicitar autorización del titular (Código OTP)</button>
      <button type="button" id="modal-admin-guardar-param" class="primary" ${editable ? '' : 'disabled'}>Guardar parámetros</button>
    `;
  } else if (modalAdmin.tipo === 'excepcion') {
    const proveedor = obtenerProveedor(modalAdmin.id);
    const habilitado = Boolean(modalAdmin.token && modalAdmin.contexto === 'desbloqueo_excepcion');
    titulo = 'Desbloqueo de excepción';
    cuerpo = `<p>Proveedor: <strong>${esc(proveedor?.name || modalAdmin.id)}</strong>. El desbloqueo requiere autorización OTP y queda registrado en la auditoría forense.</p>`;
    acciones = `
      <button type="button" id="modal-admin-solicitar" class="secondary">Solicitar autorización del titular (Código OTP)</button>
      <button type="button" id="modal-admin-desbloquear" class="primary" ${habilitado ? '' : 'disabled'}>Desbloquear excepción</button>
    `;
  }

  const otpPanel = modalAdmin.solicitud
    ? `<div class="otp-panel">
        <label for="modal-admin-otp">Código OTP de 6 dígitos</label>
        <div class="otp-fila">
          <input id="modal-admin-otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" aria-describedby="modal-admin-otp-ayuda" />
          <button type="button" id="modal-admin-validar" class="secondary">Validar código</button>
        </div>
        <p id="modal-admin-otp-ayuda" class="campo-ayuda">Vigencia de 5 minutos. Un código solo habilita una operación.</p>
        ${
          modalAdmin.codigoDemo
            ? `<p class="otp-demo-help">Modo Demo · código de simulación: <strong>${esc(modalAdmin.codigoDemo)}</strong></p>`
            : ''
        }
      </div>`
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'modal-admin';
  overlay.className = 'modal-admin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-admin-titulo');
  overlay.innerHTML = `
    <div class="modal-admin-card">
      <div class="toolbar">
        <h2 id="modal-admin-titulo">${esc(titulo)}</h2>
        <button type="button" class="secondary" data-modal-cerrar aria-label="Cerrar ficha">Cerrar</button>
      </div>
      ${cuerpo}
      ${otpPanel}
      ${modalAdmin.aviso ? `<p class="otp-aviso" role="status">${esc(modalAdmin.aviso)}</p>` : ''}
      ${modalAdmin.error ? `<p class="error" role="alert">${esc(modalAdmin.error)}</p>` : ''}
      <div class="form-actions modal-admin-acciones">
        ${acciones}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-modal-cerrar]').forEach((btn) =>
    btn.addEventListener('click', cerrarModalAdmin)
  );
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay) cerrarModalAdmin();
  });
  qs('modal-admin-solicitar')?.addEventListener('click', () =>
    solicitarOtpModal(
      modalAdmin.tipo === 'usuario'
        ? 'edicion_usuario'
        : modalAdmin.tipo === 'parametros'
          ? 'cambio_parametro'
          : 'desbloqueo_excepcion'
    )
  );
  qs('modal-admin-solicitar-estado')?.addEventListener('click', () =>
    solicitarOtpModal('suspension_usuario')
  );
  qs('modal-admin-validar')?.addEventListener('click', () => {
    const resultado = validarOtp(modalAdmin.solicitud.id, qs('modal-admin-otp')?.value);
    if (!resultado.ok) {
      modalAdmin.error = resultado.motivo;
      modalAdmin.token = '';
      modalAdmin.contexto = '';
    } else {
      modalAdmin.token = resultado.token;
      modalAdmin.contexto = resultado.solicitud.contexto;
      modalAdmin.codigoDemo = '';
      modalAdmin.error = '';
      modalAdmin.aviso = 'Autorización verificada. Ya puedes aplicar la operación.';
    }
    renderModalAdmin();
  });
  qs('modal-admin-guardar')?.addEventListener('click', () =>
    ejecutarAdmin(() =>
      editarUsuario({
        id: modalAdmin.id,
        cambios: {
          nombre: qs('usuario-nombre').value,
          email: qs('usuario-email').value,
          rut: qs('usuario-rut').value,
          rol: qs('usuario-rol').value,
          centro_costo_id: qs('usuario-centro').value
        },
        token: modalAdmin.token,
        actor: usuario
      })
    )
  );
  qs('modal-admin-estado')?.addEventListener('click', () => {
    const persona = listarPadronUsuarios(usuario).find((p) => p.id === modalAdmin.id);
    ejecutarAdmin(
      () =>
        cambiarEstadoUsuario({
          id: modalAdmin.id,
          suspendido: Boolean(persona?.activo),
          token: modalAdmin.token,
          actor: usuario
        }),
      'Estado de la cuenta actualizado y registrado en la auditoría forense.'
    );
  });
  qs('modal-admin-guardar-param')?.addEventListener('click', () =>
    ejecutarAdmin(() =>
      cambiarParametros({
        cambios: {
          umbralCotizaciones: qs('param-modal-umbral').value,
          toleranciaConciliacion: qs('param-modal-tolerancia').value
        },
        token: modalAdmin.token,
        actor: usuario
      })
    )
  );
  qs('modal-admin-desbloquear')?.addEventListener('click', () =>
    ejecutarAdmin(
      () => desbloquearExcepcion({ id: modalAdmin.id, token: modalAdmin.token, actor: usuario }),
      'Excepción desbloqueada y registrada en la auditoría forense.'
    )
  );
}

function renderPanel() {
  const usuario = getUsuarioActivo();
  const panel = construirPanel(usuario);
  const permitidas = new Set(tabsPara(usuario).map((t) => t.id));
  const acciones = panel.acciones.filter((a) => permitidas.has(a.vista));
  const pendientes = panel.pendientes.filter((p) => permitidas.has(p.vista));
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="stat-grid">
      <article class="stat-card stat-card--comprometido">
        <div class="stat-card-head">
          <span class="stat-icon" aria-hidden="true">${iconoSvg('comprometido')}</span>
          <span class="stat-label">Monto comprometido (${esc(panel.indicadores.mes)})</span>
        </div>
        <span class="stat-value">${clp(panel.indicadores.monto_comprometido)}</span>
      </article>
      <article class="stat-card stat-card--abiertas">
        <div class="stat-card-head">
          <span class="stat-icon" aria-hidden="true">${iconoSvg('abiertas')}</span>
          <span class="stat-label">Órdenes abiertas</span>
        </div>
        <span class="stat-value">${panel.indicadores.ordenes_abiertas}</span>
      </article>
      <article class="stat-card stat-card--aprobadas">
        <div class="stat-card-head">
          <span class="stat-icon" aria-hidden="true">${iconoSvg('aprobadas')}</span>
          <span class="stat-label">Facturas aprobadas para pago</span>
        </div>
        <span class="stat-value">${panel.indicadores.facturas_aprobadas_pago}</span>
      </article>
      <article class="stat-card stat-card--monto-aprobado">
        <div class="stat-card-head">
          <span class="stat-icon" aria-hidden="true">${iconoSvg('montoPago')}</span>
          <span class="stat-label">Monto aprobado para pago</span>
        </div>
        <span class="stat-value">${clp(panel.indicadores.monto_aprobado_pago)}</span>
      </article>
    </div>
    ${panel.vacio ? '<div class="empty">No tienes pendientes para tu rol. ¡Todo al día!</div>' : ''}
    <div class="card">
      <h2>Acciones rápidas</h2>
      <div class="action-grid">
        ${acciones
          .map(
            (a) => `<button type="button" class="action-card" data-ir="${esc(a.vista)}">
          <span class="action-card-icon" aria-hidden="true">${iconoSvg(a.icono)}</span>
          <span class="action-card-body">
            <strong>${esc(a.etiqueta)}</strong>
            <span class="muted">${esc(a.descripcion || '')}</span>
          </span>
        </button>`
          )
          .join('')}
        <button type="button" class="action-card action-card--asistente" data-accion="asistente-ia">
          <span class="action-card-icon" aria-hidden="true">${iconoSvg('asistente')}</span>
          <span class="action-card-body">
            <strong>Asistente IA de Compras</strong>
            <span class="muted">Consulta estados y ejecuta acciones permitidas según tu rol.</span>
            <span class="action-card-badge">IA Corporativa</span>
          </span>
        </button>
      </div>
    </div>
    <div class="card">
      <h2>Resumen del ciclo de compras</h2>
      <div class="flow-summary">${resumenFlujo()}</div>
    </div>
    ${usuario?.rol === 'admin_ti' ? renderPanelAdministracion(usuario) : ''}
    <div class="card">
      <h2>Pendientes por rol</h2>
      ${
        pendientes.length === 0
          ? '<div class="empty">Sin pendientes.</div>'
          : `<div class="pending-grid">${pendientes
              .map(
                (p) => `
        <button type="button" class="pending-card" data-ir="${esc(p.vista)}">
          <span class="pending-card-head">
            <span class="pending-card-title">${esc(p.titulo)}</span>
            <span class="counter">${p.cantidad}</span>
          </span>
          <span class="muted pending-card-detail">${esc(p.detalle)}</span>
          <span class="pending-card-list">${p.items
            .slice(0, 4)
            .map(
              (item) =>
                `<span class="pending-card-item"><span class="pending-card-item-label">${esc(item.etiqueta)}</span><span class="pending-card-meta">${item.monto !== undefined ? esc(clp(item.monto)) : ''} ${badge(item.estado)}</span></span>`
            )
            .join('')}</span>
          <span class="pending-card-cta">Ver ${esc(TABS.find((t) => t.id === p.vista)?.label || 'detalle')} →</span>
        </button>
      `
              )
              .join('')}</div>`
      }
    </div>
    <div class="card">
      <h2>Alertas de vencimiento (5 días o menos)</h2>
      ${
        panel.alertas.length === 0
          ? '<div class="empty">No hay facturas próximas a vencer.</div>'
          : `
        <table><thead><tr><th>Proveedor</th><th>Folio</th><th>Vence</th><th>Días restantes</th><th>Estado</th></tr></thead><tbody>
        ${panel.alertas.map((f) => `<tr><td>${esc(nombreProveedor(f.proveedor_id))}</td><td>${esc(f.folio)}</td><td>${fecha(f.fecha_vencimiento)}</td><td>${textoPlazo(f.dias_restantes)}</td><td>${badge(f.estado)}</td></tr>`).join('')}
        </tbody></table>`
      }
    </div>
    <div class="card">
      <h2>Seguimiento de OC sin recepción (más de 7 días)</h2>
      ${
        panel.seguimiento.length === 0
          ? '<div class="empty">No hay órdenes atrasadas.</div>'
          : `
        <table><thead><tr><th>OC</th><th>Proveedor</th><th>Emitida</th><th>Días esperando</th><th>Total</th></tr></thead><tbody>
        ${panel.seguimiento.map((o) => `<tr><td>${esc(o.numero)}</td><td>${esc(nombreProveedor(o.proveedor_id))}</td><td>${fecha(o.fecha_emision)}</td><td>${o.dias_esperando}</td><td>${clp(o.total)}</td></tr>`).join('')}
        </tbody></table>`
      }
    </div>
  `;
  content
    .querySelectorAll('[data-ir]')
    .forEach((btn) => btn.addEventListener('click', () => irA(btn.dataset.ir)));
  content
    .querySelectorAll('[data-accion="asistente-ia"]')
    .forEach((btn) => btn.addEventListener('click', abrirAsistente));
}

function renderProveedores() {
  const usuario = getUsuarioActivo();
  const visibilidad = validarVisibilidadDatosBancarios(usuario.rol);
  const rutProveedorVisible = puedeVerRutProveedor(usuario.rol);
  const puedeGestionar = puedeOperar('proveedores', 'gestionar_proveedores', usuario);
  const puedeBanco = puedeOperar('proveedores', 'editar_datos_bancarios', usuario);
  const puedeDesbloquear = puedeOperar('proveedores', 'desbloquear_proveedor', usuario);
  const lista = (provFiltro
    ? buscarProveedores(provFiltro, usuario)
    : listarProveedores()
  ).map((p) => vistaProveedor(p, usuario.rol));
  const proveedorEditado = provEditId ? obtenerProveedor(provEditId) : null;
  const editando = proveedorEditado;
  const editandoBanco = proveedorEditado
    ? vistaProveedor(proveedorEditado, usuario.rol)
    : null;
  const seleccionBanco = provBancoId ? lista.find((p) => p.id === provBancoId) : lista[0];
  provBancoId = seleccionBanco?.id || '';

  /** Aplica la regla de CuentaRUT sobre los controles ya renderizados. */
  function aplicarAutoRellenoCuentaRut() {
    const tipo = qs('prov-banco-tipo');
    const ayuda = qs('prov-cuenta-ayuda');
    const banco = qs('prov-banco-banco');
    const cuenta = qs('prov-banco-cuenta');
    if (!tipo || !ayuda || !banco || !cuenta) return;
    if (!esCuentaRut(tipo.value)) {
      ayuda.textContent = '';
      ayuda.hidden = true;
      return;
    }
    const proveedor = obtenerProveedor(qs('prov-banco-proveedor')?.value || provBancoId);
    const datos = datosCuentaRut(proveedor);
    banco.value = datos.banco;
    if (datos.numero_cuenta) cuenta.value = datos.numero_cuenta;
    ayuda.textContent = AYUDA_CUENTA_RUT;
    ayuda.hidden = false;
  }

  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <input id="prov-search" class="prov-search" aria-label="Buscar proveedores" placeholder="Buscar por razón social, nombre de fantasía, RUT, rubro, contacto o región" value="${esc(provFiltro)}" />
        <button type="button" id="prov-buscar" class="secondary">Buscar</button>
        ${puedeGestionar ? '<button type="button" id="prov-nuevo" class="primary">Nuevo proveedor</button>' : ''}
        <button type="button" id="prov-exportar" class="secondary">Exportar CSV</button>
        <button type="button" id="prov-cargar-base" class="secondary" title="Disponible también en Modo Real: completa los catálogos maestros sin borrar tus registros">Cargar catálogo base de proveedores/insumos</button>
      </div>
      ${
        puedeGestionar && provFormVisible
          ? `
      <form id="prov-form" class="card-inner">
        <h2>${editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
        <div class="field-row"><div><label>Razón social *</label><input id="prov-razon" value="${esc(editando?.name || '')}" /></div><div><label>Código</label><input id="prov-codigo" value="${esc(editando?.code || '')}" /></div></div>
        <div class="field-row"><div><label>RUT *</label><input id="prov-rut" value="${esc(editando?.taxId || '')}" placeholder="12.345.678-5" /></div><div><label>Tipo de persona *</label><select id="prov-tipo">${opciones(['jurídica', 'natural'], editando?.tipo_persona)}</select></div></div>
        <div class="field-row"><div><label>Giro *</label><input id="prov-giro" value="${esc(editando?.giro || '')}" /></div><div><label>Región *</label><input id="prov-region" value="${esc(editando?.region || '')}" /></div></div>
        <div class="field-row"><div><label>Comuna</label><input id="prov-comuna" value="${esc(editando?.comuna || '')}" /></div><div><label>Dirección</label><input id="prov-direccion" value="${esc(editando?.address || '')}" /></div></div>
        <div class="field-row"><div><label>Teléfono</label><input id="prov-telefono" value="${esc(editando?.phone || '')}" /></div><div><label>Correo</label><input id="prov-email" value="${esc(editando?.email || '')}" /></div></div>
        <div class="field-row"><div><label>Categoría</label><input id="prov-categoria" value="${esc(editando?.category || '')}" /></div><div><label>Tamaño</label><select id="prov-tamano">${opciones(['micro', 'pequeña', 'mediana', 'grande'], editando?.tamano_empresa)}</select></div></div>
        <div class="field-row"><div><label>Condición de pago (días) *</label><input id="prov-dias" type="number" min="0" step="1" value="${esc(editando?.condicion_pago_dias ?? 30)}" /></div><div><label>Acuerdo de plazo mayor</label><input id="prov-acuerdo" value="${esc(editando?.acuerdo_plazo_mayor || '')}" placeholder="Obligatorio si supera 30 días" /></div></div>
        <div class="field-row"><div><label>Banco</label><select id="prov-banco" disabled>${opciones(
          BANCOS_CHILE,
          normalizarBanco(editandoBanco?.banco || '')
        )}</select></div><div><label>Número de cuenta</label><input id="prov-cuenta" value="${esc(
          editandoBanco?.numero_cuenta || ''
        )}" disabled /></div></div>
        <p class="muted">Los datos bancarios solo pueden ser editados por Administrador TI.</p>
        <div class="form-actions"><button type="submit" class="primary">Guardar</button><button type="button" id="prov-cancelar" class="secondary">Cancelar</button></div>
      </form>`
          : ''
      }
      ${
        puedeBanco
          ? `
      <form id="prov-banco-form" class="card-inner">
        <h2>Datos bancarios</h2>
        <div class="field-row"><div><label>Proveedor *</label><select id="prov-banco-proveedor">${opciones(
          lista.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
          provBancoId
        )}</select></div><div><label>Banco *</label><select id="prov-banco-banco">${opciones(
          BANCOS_CHILE,
          normalizarBanco(seleccionBanco?.banco || '')
        )}</select></div></div>
        <div class="field-row"><div><label>Tipo de cuenta</label><select id="prov-banco-tipo">${opciones(
          TIPOS_CUENTA,
          normalizarTipoCuenta(seleccionBanco?.tipo_cuenta || '')
        )}</select></div><div><label>Número de cuenta *</label><input id="prov-banco-cuenta" value="${esc(seleccionBanco?.numero_cuenta || '')}" /></div></div>
        <p id="prov-cuenta-ayuda" class="campo-ayuda" hidden></p>
        <div class="form-actions"><button type="submit" class="primary">Guardar datos bancarios</button></div>
      </form>`
          : ''
      }
    </div>
    <div class="card">
      <h2>Proveedores</h2>
      <p class="muted" id="prov-visibilidad">RUT tributario ${rutProveedorVisible ? 'visible' : 'oculto'} para tu rol. Cuenta ${visibilidad.visible ? 'visible' : visibilidad.editable ? 'visible y editable' : 'enmascarada'}.${puedeBanco ? '' : ' Solo Administrador TI puede editar datos bancarios.'}</p>
      ${
        lista.length === 0
          ? '<div class="empty">No hay proveedores que coincidan.</div>'
          : `
      <table><thead><tr><th>Razón social</th><th>RUT tributario</th><th>Rubro</th><th>Contacto</th><th>Banco y cuenta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (p) => `<tr>
        <td>${esc(p.name)}${p.code ? `<span class="muted"> · ${esc(p.code)}</span>` : ''}</td>
        <td>${esc(p.rut_visible)}</td>
        <td>${esc(p.rubro || p.category || p.giro || '—')}</td>
        <td>${esc(p.email || p.phone || '—')}</td>
        <td>${esc(p.banco || '—')} · ${esc(p.cuenta_visible)}</td>
        <td><span class="badge badge-${esc(p.estado_proveedor)}">${esc(
          p.estado || etiquetaEstado(p.estado_proveedor)
        )}</span></td>
        <td class="actions">
          ${puedeGestionar ? `<button type="button" class="link" data-prov-accion="editar" data-id="${esc(p.id)}">Editar</button>` : ''}
          ${puedeGestionar && p.estado_proveedor === 'potencial' ? `<button type="button" class="link" data-prov-accion="aprobar" data-id="${esc(p.id)}">Aprobar</button>` : ''}
          ${puedeGestionar && p.estado_proveedor === 'aprobado' ? `<button type="button" class="link" data-prov-accion="bloquear" data-id="${esc(p.id)}">Bloquear</button>` : ''}
          ${puedeDesbloquear && p.estado_proveedor === 'bloqueado' ? `<button type="button" class="link" data-prov-accion="desbloquear" data-id="${esc(p.id)}">Desbloquear</button>` : ''}
          ${puedeGestionar ? `<button type="button" class="link danger" data-prov-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>` : ''}
          ${!puedeGestionar && !puedeDesbloquear ? '—' : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  qs('prov-buscar').addEventListener('click', () => {
    provFiltro = qs('prov-search').value;
    renderComprasTab();
  });
  qs('prov-search').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      provFiltro = qs('prov-search').value;
      renderComprasTab();
    }
  });
  if (qs('prov-nuevo'))
    qs('prov-nuevo').addEventListener('click', () => {
      provEditId = null;
      provFormVisible = true;
      renderComprasTab();
    });
  qs('prov-exportar').addEventListener('click', () => exportarProveedores({ filtro: provFiltro }));
  qs('prov-cargar-base').addEventListener('click', () => {
    ejecutar(() => cargarCatalogoBase());
  });
  if (puedeBanco) {
    qs('prov-banco-proveedor').addEventListener('change', (ev) => {
      provBancoId = ev.target.value;
      const seleccionado = obtenerProveedor(provBancoId);
      if (!esCuentaRut(qs('prov-banco-tipo').value)) {
        qs('prov-banco-banco').value = normalizarBanco(seleccionado?.banco || '');
        qs('prov-banco-cuenta').value = seleccionado?.numero_cuenta || '';
      }
      aplicarAutoRellenoCuentaRut();
    });
    qs('prov-banco-tipo').addEventListener('change', aplicarAutoRellenoCuentaRut);
    aplicarAutoRellenoCuentaRut();
    qs('prov-banco-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = qs('prov-banco-proveedor').value;
      ejecutar(() => {
        if (!id) throw new Error('Selecciona un proveedor');
        actualizarDatosBancarios(
          id,
          {
            banco: qs('prov-banco-banco').value,
            tipo_cuenta: qs('prov-banco-tipo').value,
            numero_cuenta: qs('prov-banco-cuenta').value
          },
          usuario
        );
      }, qs('prov-banco-form'));
    });
  }
  if (puedeGestionar && provFormVisible) {
    qs('prov-cancelar').addEventListener('click', () => {
      provFormVisible = false;
      provEditId = null;
      renderComprasTab();
    });
    qs('prov-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const datos = {
        razon_social: qs('prov-razon').value,
        codigo: qs('prov-codigo').value,
        rut: qs('prov-rut').value,
        tipo_persona: qs('prov-tipo').value,
        giro: qs('prov-giro').value,
        region: qs('prov-region').value,
        comuna: qs('prov-comuna').value,
        direccion: qs('prov-direccion').value,
        telefono: qs('prov-telefono').value,
        email: qs('prov-email').value,
        categoria: qs('prov-categoria').value,
        tamano_empresa: qs('prov-tamano').value,
        condicion_pago_dias: qs('prov-dias').value,
        acuerdo_plazo_mayor: qs('prov-acuerdo').value
      };
      ejecutar(() => {
        if (provEditId) actualizarProveedor(provEditId, datos, usuario);
        else crearProveedor(datos, usuario);
        provFormVisible = false;
        provEditId = null;
      }, qs('prov-form'));
    });
  }
  content.querySelectorAll('[data-prov-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.provAccion === 'editar') {
          provEditId = id;
          provFormVisible = true;
          return;
        }
        if (btn.dataset.provAccion === 'aprobar') {
          cambiarEstadoProveedor(id, 'aprobado', usuario);
          return;
        }
        if (btn.dataset.provAccion === 'bloquear') {
          cambiarEstadoProveedor(id, 'bloqueado', usuario);
          return;
        }
        if (btn.dataset.provAccion === 'desbloquear') {
          abrirModalAdmin({ tipo: 'excepcion', id });
          return;
        }
        if (btn.dataset.provAccion === 'eliminar') {
          if (!confirmar('¿Eliminar el proveedor? Si tiene OC se sugerirá bloquearlo.')) return;
          eliminarProveedor(id, usuario);
        }
      });
    })
  );
}

function renderSolicitudes() {
  const usuario = getUsuarioActivo();
  const puedeCrear = puedeOperar('solicitudes', 'crear_solicitud', usuario);
  const puedeAprobar = puedeOperar('solicitudes', 'aprobar_solicitud', usuario);
  const puedeCotizar = nivelVista('cotizaciones', usuario) !== null;
  let lista = listarSolicitudes(usuario).filter(
    (s) => usuario.rol !== 'bodega' || esPropia(s, usuario)
  );
  if (solEstado) lista = lista.filter((s) => s.estado === solEstado);
  if (solFiltro) {
    const q = solFiltro.toLowerCase();
    lista = lista.filter((s) =>
      [s.numero, s.justificacion, s.estado].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
    );
  }
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <input id="sol-search" aria-label="Buscar solicitudes" placeholder="Buscar número, justificación o estado" value="${esc(solFiltro)}" />
        <select id="sol-estado" aria-label="Filtrar solicitudes por estado">${opciones(['borrador', 'enviada', 'aprobada', 'en_cotizacion', 'adjudicada', 'rechazada', 'anulada'], solEstado, 'Todos los estados')}</select>
        <button type="button" id="sol-buscar" class="secondary">Filtrar</button>
        ${puedeCrear ? '<button type="button" id="sol-nuevo" class="primary">Nueva solicitud</button>' : ''}
        <button type="button" id="sol-exportar" class="secondary">Exportar CSV</button>
      </div>
      ${
        puedeCrear && solFormVisible
          ? `
      <form id="sol-form" class="card-inner">
        <h2>Nueva solicitud</h2>
        <div class="field-row"><div><label>Centro de costo *</label><select id="sol-cc">${opciones(
          centrosCosto().map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` })),
          usuario.centro_costo_id
        )}</select></div><div><label>Prioridad</label><select id="sol-prioridad">${opciones(['baja', 'media', 'alta'], 'media')}</select></div></div>
        <div class="field-row"><div><label>Fecha requerida *</label><input id="sol-fecha" type="date" value="${hoyISO()}" /></div><div><label>Justificación *</label><input id="sol-justificacion" /></div></div>
        <div id="sol-lineas">
          ${renderLineasSolicitud([{ producto_id: '', cantidad: 1, precio_estimado: '' }])}
        </div>
        <button type="button" id="sol-agregar-linea" class="secondary">Agregar línea</button>
        <div class="form-actions"><button type="submit" class="primary">Crear solicitud</button><button type="button" id="sol-cancelar" class="secondary">Cancelar</button></div>
      </form>`
          : ''
      }
    </div>
    <div class="card">
      <h2>Solicitudes</h2>
      ${
        lista.length === 0
          ? '<div class="empty">No hay solicitudes que coincidan.</div>'
          : `
      <table><thead><tr><th>Número</th><th>Solicitante</th><th>Centro de costo</th><th>Prioridad</th><th>Fecha requerida</th><th>Monto estimado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (s) => `<tr>
        <td>${esc(s.numero)}</td><td>${celdaUsuario(s.solicitante_id)}</td><td>${esc(s.centro_costo_id)}</td><td>${esc(s.prioridad)}</td><td>${fecha(s.fecha_requerida)}</td><td>${clp(s.monto_estimado)}</td><td>${badge(s.estado)}</td>
        <td class="actions">
          <button type="button" class="link" data-traza="solicitud" data-id="${esc(s.id)}">Cadena</button>
          ${s.estado === 'borrador' && puedeCrear && esPropia(s, usuario) ? `<button type="button" class="link" data-sol-accion="enviar" data-id="${esc(s.id)}">Enviar</button>` : ''}
          ${s.estado === 'enviada' && puedeAprobar && !esPropia(s, usuario) ? `<button type="button" class="link" data-sol-accion="aprobar" data-id="${esc(s.id)}">Aprobar</button><button type="button" class="link danger" data-sol-accion="rechazar" data-id="${esc(s.id)}">Rechazar</button>` : ''}
          ${['aprobada', 'en_cotizacion'].includes(s.estado) && puedeCotizar ? `<button type="button" class="link" data-sol-accion="cotizar" data-id="${esc(s.id)}">Cotizaciones</button>` : ''}
          ${!['adjudicada', 'anulada', 'rechazada'].includes(s.estado) && puedeCrear && esPropia(s, usuario) ? `<button type="button" class="link danger" data-sol-accion="anular" data-id="${esc(s.id)}">Anular</button>` : ''}
          ${!esPropia(s, usuario) ? '<span class="badge badge-lectura">Solo lectura</span>' : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  qs('sol-buscar').addEventListener('click', () => {
    solFiltro = qs('sol-search').value;
    solEstado = qs('sol-estado').value;
    renderComprasTab();
  });
  qs('sol-exportar').addEventListener('click', () =>
    exportarSolicitudes(usuario, { filtro: solFiltro })
  );
  if (puedeCrear && qs('sol-nuevo'))
    qs('sol-nuevo').addEventListener('click', () => {
      solFormVisible = true;
      renderComprasTab();
    });
  if (puedeCrear && solFormVisible) {
    qs('sol-cancelar').addEventListener('click', () => {
      solFormVisible = false;
      renderComprasTab();
    });
    qs('sol-agregar-linea').addEventListener('click', () => {
      const contenedor = qs('sol-lineas');
      const div = document.createElement('div');
      div.innerHTML = renderLineasSolicitud([
        { producto_id: '', cantidad: 1, precio_estimado: '' }
      ]);
      contenedor.appendChild(div.firstElementChild);
      wireLineasSolicitud();
    });
    wireLineasSolicitud();
    qs('sol-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const lineas = [...qs('sol-lineas').querySelectorAll('.sol-linea')]
        .map((fila) => ({
          producto_id: fila.querySelector('.sol-producto').value,
          cantidad: Number(fila.querySelector('.sol-cantidad').value),
          precio_estimado: Number(fila.querySelector('.sol-precio').value)
        }))
        .filter((l) => l.producto_id);
      ejecutar(() => {
        crearSolicitud(
          {
            centro_costo_id: qs('sol-cc').value,
            prioridad: qs('sol-prioridad').value,
            fecha_requerida: qs('sol-fecha').value,
            justificacion: qs('sol-justificacion').value,
            lineas
          },
          usuario
        );
        solFormVisible = false;
      }, qs('sol-form'));
    });
  }
  content.querySelectorAll('[data-sol-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.solAccion === 'enviar') return enviarSolicitud(id, usuario);
        if (btn.dataset.solAccion === 'aprobar')
          return aprobarSolicitud(id, usuario, { aprobar: true });
        if (btn.dataset.solAccion === 'rechazar') {
          const motivo = pedirTexto('Motivo del rechazo:');
          if (!motivo) throw new Error('El rechazo exige un motivo');
          return aprobarSolicitud(id, usuario, { aprobar: false, motivo });
        }
        if (btn.dataset.solAccion === 'anular') {
          const motivo = pedirTexto('Motivo de anulación:') || '';
          return anularSolicitud(id, usuario, motivo);
        }
        if (btn.dataset.solAccion === 'cotizar') {
          cotSolicitudId = id;
          return irA('cotizaciones');
        }
      });
    })
  );
}

function renderLineasSolicitud(lineas) {
  return lineas
    .map(
      (l) => `
    <div class="field-row sol-linea">
      <div><label>Producto</label><select class="sol-producto">${opciones(
        productosActivos().map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` })),
        l.producto_id
      )}</select></div>
      <div><label>Cantidad</label><input class="sol-cantidad" type="number" min="1" step="1" value="${esc(l.cantidad)}" /></div>
      <div><label>Precio estimado</label><input class="sol-precio" type="number" min="0" step="1" value="${esc(l.precio_estimado)}" /></div>
    </div>
  `
    )
    .join('');
}

function wireLineasSolicitud() {
  qs('sol-lineas')
    .querySelectorAll('.sol-linea')
    .forEach((fila) => {
      const select = fila.querySelector('.sol-producto');
      const precio = fila.querySelector('.sol-precio');
      select.addEventListener('change', () => {
        const sugerido = precioSugerido(select.value);
        if (sugerido !== null) precio.value = sugerido;
      });
    });
}

function renderCotizaciones() {
  const usuario = getUsuarioActivo();
  const solicitudes = listarSolicitudes(usuario).filter((s) =>
    ['aprobada', 'en_cotizacion'].includes(s.estado)
  );
  if (!cotSolicitudId || !solicitudes.some((s) => s.id === cotSolicitudId))
    cotSolicitudId = solicitudes[0]?.id || '';
  const solicitud = cotSolicitudId ? obtenerSolicitud(cotSolicitudId) : null;
  const comparativa = solicitud ? compararCotizaciones(solicitud.id) : [];
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <label for="cot-solicitud">Solicitud</label>
        <select id="cot-solicitud">${opciones(
          solicitudes.map((s) => ({
            value: s.id,
            label: `${s.numero} · ${s.justificacion} · ${clp(s.monto_estimado)}`
          })),
          cotSolicitudId
        )}</select>
      </div>
      ${solicitud ? `<p class="muted">Umbral de cotizaciones: ${clp(umbralCotizaciones())} neto. ${Number(solicitud.monto_estimado) >= umbralCotizaciones() ? 'Esta solicitud requiere 3 cotizaciones o justificación de proveedor único.' : ''}</p>` : '<div class="empty">No hay solicitudes aprobadas o en cotización.</div>'}
    </div>
    ${
      solicitud && puedeOperar('cotizaciones', 'gestionar_cotizaciones', usuario)
        ? `
    <div class="card">
      <h2>Registrar cotización</h2>
      <form id="cot-form">
        <div class="field-row"><div><label>Proveedor *</label><select id="cot-proveedor">${opciones(
          listarProveedores()
            .filter((p) => p.estado_proveedor === 'aprobado')
            .map((p) => ({ value: p.entity_id, label: `${p.code} · ${p.name}` })),
          ''
        )}</select></div><div><label>Plazo de entrega (días)</label><input id="cot-plazo" type="number" min="0" step="1" value="7" /></div></div>
        <div class="field-row"><div><label>Condición de pago (días)</label><input id="cot-condicion" type="number" min="0" step="1" value="30" /></div><div><label>Válida hasta *</label><input id="cot-validez" type="date" value="${hoyISO()}" /></div></div>
        <h3>Precios por línea</h3>
        ${solicitud.lineas.map((l, i) => `<div class="field-row"><div><label>${esc(nombreProducto(l.producto_id))}</label><input class="cot-precio" data-index="${i}" type="number" min="0" step="1" value="${esc(l.precio_estimado)}" /></div><div><label>Cantidad</label><input class="cot-cantidad" data-index="${i}" type="number" min="1" step="1" value="${esc(l.cantidad)}" /></div></div>`).join('')}
        <div class="form-actions"><button type="submit" class="primary">Registrar cotización</button></div>
      </form>
    </div>`
        : ''
    }
    <div class="card">
      <h2>Comparativa side-by-side</h2>
      ${
        comparativa.length === 0
          ? '<div class="empty">Sin cotizaciones registradas.</div>'
          : `
      <table><thead><tr><th>Proveedor</th><th>Neto</th><th>IVA</th><th>Total</th><th>Plazo</th><th>Condición</th><th>Evaluación</th><th>Validez</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${comparativa
        .map(
          (c) => `<tr>
        <td>${esc(c.proveedor?.name || c.proveedor_id)}</td><td>${clp(c.neto)}</td><td>${clp(c.iva)}</td><td>${clp(c.total)}</td><td>${esc(c.plazo_entrega_dias)} días</td><td>${esc(c.condicion_pago_dias)} días</td><td>${c.evaluacion_promedio || '—'}</td><td>${fecha(c.fecha_validez)}</td><td>${badge(c.estado)}</td>
        <td class="actions">
          <button type="button" class="link" data-traza="cotizacion" data-id="${esc(c.id)}">Cadena</button>
          ${c.estado === 'recibida' && puedeOperar('cotizaciones', 'gestionar_cotizaciones', usuario) ? `<button type="button" class="link" data-cot-accion="seleccionar" data-id="${esc(c.id)}">Seleccionar</button><button type="button" class="link danger" data-cot-accion="descartar" data-id="${esc(c.id)}">Descartar</button>` : ''}
          ${c.motivo_descarte ? `<span class="muted">${esc(c.motivo_descarte)}</span>` : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  qs('cot-solicitud').addEventListener('change', (ev) => {
    cotSolicitudId = ev.target.value;
    renderComprasTab();
  });
  if (solicitud && puedeOperar('cotizaciones', 'gestionar_cotizaciones', usuario)) {
    qs('cot-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const lineas = solicitud.lineas.map((l, i) => ({
        producto_id: l.producto_id,
        cantidad: Number(qs('cot-form').querySelector(`.cot-cantidad[data-index="${i}"]`).value),
        precio_unitario: Number(
          qs('cot-form').querySelector(`.cot-precio[data-index="${i}"]`).value
        )
      }));
      ejecutar(
        () =>
          registrarCotizacion(
            {
              solicitud_id: solicitud.id,
              proveedor_id: qs('cot-proveedor').value,
              plazo_entrega_dias: qs('cot-plazo').value,
              condicion_pago_dias: qs('cot-condicion').value,
              fecha_validez: qs('cot-validez').value,
              lineas
            },
            usuario
          ),
        qs('cot-form')
      );
    });
  }
  content.querySelectorAll('[data-cot-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.cotAccion === 'descartar') {
          const motivo = pedirTexto('Motivo del descarte:');
          if (!motivo) throw new Error('El descarte exige un motivo');
          return descartarCotizacion(id, motivo, usuario);
        }
        if (btn.dataset.cotAccion === 'seleccionar') {
          const justificacion =
            Number(solicitud?.monto_estimado) >= umbralCotizaciones()
              ? pedirTexto('Justificación de proveedor único (si no hay 3 cotizaciones):') || ''
              : '';
          return seleccionarCotizacion(id, usuario, {
            justificacion_proveedor_unico: justificacion
          });
        }
      });
    })
  );
}

function renderOrdenes() {
  const usuario = getUsuarioActivo();
  const solicitudes = listarSolicitudes(usuario).filter((s) =>
    ['aprobada', 'en_cotizacion'].includes(s.estado)
  );
  const lista = ordenesVisibles(usuario);
  const content = qs('compras-content');
  const solicitud = ocSolicitudId ? obtenerSolicitud(ocSolicitudId) : null;
  const cotizaciones = solicitud
    ? compararCotizaciones(solicitud.id).filter((c) => c.estado === 'seleccionada')
    : [];
  content.innerHTML = `
    ${
      puedeOperar('ordenes', 'emitir_oc', usuario)
        ? `
    <div class="card">
      <h2>Emitir orden de compra</h2>
      <form id="oc-form">
        <div class="field-row"><div><label>Solicitud *</label><select id="oc-solicitud">${opciones(
          solicitudes.map((s) => ({
            value: s.id,
            label: `${s.numero} · ${clp(s.monto_estimado)}`
          })),
          ocSolicitudId
        )}</select></div><div><label>Cotización seleccionada</label><select id="oc-cotizacion">${opciones(
          cotizaciones.map((c) => ({
            value: c.id,
            label: `${c.proveedor?.name} · ${clp(c.total)}`
          })),
          ocCotizacionId,
          'Compra directa (bajo umbral)'
        )}</select></div></div>
        <div class="field-row"><div><label>Proveedor (compra directa)</label><select id="oc-proveedor">${opciones(
          listarProveedores()
            .filter((p) => p.estado_proveedor === 'aprobado')
            .map((p) => ({ value: p.entity_id, label: `${p.code} · ${p.name}` })),
          ''
        )}</select></div><div><label>Condición de pago (días)</label><input id="oc-condicion" type="number" min="0" step="1" value="30" /></div></div>
        <div class="field-row"><div><label>Entrega prometida</label><input id="oc-entrega" type="date" /></div><div><label>Moneda</label><input id="oc-moneda" value="CLP" /></div></div>
        <div class="form-actions"><button type="submit" class="primary">Emitir OC</button></div>
      </form>
    </div>`
        : ''
    }
    <div class="card">
      <div class="toolbar"><h2>Órdenes de compra</h2><button type="button" id="oc-exportar" class="secondary">Exportar CSV</button></div>
      ${
        lista.length === 0
          ? '<div class="empty">Sin órdenes de compra.</div>'
          : `
      <table><thead><tr><th>Número</th><th>Proveedor</th><th>Solicitud</th><th>Emisión</th><th>Neto</th><th>IVA</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (
            o
          ) => `<tr><td>${esc(o.numero)}</td><td>${esc(nombreProveedor(o.proveedor_id))}</td><td>${esc(o.solicitud_id || '—')}</td><td>${fecha(o.fecha_emision)}</td><td>${clp(o.neto)}</td><td>${clp(o.iva)}</td><td>${clp(o.total)}</td><td>${badge(o.estado)}</td>
        <td class="actions"><button type="button" class="link" data-traza="orden" data-id="${esc(o.id)}">Cadena</button>${['emitida', 'recibida_parcial'].includes(o.estado) && puedeOperar('ordenes', 'emitir_oc', usuario) ? `<button type="button" class="link danger" data-oc-accion="anular" data-id="${esc(o.id)}">Anular</button>` : ''}</td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  qs('oc-exportar').addEventListener('click', () => exportarOrdenes());
  if (puedeOperar('ordenes', 'emitir_oc', usuario)) {
    qs('oc-solicitud').addEventListener('change', (ev) => {
      ocSolicitudId = ev.target.value;
      ocCotizacionId = '';
      renderComprasTab();
    });
    qs('oc-cotizacion').addEventListener('change', (ev) => {
      ocCotizacionId = ev.target.value;
      renderComprasTab();
    });
    qs('oc-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(
        () =>
          emitirOrdenCompra(
            {
              solicitud_id: qs('oc-solicitud').value,
              cotizacion_id: qs('oc-cotizacion').value || null,
              proveedor_id: qs('oc-proveedor').value || null,
              condicion_pago_dias: qs('oc-condicion').value,
              fecha_entrega_prometida: qs('oc-entrega').value || null,
              moneda: qs('oc-moneda').value
            },
            usuario
          ),
        qs('oc-form')
      );
    });
  }
  content.querySelectorAll('[data-oc-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const motivo = pedirTexto('Motivo de anulación:') || '';
      ejecutar(() => anularOrdenCompra(btn.dataset.id, usuario, motivo));
    })
  );
}

function renderRecepciones() {
  const usuario = getUsuarioActivo();
  const ordenesVisiblesLista = ordenesVisibles(usuario);
  const ordenes = ordenesVisiblesLista.filter((o) =>
    ['emitida', 'recibida_parcial'].includes(o.estado)
  );
  if (!recOrdenId || !ordenes.some((o) => o.id === recOrdenId)) recOrdenId = ordenes[0]?.id || '';
  const orden = recOrdenId ? ordenesVisiblesLista.find((o) => o.id === recOrdenId) : null;
  const pendientes = orden ? lineasPendientes(orden) : [];
  const lista = recepcionesVisibles(usuario).map((r) => vistaRecepcion(r, usuario));
  const rutProveedorEnRecepcion = puedeVerRutProveedor(usuario.rol, 'recepcion');
  const content = qs('compras-content');
  content.innerHTML = `
    ${
      puedeOperar('recepciones', 'registrar_recepcion', usuario)
        ? `
    <div class="card">
      <h2>Registrar recepción</h2>
      <div class="toolbar"><label for="rec-orden">Orden de compra</label><select id="rec-orden">${opciones(
        ordenes.map((o) => ({
          value: o.id,
          label: `${o.numero} · ${nombreProveedor(o.proveedor_id)}`
        })),
        recOrdenId
      )}</select></div>
      ${
        orden
          ? `<form id="rec-form">
        <p class="muted">Estado de la OC: ${badge(orden.estado)} · Entrega prometida: ${fecha(orden.fecha_entrega_prometida)}</p>
        ${pendientes
          .map(
            (l) => `<div class="field-row rec-linea" data-linea="${esc(l.linea_id)}">
          <div><label>${esc(nombreProducto(l.producto_id))}</label><span class="muted">Pendiente: ${l.cantidad_pendiente}</span></div>
          <div><label>Cantidad recibida</label><input class="rec-recibida" type="number" min="0" step="1" value="${l.cantidad_pendiente}" /></div>
          <div><label>Cantidad aceptada</label><input class="rec-aceptada" type="number" min="0" step="1" value="${l.cantidad_pendiente}" /></div>
          <div><label>Motivo de rechazo</label><input class="rec-motivo" placeholder="Obligatorio si hay rechazo" /></div>
        </div>`
          )
          .join('')}
        <div><label>Observaciones</label><input id="rec-obs" /></div>
        <div class="form-actions"><button type="submit" class="primary">Registrar recepción</button></div>
      </form>`
          : '<div class="empty">No hay OC pendientes de recepción.</div>'
      }
    </div>`
        : ''
    }
    <div class="card">
      <div class="toolbar"><h2>Recepciones</h2><button type="button" id="rec-exportar" class="secondary">Exportar CSV</button></div>
      ${
        lista.length === 0
          ? '<div class="empty">Sin recepciones registradas.</div>'
          : `
      <table><thead><tr><th>Número</th><th>OC</th><th>Proveedor / RUT</th><th>Fecha</th><th>Estado</th><th>Registrada por</th><th>Líneas</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (r) => `<tr><td>${esc(r.numero)}</td><td>${esc(r.orden_numero)}</td><td>${esc(
            r.proveedor?.name || r.proveedor_id || ''
          )}${
            rutProveedorEnRecepcion && r.proveedor_rut
              ? ` <span class="muted">${esc(r.proveedor_rut)}</span>`
              : ''
          }</td><td>${fecha(r.fecha_recepcion)}</td><td>${badge(r.estado)}</td><td>${celdaUsuario(
            r.registrada_por
          )}</td><td>${(r.lineas || [])
            .map((l) => `${esc(nombreProducto(l.producto_id))}: ${l.cantidad_aceptada}`)
            .join(', ')}</td><td class="actions"><button type="button" class="link" data-traza="recepcion" data-id="${esc(
            r.id
          )}">Cadena</button></td></tr>`
        )
        .join('')}
      </tbody></table>`
      }
      ${
        orden
          ? `<p class="muted">Unidades aceptadas disponibles para Inventario: ${
              unidadesAceptadasPorProducto(orden.id)
                .map((u) => `${esc(nombreProducto(u.producto_id))} (${u.cantidad})`)
                .join(', ') || '—'
            }</p>`
          : ''
      }
    </div>
  `;
  qs('rec-exportar').addEventListener('click', () => exportarRecepciones({ usuario }));
  if (puedeOperar('recepciones', 'registrar_recepcion', usuario) && orden) {
    qs('rec-orden').addEventListener('change', (ev) => {
      recOrdenId = ev.target.value;
      renderComprasTab();
    });
    qs('rec-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const lineas = [...content.querySelectorAll('.rec-linea')]
        .map((fila) => ({
          orden_linea_id: fila.dataset.linea,
          cantidad_recibida: Number(fila.querySelector('.rec-recibida').value),
          cantidad_aceptada: Number(fila.querySelector('.rec-aceptada').value),
          motivo_rechazo: fila.querySelector('.rec-motivo').value
        }))
        .filter((l) => l.cantidad_recibida > 0);
      ejecutar(
        () =>
          registrarRecepcion(
            { orden_id: orden.id, lineas, observaciones: qs('rec-obs').value },
            usuario
          ),
        qs('rec-form')
      );
    });
  }
}

function renderFacturas() {
  const usuario = getUsuarioActivo();
  const ordenes = listarOrdenes().filter((o) =>
    leer('recepciones').some((r) => r.orden_id === o.id)
  );
  if (!facOrdenId || !ordenes.some((o) => o.id === facOrdenId)) facOrdenId = ordenes[0]?.id || '';
  const orden = facOrdenId ? listarOrdenes().find((o) => o.id === facOrdenId) : null;
  const facturasOrden = orden ? listarFacturas({ orden_id: orden.id }) : [];
  const lista = listarFacturas();
  const alertas = alertasVencimiento();
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <h2>Alertas de vencimiento</h2>
      ${alertas.length === 0 ? '<div class="empty">Sin facturas próximas a vencer.</div>' : `<ul>${alertas.map((f) => `<li>${esc(nombreProveedor(f.proveedor_id))} · folio ${esc(f.folio)} · vence ${fecha(f.fecha_vencimiento)} (${textoPlazo(f.dias_restantes, true)}) ${badge(f.estado)}</li>`).join('')}</ul>`}
    </div>
    ${
      puedeOperar('facturas', 'registrar_factura', usuario)
        ? `
    <div class="card">
      <h2>Registrar factura o nota de crédito</h2>
      <div class="toolbar"><label for="fac-orden">OC con recepción</label><select id="fac-orden">${opciones(
        ordenes.map((o) => ({
          value: o.id,
          label: `${o.numero} · ${nombreProveedor(o.proveedor_id)}`
        })),
        facOrdenId
      )}</select></div>
      ${
        orden
          ? `<form id="fac-form">
        <div class="field-row"><div><label>Tipo</label><select id="fac-tipo">${opciones(['factura', 'nota_credito'], 'factura')}</select></div><div><label>Folio *</label><input id="fac-folio" /></div></div>
        <div class="field-row"><div><label>Neto *</label><input id="fac-neto" type="number" min="0" step="1" /></div><div><label>IVA</label><input id="fac-iva" type="number" min="0" step="1" /></div><div><label>Total</label><input id="fac-total" type="number" min="0" step="1" /></div></div>
        <div class="field-row"><div><label>Fecha de recepción</label><input id="fac-fecha" type="date" value="${hoyISO()}" /></div><div><label>Factura referenciada (nota de crédito)</label><select id="fac-referencia">${opciones(
          facturasOrden
            .filter((f) => f.tipo_documento === 'factura')
            .map((f) => ({ value: f.id, label: `Folio ${f.folio} · ${clp(f.neto)}` })),
          '',
          'No aplica'
        )}</select></div></div>
        <div class="form-actions"><button type="submit" class="primary">Registrar documento</button></div>
      </form>`
          : '<div class="empty">No hay OC con recepción registrada.</div>'
      }
    </div>`
        : ''
    }
    <div class="card">
      <div class="toolbar"><h2>Facturas y notas de crédito</h2><button type="button" id="fac-exportar" class="secondary">Exportar CSV</button></div>
      ${
        lista.length === 0
          ? '<div class="empty">Sin documentos registrados.</div>'
          : `
      <table><thead><tr><th>Tipo</th><th>Folio</th><th>OC</th><th>Proveedor</th><th>Neto</th><th>IVA</th><th>Total</th><th>Vencimiento</th><th>Estado</th><th>Diferencia</th><th>Crédito a favor</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (
            f
          ) => `<tr><td>${esc(f.tipo_documento)}</td><td>${esc(f.folio)}</td><td>${esc(f.orden_id)}</td><td>${esc(nombreProveedor(f.proveedor_id))}</td><td>${clp(f.neto)}</td><td>${clp(f.iva)}</td><td>${clp(f.total)}</td><td>${fecha(f.fecha_vencimiento)}</td><td>${badge(f.estado)}${f.alerta_fraude ? ' ⚠️' : ''}</td><td>${f.diferencia === undefined ? '—' : clp(f.diferencia)}</td><td>${f.credito_a_favor === undefined ? '—' : clp(f.credito_a_favor)}</td>
        <td class="actions">
          <button type="button" class="link" data-traza="factura" data-id="${esc(f.id)}">Cadena</button>
          ${f.tipo_documento === 'factura' && ['registrada', 'con_discrepancia'].includes(f.estado) && puedeOperar('facturas', 'conciliar_factura', usuario) ? `<button type="button" class="link" data-fac-accion="conciliar" data-id="${esc(f.id)}">Conciliar</button>` : ''}
          ${f.estado === 'conciliada' && puedeOperar('facturas', 'aprobar_pago', usuario) ? `<button type="button" class="link" data-fac-accion="aprobar" data-id="${esc(f.id)}">Aprobar pago</button>` : ''}
          ${!['aprobada_pago', 'rechazada'].includes(f.estado) && puedeOperar('facturas', 'conciliar_factura', usuario) ? `<button type="button" class="link danger" data-fac-accion="rechazar" data-id="${esc(f.id)}">Rechazar</button>` : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
      ${orden ? `<p class="muted">Notas de crédito de la OC: ${listarFacturas({ orden_id: orden.id, tipo_documento: 'nota_credito' }).length}</p>` : ''}
    </div>
  `;
  qs('fac-exportar').addEventListener('click', () => exportarFacturas({ usuario }));
  if (puedeOperar('facturas', 'registrar_factura', usuario) && orden) {
    qs('fac-orden').addEventListener('change', (ev) => {
      facOrdenId = ev.target.value;
      renderComprasTab();
    });
    qs('fac-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(
        () =>
          registrarFactura(
            {
              orden_id: orden.id,
              tipo_documento: qs('fac-tipo').value,
              folio: qs('fac-folio').value,
              neto: qs('fac-neto').value,
              iva: qs('fac-iva').value,
              total: qs('fac-total').value,
              fecha_recepcion: qs('fac-fecha').value,
              factura_referencia_id: qs('fac-referencia').value || null
            },
            usuario
          ),
        qs('fac-form')
      );
    });
  }
  content.querySelectorAll('[data-fac-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.facAccion === 'conciliar') return conciliarFactura(id, usuario);
        if (btn.dataset.facAccion === 'aprobar') return aprobarPago(id, usuario);
        if (btn.dataset.facAccion === 'rechazar') {
          const motivo = pedirTexto('Motivo del rechazo:');
          if (!motivo) throw new Error('El rechazo exige un motivo');
          return rechazarFactura(id, motivo, usuario);
        }
      });
    })
  );
}

function renderDevoluciones() {
  const usuario = getUsuarioActivo();
  const ordenes = listarOrdenes().filter((o) =>
    ['recibida_parcial', 'recibida_total', 'cerrada'].includes(o.estado)
  );
  if (!devOrdenId || !ordenes.some((o) => o.id === devOrdenId)) devOrdenId = ordenes[0]?.id || '';
  const orden = devOrdenId ? listarOrdenes().find((o) => o.id === devOrdenId) : null;
  const pendientes = orden ? lineasPendientes(orden) : [];
  const lista = listarDevoluciones();
  const content = qs('compras-content');
  content.innerHTML = `
    ${
      puedeOperar('devoluciones', 'registrar_devolucion', usuario)
        ? `
    <div class="card">
      <h2>Registrar devolución</h2>
      <div class="toolbar"><label for="dev-orden">OC recibida</label><select id="dev-orden">${opciones(
        ordenes.map((o) => ({
          value: o.id,
          label: `${o.numero} · ${nombreProveedor(o.proveedor_id)}`
        })),
        devOrdenId
      )}</select></div>
      ${
        orden
          ? `<form id="dev-form">
        ${pendientes.map((l) => `<div class="field-row dev-linea" data-linea="${esc(l.linea_id)}"><div><label>${esc(nombreProducto(l.producto_id))}</label><span class="muted">Aceptado: ${l.cantidad_aceptada}</span></div><div><label>Cantidad a devolver</label><input class="dev-cantidad" type="number" min="0" step="1" value="0" /></div><div><label>Motivo</label><input class="dev-motivo" placeholder="defectuoso, dañado, no corresponde" /></div></div>`).join('')}
        <div><label>Observaciones</label><input id="dev-obs" /></div>
        <div class="form-actions"><button type="submit" class="primary">Registrar devolución</button></div>
      </form>`
          : '<div class="empty">No hay OC recibidas.</div>'
      }
    </div>`
        : ''
    }
    <div class="card">
      <h2>Devoluciones</h2>
      ${
        lista.length === 0
          ? '<div class="empty">Sin devoluciones registradas.</div>'
          : `
      <table><thead><tr><th>Número</th><th>OC</th><th>Fecha</th><th>Neto</th><th>Estado</th><th>Registrada por</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (
            d
          ) => `<tr><td>${esc(d.numero)}</td><td>${esc(d.orden_id)}</td><td>${fecha(d.fecha_devolucion)}</td><td>${clp(d.neto)}</td><td>${badge(d.estado)}</td><td>${celdaUsuario(d.registrada_por)}</td>
        <td class="actions">
          <button type="button" class="link" data-traza="devolucion" data-id="${esc(d.id)}">Cadena</button>
          ${d.estado === 'pendiente_aprobacion' && puedeOperar('devoluciones', 'aprobar_devolucion', usuario) ? `<button type="button" class="link" data-dev-accion="aprobar" data-id="${esc(d.id)}">Aprobar</button><button type="button" class="link danger" data-dev-accion="rechazar" data-id="${esc(d.id)}">Rechazar</button>` : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  if (puedeOperar('devoluciones', 'registrar_devolucion', usuario) && orden) {
    qs('dev-orden').addEventListener('change', (ev) => {
      devOrdenId = ev.target.value;
      renderComprasTab();
    });
    qs('dev-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const lineas = [...content.querySelectorAll('.dev-linea')]
        .map((fila) => ({
          orden_linea_id: fila.dataset.linea,
          cantidad: Number(fila.querySelector('.dev-cantidad').value),
          motivo: fila.querySelector('.dev-motivo').value
        }))
        .filter((l) => l.cantidad > 0);
      ejecutar(
        () =>
          registrarDevolucion(
            { orden_id: orden.id, lineas, observaciones: qs('dev-obs').value },
            usuario
          ),
        qs('dev-form')
      );
    });
  }
  content.querySelectorAll('[data-dev-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.devAccion === 'aprobar') return aprobarDevolucion(id, usuario);
        const motivo = pedirTexto('Motivo del rechazo:');
        if (!motivo) throw new Error('El rechazo exige un motivo');
        return rechazarDevolucion(id, motivo, usuario);
      });
    })
  );
}

function renderCatalogo() {
  const usuario = getUsuarioActivo();
  const proveedores = listarProveedores();
  const productos = productosActivos();
  let lista = listarCatalogo({ proveedor_id: catProveedorId || undefined }).map((c) =>
    catalogoEnriquecido(c, hoyISO(), usuario)
  );
  if (catFiltro) {
    const q = catFiltro.toLowerCase();
    lista = lista.filter((c) =>
      [c.producto?.nombre, c.producto?.codigo, c.proveedor?.name].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
    );
  }
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <select id="cat-proveedor" aria-label="Filtrar catálogo por proveedor">${opciones(
          proveedores.map((p) => ({ value: p.entity_id, label: `${p.code} · ${p.name}` })),
          catProveedorId,
          'Todos los proveedores'
        )}</select>
        <input id="cat-search" aria-label="Buscar en el catálogo" placeholder="Buscar producto o proveedor" value="${esc(catFiltro)}" />
        <button type="button" id="cat-filtrar" class="secondary">Filtrar</button>
      </div>
      ${
        puedeOperar('catalogo', 'gestionar_catalogo', usuario)
          ? `
      <form id="cat-form" class="card-inner">
        <h2>Agregar producto al catálogo</h2>
        <div class="field-row"><div><label>Proveedor *</label><select id="cat-form-proveedor">${opciones(
          proveedores.map((p) => ({ value: p.entity_id, label: `${p.code} · ${p.name}` })),
          ''
        )}</select></div><div><label>Producto *</label><select id="cat-form-producto">${opciones(
          productos.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` })),
          ''
        )}</select></div></div>
        <div class="field-row"><div><label>Precio de referencia *</label><input id="cat-form-precio" type="number" min="0" step="1" /></div><div><label>Plazo de entrega (días)</label><input id="cat-form-plazo" type="number" min="0" step="1" value="7" /></div></div>
        <div class="form-actions"><button type="submit" class="primary">Agregar</button></div>
      </form>`
          : ''
      }
    </div>
    <div class="card">
      <h2>Catálogo proveedor-producto</h2>
      ${
        lista.length === 0
          ? '<div class="empty">Sin referencias de catálogo.</div>'
          : `
      <table><thead><tr><th>Proveedor</th><th>Producto</th><th>Precio referencia</th><th>Plazo</th><th>Actualización</th><th>Desactualizado</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (
            c
          ) => `<tr><td>${esc(c.proveedor?.name || c.proveedor_id)}</td><td>${esc(c.producto?.nombre || c.producto_id)}</td><td>${clp(c.precio_referencia)}</td><td>${esc(c.plazo_entrega_dias)} días</td><td>${fecha(c.fecha_actualizacion)}</td><td>${c.desactualizado ? 'Sí' : 'No'}</td><td>${c.activo === false ? 'No' : 'Sí'}</td>
        <td class="actions">${puedeOperar('catalogo', 'gestionar_catalogo', usuario) ? `<button type="button" class="link" data-cat-accion="precio" data-id="${esc(c.id)}">Actualizar precio</button>${c.activo !== false ? `<button type="button" class="link danger" data-cat-accion="desactivar" data-id="${esc(c.id)}">Desactivar</button>` : ''}` : ''}</td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
      <p class="muted">Menor precio vigente sugerido para productos: ${productos
        .slice(0, 5)
        .map(
          (p) =>
            `${esc(p.nombre)}: ${precioReferenciaVigente(p.id) === null ? '—' : clp(precioReferenciaVigente(p.id))}`
        )
        .join(' · ')}</p>
    </div>
  `;
  qs('cat-filtrar').addEventListener('click', () => {
    catProveedorId = qs('cat-proveedor').value;
    catFiltro = qs('cat-search').value;
    renderComprasTab();
  });
  if (puedeOperar('catalogo', 'gestionar_catalogo', usuario)) {
    qs('cat-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(
        () =>
          agregarProductoCatalogo(
            {
              proveedor_id: qs('cat-form-proveedor').value,
              producto_id: qs('cat-form-producto').value,
              precio_referencia: qs('cat-form-precio').value,
              plazo_entrega_dias: qs('cat-form-plazo').value
            },
            usuario
          ),
        qs('cat-form')
      );
    });
  }
  content.querySelectorAll('[data-cat-accion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ejecutar(() => {
        if (btn.dataset.catAccion === 'desactivar') return desactivarProductoCatalogo(id, usuario);
        const precio = pedirTexto('Nuevo precio de referencia:');
        if (precio === null || precio === '') throw new Error('Debes indicar el nuevo precio');
        return actualizarProductoCatalogo(id, { precio_referencia: precio }, usuario);
      });
    })
  );
}

function renderEvaluaciones() {
  const usuario = getUsuarioActivo();
  const evaluadas = new Set(listarEvaluaciones().map((e) => e.orden_id));
  const ordenes = listarOrdenes().filter(
    (o) => ['recibida_total', 'cerrada'].includes(o.estado) && !evaluadas.has(o.id)
  );
  if (!evalOrdenId || !ordenes.some((o) => o.id === evalOrdenId))
    evalOrdenId = ordenes[0]?.id || '';
  const lista = listarEvaluaciones();
  const content = qs('compras-content');
  content.innerHTML = `
    ${
      puedeOperar('evaluaciones', 'evaluar_proveedor', usuario)
        ? `
    <div class="card">
      <h2>Evaluar proveedor</h2>
      ${
        ordenes.length === 0
          ? '<div class="empty">No hay OC recibidas pendientes de evaluación.</div>'
          : `<form id="eval-form">
        <div class="toolbar"><label for="eval-orden">OC recibida</label><select id="eval-orden">${opciones(
          ordenes.map((o) => ({
            value: o.id,
            label: `${o.numero} · ${nombreProveedor(o.proveedor_id)}`
          })),
          evalOrdenId
        )}</select></div>
        <div class="field-row"><div><label>Calidad (1-5)</label><input id="eval-calidad" type="number" min="1" max="5" step="1" value="5" /></div><div><label>Atención (1-5)</label><input id="eval-atencion" type="number" min="1" max="5" step="1" value="5" /></div></div>
        <div><label>Comentario</label><input id="eval-comentario" /></div>
        <div class="form-actions"><button type="submit" class="primary">Registrar evaluación</button></div>
      </form>`
      }
    </div>`
        : ''
    }
    <div class="card">
      <h2>Evaluaciones de desempeño</h2>
      ${
        lista.length === 0
          ? '<div class="empty">Sin evaluaciones registradas.</div>'
          : `
      <table><thead><tr><th>OC</th><th>Proveedor</th><th>Calidad</th><th>Plazo</th><th>Atención</th><th>Promedio</th><th>Atraso</th><th>Comentario</th></tr></thead><tbody>
      ${lista.map((e) => `<tr><td>${esc(e.orden_id)}</td><td>${esc(nombreProveedor(e.proveedor_id))}</td><td>${e.puntaje_calidad}</td><td>${e.puntaje_plazo}</td><td>${e.puntaje_atencion}</td><td>${e.promedio}</td><td>${e.dias_atraso} días</td><td>${esc(e.comentario)}</td></tr>`).join('')}
      </tbody></table>`
      }
      <p class="muted">Promedio por proveedor: ${listarProveedores()
        .map((p) => `${esc(p.name)}: ${promedioProveedor(p.entity_id) || '—'}`)
        .join(' · ')}</p>
    </div>
  `;
  if (puedeOperar('evaluaciones', 'evaluar_proveedor', usuario) && ordenes.length > 0) {
    qs('eval-orden').addEventListener('change', (ev) => {
      evalOrdenId = ev.target.value;
      renderComprasTab();
    });
    qs('eval-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(
        () =>
          registrarEvaluacion(
            {
              orden_id: qs('eval-orden').value,
              puntaje_calidad: qs('eval-calidad').value,
              puntaje_atencion: qs('eval-atencion').value,
              comentario: qs('eval-comentario').value
            },
            usuario
          ),
        qs('eval-form')
      );
    });
  }
}
