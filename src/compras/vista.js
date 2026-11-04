import { getUsuarioActivo, setRolActivo, asegurarSemilla, leer, puede } from './almacenamiento.js';
import { hoyISO, UMBRAL_COTIZACIONES, ROLES } from './reglas.js';
import {
  listarProveedores,
  buscarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
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
  unidadesAceptadasPorProducto
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
import {
  exportarProveedores,
  exportarSolicitudes,
  exportarOrdenes,
  exportarRecepciones,
  exportarFacturas
} from './exportacion.js';

const TABS = [
  { id: 'panel', label: 'Panel' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'solicitudes', label: 'Solicitudes' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'ordenes', label: 'Órdenes de compra' },
  { id: 'recepciones', label: 'Recepciones' },
  { id: 'facturas', label: 'Facturas' },
  { id: 'devoluciones', label: 'Devoluciones' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'evaluaciones', label: 'Evaluaciones' }
];

let tab = 'panel';
let provFiltro = '';
let provEditId = null;
let provFormVisible = false;
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
function badge(estado) {
  return `<span class="badge badge-${esc(estado)}">${esc(estado)}</span>`;
}
function nombreUsuario(id) {
  return leer('usuarios').find((u) => u.id === id)?.nombre || id || '';
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
      const label = typeof item === 'string' ? item : item.label;
      return `<option value="${esc(value)}"${String(value) === String(seleccionado) ? ' selected' : ''}>${esc(label)}</option>`;
    })
    .join('')}`;
}

function ejecutar(fn) {
  try {
    fn();
    renderComprasView();
  } catch (e) {
    aviso(e.message);
  }
}

export function renderComprasView() {
  const root = qs('compras-root');
  if (!root) return;
  asegurarSemilla();
  const usuario = getUsuarioActivo();
  if (!TABS.some((t) => t.id === tab)) tab = 'panel';
  root.innerHTML = `
    <div class="compras-header">
      <div>
        <h1>Adquisiciones y Compras</h1>
        <p class="muted">Ciclo completo de compra: solicitud, cotización, OC, recepción, factura y devolución.</p>
      </div>
      <div class="compras-session">
        <label for="compras-rol">Usuario y rol activo</label>
        <select id="compras-rol">${ROLES.map((rol) => `<option value="${rol}"${rol === usuario.rol ? ' selected' : ''}>${rol}</option>`).join('')}</select>
        <span class="muted">${esc(usuario.nombre)} · ${esc(usuario.rol)}</span>
      </div>
    </div>
    <nav class="compras-tabs" role="tablist" aria-label="Secciones de compras">
      ${TABS.map((t) => `<button type="button" role="tab" class="compras-tab${t.id === tab ? ' active' : ''}" data-tab="${t.id}" aria-selected="${t.id === tab}">${esc(t.label)}</button>`).join('')}
    </nav>
    <div id="compras-content" class="compras-content"></div>
  `;
  qs('compras-rol').addEventListener('change', (ev) => {
    setRolActivo(ev.target.value);
    renderComprasView();
  });
  root.querySelectorAll('[data-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      renderComprasView();
    })
  );
  renderComprasTab();
}

function renderComprasTab() {
  if (tab === 'panel') return renderPanel();
  if (tab === 'proveedores') return renderProveedores();
  if (tab === 'solicitudes') return renderSolicitudes();
  if (tab === 'cotizaciones') return renderCotizaciones();
  if (tab === 'ordenes') return renderOrdenes();
  if (tab === 'recepciones') return renderRecepciones();
  if (tab === 'facturas') return renderFacturas();
  if (tab === 'devoluciones') return renderDevoluciones();
  if (tab === 'catalogo') return renderCatalogo();
  if (tab === 'evaluaciones') return renderEvaluaciones();
}

function irA(nuevaTab) {
  tab = nuevaTab;
  renderComprasView();
}

function renderPanel() {
  const panel = construirPanel(getUsuarioActivo());
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><span class="stat-value">${clp(panel.indicadores.monto_comprometido)}</span><span class="stat-label">Monto comprometido (${esc(panel.indicadores.mes)})</span></div>
      <div class="stat-card"><span class="stat-value">${panel.indicadores.ordenes_abiertas}</span><span class="stat-label">Órdenes abiertas</span></div>
      <div class="stat-card"><span class="stat-value">${panel.indicadores.facturas_aprobadas_pago}</span><span class="stat-label">Facturas aprobadas para pago</span></div>
      <div class="stat-card"><span class="stat-value">${clp(panel.indicadores.monto_aprobado_pago)}</span><span class="stat-label">Monto aprobado para pago</span></div>
    </div>
    ${panel.vacio ? '<div class="empty">No tienes pendientes para tu rol. ¡Todo al día!</div>' : ''}
    <div class="card">
      <h2>Acciones rápidas</h2>
      <div class="action-grid">
        ${panel.acciones.map((a) => `<button type="button" class="action-card" data-ir="${esc(a.vista)}"><strong>${esc(a.etiqueta)}</strong><span class="muted">${esc(a.clave)}</span></button>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Pendientes por rol</h2>
      ${
        panel.pendientes.length === 0
          ? '<div class="empty">Sin pendientes.</div>'
          : panel.pendientes
              .map(
                (p) => `
        <section class="pending-block">
          <h3>${esc(p.titulo)} <span class="counter">${p.cantidad}</span></h3>
          <p class="muted">${esc(p.detalle)}</p>
          <ul>${p.items
            .slice(0, 6)
            .map(
              (item) =>
                `<li><button type="button" class="link" data-ir="${esc(p.vista)}">${esc(item.etiqueta)}</button> ${item.monto !== undefined ? clp(item.monto) : ''} ${badge(item.estado)}</li>`
            )
            .join('')}</ul>
        </section>
      `
              )
              .join('')
      }
    </div>
    <div class="card">
      <h2>Alertas de vencimiento (5 días o menos)</h2>
      ${
        panel.alertas.length === 0
          ? '<div class="empty">No hay facturas próximas a vencer.</div>'
          : `
        <table><thead><tr><th>Proveedor</th><th>Folio</th><th>Vence</th><th>Días restantes</th><th>Estado</th></tr></thead><tbody>
        ${panel.alertas.map((f) => `<tr><td>${esc(nombreProveedor(f.proveedor_id))}</td><td>${esc(f.folio)}</td><td>${fecha(f.fecha_vencimiento)}</td><td>${f.dias_restantes}</td><td>${badge(f.estado)}</td></tr>`).join('')}
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
}

function renderProveedores() {
  const usuario = getUsuarioActivo();
  const lista = (provFiltro ? buscarProveedores(provFiltro) : listarProveedores()).map((p) =>
    vistaProveedor(p, usuario.rol)
  );
  const editando = provEditId ? obtenerProveedor(provEditId) : null;
  const content = qs('compras-content');
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <input id="prov-search" placeholder="Buscar por razón social, RUT, giro o región" value="${esc(provFiltro)}" />
        <button type="button" id="prov-buscar" class="secondary">Buscar</button>
        <button type="button" id="prov-nuevo" class="primary">Nuevo proveedor</button>
        <button type="button" id="prov-exportar" class="secondary">Exportar CSV</button>
      </div>
      ${
        provFormVisible
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
        <div class="field-row"><div><label>Banco</label><input id="prov-banco" value="${esc(editando?.banco || '')}" ${usuario.rol === 'admin_ti' ? '' : 'disabled'} /></div><div><label>Número de cuenta</label><input id="prov-cuenta" value="${esc(editando?.numero_cuenta || '')}" ${usuario.rol === 'admin_ti' ? '' : 'disabled'} /></div></div>
        ${usuario.rol !== 'admin_ti' ? '<p class="muted">Los datos bancarios solo pueden ser editados por admin_ti.</p>' : ''}
        <div class="form-actions"><button type="submit" class="primary">Guardar</button><button type="button" id="prov-cancelar" class="secondary">Cancelar</button></div>
      </form>`
          : ''
      }
    </div>
    <div class="card">
      <h2>Proveedores</h2>
      ${
        lista.length === 0
          ? '<div class="empty">No hay proveedores que coincidan.</div>'
          : `
      <table><thead><tr><th>Código</th><th>Razón social</th><th>RUT</th><th>Tipo</th><th>Región</th><th>Condición</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (p) => `<tr>
        <td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.rut_visible)}</td><td>${esc(p.tipo_persona)}</td><td>${esc(p.region)}</td><td>${esc(p.condicion_pago_dias)} días</td><td>${badge(p.estado_proveedor)}</td>
        <td class="actions">
          <button type="button" class="link" data-prov-accion="editar" data-id="${esc(p.id)}">Editar</button>
          ${p.estado_proveedor === 'potencial' ? `<button type="button" class="link" data-prov-accion="aprobar" data-id="${esc(p.id)}">Aprobar</button>` : ''}
          ${p.estado_proveedor === 'aprobado' ? `<button type="button" class="link" data-prov-accion="bloquear" data-id="${esc(p.id)}">Bloquear</button>` : ''}
          <button type="button" class="link danger" data-prov-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>
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
    renderProveedores();
  });
  qs('prov-search').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      provFiltro = qs('prov-search').value;
      renderProveedores();
    }
  });
  qs('prov-nuevo').addEventListener('click', () => {
    provEditId = null;
    provFormVisible = true;
    renderProveedores();
  });
  qs('prov-exportar').addEventListener('click', () => exportarProveedores({ filtro: provFiltro }));
  if (provFormVisible) {
    qs('prov-cancelar').addEventListener('click', () => {
      provFormVisible = false;
      provEditId = null;
      renderProveedores();
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
        acuerdo_plazo_mayor: qs('prov-acuerdo').value,
        banco: qs('prov-banco').value,
        numero_cuenta: qs('prov-cuenta').value
      };
      ejecutar(() => {
        if (provEditId) actualizarProveedor(provEditId, datos, usuario);
        else crearProveedor(datos, usuario);
        provFormVisible = false;
        provEditId = null;
      });
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
  let lista = listarSolicitudes(usuario);
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
        <input id="sol-search" placeholder="Buscar número, justificación o estado" value="${esc(solFiltro)}" />
        <select id="sol-estado">${opciones(['borrador', 'enviada', 'aprobada', 'en_cotizacion', 'adjudicada', 'rechazada', 'anulada'], solEstado, 'Todos los estados')}</select>
        <button type="button" id="sol-buscar" class="secondary">Filtrar</button>
        ${puede('crear_solicitud', usuario) ? '<button type="button" id="sol-nuevo" class="primary">Nueva solicitud</button>' : ''}
        <button type="button" id="sol-exportar" class="secondary">Exportar CSV</button>
      </div>
      ${
        solFormVisible
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
        <td>${esc(s.numero)}</td><td>${esc(nombreUsuario(s.solicitante_id))}</td><td>${esc(s.centro_costo_id)}</td><td>${esc(s.prioridad)}</td><td>${fecha(s.fecha_requerida)}</td><td>${clp(s.monto_estimado)}</td><td>${badge(s.estado)}</td>
        <td class="actions">
          ${s.estado === 'borrador' ? `<button type="button" class="link" data-sol-accion="enviar" data-id="${esc(s.id)}">Enviar</button>` : ''}
          ${s.estado === 'enviada' && puede('aprobar_solicitud', usuario) && s.solicitante_id !== usuario.id ? `<button type="button" class="link" data-sol-accion="aprobar" data-id="${esc(s.id)}">Aprobar</button><button type="button" class="link danger" data-sol-accion="rechazar" data-id="${esc(s.id)}">Rechazar</button>` : ''}
          ${['aprobada', 'en_cotizacion'].includes(s.estado) ? `<button type="button" class="link" data-sol-accion="cotizar" data-id="${esc(s.id)}">Cotizaciones</button>` : ''}
          ${!['adjudicada', 'anulada', 'rechazada'].includes(s.estado) ? `<button type="button" class="link danger" data-sol-accion="anular" data-id="${esc(s.id)}">Anular</button>` : ''}
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
    renderSolicitudes();
  });
  qs('sol-exportar').addEventListener('click', () =>
    exportarSolicitudes(usuario, { filtro: solFiltro })
  );
  if (qs('sol-nuevo'))
    qs('sol-nuevo').addEventListener('click', () => {
      solFormVisible = true;
      renderSolicitudes();
    });
  if (solFormVisible) {
    qs('sol-cancelar').addEventListener('click', () => {
      solFormVisible = false;
      renderSolicitudes();
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
      });
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
          const motivo = pedirTexto('Motivo de anulación (opcional):') || '';
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
      ${solicitud ? `<p class="muted">Umbral de cotizaciones: ${clp(UMBRAL_COTIZACIONES)} neto. ${Number(solicitud.monto_estimado) >= UMBRAL_COTIZACIONES ? 'Esta solicitud requiere 3 cotizaciones o justificación de proveedor único.' : ''}</p>` : '<div class="empty">No hay solicitudes aprobadas o en cotización.</div>'}
    </div>
    ${
      solicitud && puede('gestionar_cotizaciones', usuario)
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
          ${c.estado === 'recibida' && puede('gestionar_cotizaciones', usuario) ? `<button type="button" class="link" data-cot-accion="seleccionar" data-id="${esc(c.id)}">Seleccionar</button><button type="button" class="link danger" data-cot-accion="descartar" data-id="${esc(c.id)}">Descartar</button>` : ''}
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
    renderCotizaciones();
  });
  if (solicitud && puede('gestionar_cotizaciones', usuario)) {
    qs('cot-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const lineas = solicitud.lineas.map((l, i) => ({
        producto_id: l.producto_id,
        cantidad: Number(qs('cot-form').querySelector(`.cot-cantidad[data-index="${i}"]`).value),
        precio_unitario: Number(
          qs('cot-form').querySelector(`.cot-precio[data-index="${i}"]`).value
        )
      }));
      ejecutar(() =>
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
        )
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
            Number(solicitud?.monto_estimado) >= UMBRAL_COTIZACIONES
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
  const lista = listarOrdenes();
  const content = qs('compras-content');
  const solicitud = ocSolicitudId ? obtenerSolicitud(ocSolicitudId) : null;
  const cotizaciones = solicitud
    ? compararCotizaciones(solicitud.id).filter((c) => c.estado === 'seleccionada')
    : [];
  content.innerHTML = `
    ${
      puede('emitir_oc', usuario)
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
        <td class="actions">${['emitida', 'recibida_parcial'].includes(o.estado) && puede('emitir_oc', usuario) ? `<button type="button" class="link danger" data-oc-accion="anular" data-id="${esc(o.id)}">Anular</button>` : ''}</td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  qs('oc-exportar').addEventListener('click', () => exportarOrdenes());
  if (puede('emitir_oc', usuario)) {
    qs('oc-solicitud').addEventListener('change', (ev) => {
      ocSolicitudId = ev.target.value;
      ocCotizacionId = '';
      renderOrdenes();
    });
    qs('oc-cotizacion').addEventListener('change', (ev) => {
      ocCotizacionId = ev.target.value;
      renderOrdenes();
    });
    qs('oc-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(() =>
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
        )
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
  const ordenes = listarOrdenes().filter((o) => ['emitida', 'recibida_parcial'].includes(o.estado));
  if (!recOrdenId || !ordenes.some((o) => o.id === recOrdenId)) recOrdenId = ordenes[0]?.id || '';
  const orden = recOrdenId ? listarOrdenes().find((o) => o.id === recOrdenId) : null;
  const pendientes = orden ? lineasPendientes(orden) : [];
  const lista = listarRecepciones();
  const content = qs('compras-content');
  content.innerHTML = `
    ${
      puede('registrar_recepcion', usuario)
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
      <table><thead><tr><th>Número</th><th>OC</th><th>Fecha</th><th>Estado</th><th>Registrada por</th><th>Líneas</th></tr></thead><tbody>
      ${lista.map((r) => `<tr><td>${esc(r.numero)}</td><td>${esc(r.orden_id)}</td><td>${fecha(r.fecha_recepcion)}</td><td>${badge(r.estado)}</td><td>${esc(nombreUsuario(r.registrada_por))}</td><td>${(r.lineas || []).map((l) => `${esc(nombreProducto(l.producto_id))}: ${l.cantidad_aceptada}`).join(', ')}</td></tr>`).join('')}
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
  qs('rec-exportar').addEventListener('click', () => exportarRecepciones());
  if (puede('registrar_recepcion', usuario) && orden) {
    qs('rec-orden').addEventListener('change', (ev) => {
      recOrdenId = ev.target.value;
      renderRecepciones();
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
      ejecutar(() =>
        registrarRecepcion(
          { orden_id: orden.id, lineas, observaciones: qs('rec-obs').value },
          usuario
        )
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
      ${alertas.length === 0 ? '<div class="empty">Sin facturas próximas a vencer.</div>' : `<ul>${alertas.map((f) => `<li>${esc(nombreProveedor(f.proveedor_id))} · folio ${esc(f.folio)} · vence ${fecha(f.fecha_vencimiento)} (${f.dias_restantes} días) ${badge(f.estado)}</li>`).join('')}</ul>`}
    </div>
    ${
      puede('registrar_factura', usuario)
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
      <table><thead><tr><th>Tipo</th><th>Folio</th><th>OC</th><th>Proveedor</th><th>Neto</th><th>IVA</th><th>Total</th><th>Vencimiento</th><th>Estado</th><th>Diferencia</th><th>Acciones</th></tr></thead><tbody>
      ${lista
        .map(
          (
            f
          ) => `<tr><td>${esc(f.tipo_documento)}</td><td>${esc(f.folio)}</td><td>${esc(f.orden_id)}</td><td>${esc(nombreProveedor(f.proveedor_id))}</td><td>${clp(f.neto)}</td><td>${clp(f.iva)}</td><td>${clp(f.total)}</td><td>${fecha(f.fecha_vencimiento)}</td><td>${badge(f.estado)}${f.alerta_fraude ? ' ⚠️' : ''}</td><td>${f.diferencia === undefined ? '—' : clp(f.diferencia)}</td>
        <td class="actions">
          ${f.tipo_documento === 'factura' && ['registrada', 'con_discrepancia'].includes(f.estado) && puede('conciliar_factura', usuario) ? `<button type="button" class="link" data-fac-accion="conciliar" data-id="${esc(f.id)}">Conciliar</button>` : ''}
          ${f.estado === 'conciliada' && puede('aprobar_pago', usuario) ? `<button type="button" class="link" data-fac-accion="aprobar" data-id="${esc(f.id)}">Aprobar pago</button>` : ''}
          ${!['aprobada_pago', 'rechazada'].includes(f.estado) && puede('conciliar_factura', usuario) ? `<button type="button" class="link danger" data-fac-accion="rechazar" data-id="${esc(f.id)}">Rechazar</button>` : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
      ${orden ? `<p class="muted">Notas de crédito de la OC: ${listarFacturas({ orden_id: orden.id, tipo_documento: 'nota_credito' }).length}</p>` : ''}
    </div>
  `;
  qs('fac-exportar').addEventListener('click', () => exportarFacturas());
  if (puede('registrar_factura', usuario) && orden) {
    qs('fac-orden').addEventListener('change', (ev) => {
      facOrdenId = ev.target.value;
      renderFacturas();
    });
    qs('fac-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(() =>
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
        )
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
      puede('registrar_devolucion', usuario)
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
          ) => `<tr><td>${esc(d.numero)}</td><td>${esc(d.orden_id)}</td><td>${fecha(d.fecha_devolucion)}</td><td>${clp(d.neto)}</td><td>${badge(d.estado)}</td><td>${esc(nombreUsuario(d.registrada_por))}</td>
        <td class="actions">
          ${d.estado === 'pendiente_aprobacion' && puede('aprobar_devolucion', usuario) ? `<button type="button" class="link" data-dev-accion="aprobar" data-id="${esc(d.id)}">Aprobar</button><button type="button" class="link danger" data-dev-accion="rechazar" data-id="${esc(d.id)}">Rechazar</button>` : ''}
        </td>
      </tr>`
        )
        .join('')}
      </tbody></table>`
      }
    </div>
  `;
  if (puede('registrar_devolucion', usuario) && orden) {
    qs('dev-orden').addEventListener('change', (ev) => {
      devOrdenId = ev.target.value;
      renderDevoluciones();
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
      ejecutar(() =>
        registrarDevolucion(
          { orden_id: orden.id, lineas, observaciones: qs('dev-obs').value },
          usuario
        )
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
    catalogoEnriquecido(c)
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
        <select id="cat-proveedor">${opciones(
          proveedores.map((p) => ({ value: p.entity_id, label: `${p.code} · ${p.name}` })),
          catProveedorId,
          'Todos los proveedores'
        )}</select>
        <input id="cat-search" placeholder="Buscar producto o proveedor" value="${esc(catFiltro)}" />
        <button type="button" id="cat-filtrar" class="secondary">Filtrar</button>
      </div>
      ${
        puede('gestionar_catalogo', usuario)
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
        <td class="actions">${puede('gestionar_catalogo', usuario) ? `<button type="button" class="link" data-cat-accion="precio" data-id="${esc(c.id)}">Actualizar precio</button>${c.activo !== false ? `<button type="button" class="link danger" data-cat-accion="desactivar" data-id="${esc(c.id)}">Desactivar</button>` : ''}` : ''}</td>
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
    renderCatalogo();
  });
  if (puede('gestionar_catalogo', usuario)) {
    qs('cat-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(() =>
        agregarProductoCatalogo(
          {
            proveedor_id: qs('cat-form-proveedor').value,
            producto_id: qs('cat-form-producto').value,
            precio_referencia: qs('cat-form-precio').value,
            plazo_entrega_dias: qs('cat-form-plazo').value
          },
          usuario
        )
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
      puede('evaluar_proveedor', usuario)
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
  if (puede('evaluar_proveedor', usuario) && ordenes.length > 0) {
    qs('eval-orden').addEventListener('change', (ev) => {
      evalOrdenId = ev.target.value;
      renderEvaluaciones();
    });
    qs('eval-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      ejecutar(() =>
        registrarEvaluacion(
          {
            orden_id: qs('eval-orden').value,
            puntaje_calidad: qs('eval-calidad').value,
            puntaje_atencion: qs('eval-atencion').value,
            comentario: qs('eval-comentario').value
          },
          usuario
        )
      );
    });
  }
}
