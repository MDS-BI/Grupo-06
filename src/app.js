import { loadModuleConfig, normalizeConfig, setActiveConfig } from './module-config.js';
import { renderLogo, monogramFor, applyShellLabels, setActiveModule } from './components/shell.js';
import {
  cargarSemilla,
  capturarDatosCompras,
  estaAutenticado,
  getSesion,
  getUsuarioActivo,
  inicializarModoReal,
  leer,
  restaurarDatosCompras
} from './compras/almacenamiento.js';
import {
  CLAVE_DEMO,
  cerrarSesion,
  iniciarSesionConIdentificador,
  listarDirectorioUsuarios
} from './compras/autenticacion.js';
import { usuarioSuspendido } from './compras/administracion.js';
import { guardarDato, guardarModo, leerDato, obtenerModo } from './compras/gobernanza.js';
import { requiereNombre } from './compras/reglas.js';
import { etiquetaRol } from './compras/vista.js';
import { reiniciarVistaCompras, renderComprasView } from './compras/vista.js';
import {
  cerrarAsistente,
  reiniciarAsistente,
  sincronizarAsistente
} from './compras/asistente.js';
import { inicializarCookiesUI } from './compras/cookies.js';

function qs(id) {
  return document.getElementById(id);
}

function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

let wired = false;
let loginActivo = false;
let modoPresentacion = false;
let modoDatos = obtenerModo();

function showModule() {
  // El único módulo de esta aplicación es Adquisiciones y Compras.
  const vista = qs('view-compras');
  if (vista) vista.hidden = false;
  setActiveModule('compras');
  renderComprasView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const TEMA_KEY = 'erp_compras:tema';

function temaInicial() {
  try {
    const guardado = localStorage.getItem(TEMA_KEY);
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    // ignorar
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarModo(tema) {
  const oscuro = tema === 'dark';
  document.documentElement.dataset.theme = tema;
  const boton = qs('btn-tema');
  if (boton) {
    boton.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
    boton.setAttribute('aria-pressed', String(oscuro));
    boton.setAttribute('aria-label', oscuro ? 'Activar modo claro' : 'Activar modo oscuro');
  }
}

function alternarTema() {
  const actual = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const siguiente = actual === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(TEMA_KEY, siguiente);
  } catch {
    // ignorar
  }
  aplicarModo(siguiente);
}

function sincronizarModoPresentacion() {
  const panel = qs('login-directorio');
  const boton = qs('btn-modo-presentacion');
  const grilla = document.querySelector('.login-grid');
  // El directorio solo puede revelarse en Modo Demo; en Modo Real permanece oculto.
  const permitido = modoDatos === 'demo';
  const visible = permitido && modoPresentacion;
  if (panel) panel.hidden = !visible;
  if (grilla) grilla.classList.toggle('login-grid--presentacion', visible);
  if (boton) {
    boton.hidden = !permitido;
    boton.textContent = modoPresentacion
      ? 'Desactivar modo presentación'
      : 'Activar modo presentación';
    boton.setAttribute('aria-pressed', String(modoPresentacion));
    boton.setAttribute(
      'aria-label',
      modoPresentacion ? 'Ocultar directorio interno' : 'Mostrar directorio interno'
    );
  }
}

function alternarModoPresentacion() {
  if (modoDatos !== 'demo') return;
  modoPresentacion = !modoPresentacion;
  sincronizarModoPresentacion();
  if (modoPresentacion) qs('login-directorio-lista')?.querySelector('.directory-user')?.focus();
  else qs('btn-modo-presentacion')?.focus();
}

/** Sincroniza la UI del modo presentación con el estado persistido. */
function sincronizarModoPresentacionUI() {
  sincronizarModoPresentacion();
}

const SNAPSHOTS_MODO = { demo: 'snapshot_modo_demo', real: 'snapshot_modo_real' };

/** Sincroniza el conmutador, el estado visible y el directorio con el modo vigente. */
function sincronizarModoDatosUI() {
  for (const radio of document.querySelectorAll('input[name="modo-datos"]')) {
    radio.checked = radio.value === modoDatos;
  }
  const estado = qs('login-modo-estado');
  if (estado) {
    estado.textContent =
      modoDatos === 'demo'
        ? 'Modo Demo · datos de evaluación'
        : 'Modo Real · catálogos base y colecciones vacías';
  }
  poblarDirectorioUsuarios();
  sincronizarModoPresentacionUI();
}

/** Cambia el modo de datos, guarda la instantánea anterior y cierra la sesión abierta. */
function cambiarModoDatos(nuevoModo) {
  if (!Object.hasOwn(SNAPSHOTS_MODO, nuevoModo) || nuevoModo === modoDatos) return;
  const sesionAbierta = estaAutenticado();
  if (sesionAbierta) cerrarSesion();
  guardarDato(SNAPSHOTS_MODO[modoDatos], capturarDatosCompras());
  modoDatos = guardarModo(nuevoModo);
  const instantanea = leerDato(SNAPSHOTS_MODO[nuevoModo]);
  if (instantanea) restaurarDatosCompras(instantanea);
  else if (nuevoModo === 'real') inicializarModoReal();
  else cargarSemilla({ forzar: true });
  modoPresentacion = false;
  if (sesionAbierta) bloquearInterfaz();
  else sincronizarModoDatosUI();
}

function aplicarTema(config) {
  document.documentElement.style.setProperty('--accent', config.theme.accentColor);
}

function aplicarEtiquetas(config) {
  document.title = config.moduleName;
  const marca = qs('brand-name');
  if (marca) marca.textContent = config.moduleName;
  applyShellLabels();
}

function mostrarErroresConfig(errors) {
  const banner = qs('config-errors');
  if (!banner) return;
  if (errors && errors.length > 0) {
    banner.textContent = `Problema de configuración del módulo: ${errors.join(' ')}`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
    banner.textContent = '';
  }
}

function sincronizarSesionUI() {
  const usuario = getUsuarioActivo();
  const autenticado = estaAutenticado();
  const indicador = qs('sesion-indicador');
  const topbar = document.querySelector('.topbar');
  const esAdminTIActivo = autenticado && usuario.rol === 'admin_ti';

  if (indicador) {
    indicador.hidden = !autenticado;
    indicador.classList.toggle('admin-ti-activo', esAdminTIActivo);
    if (autenticado) {
      const nombre = String(usuario.nombre || '').trim();
      const rol = etiquetaRol(usuario.rol);
      const mismoRol = nombre.toLocaleLowerCase('es') === rol.toLocaleLowerCase('es');
      const partes = requiereNombre(usuario.rol) && nombre && !mismoRol ? [nombre, rol] : [rol];
      const centro = leer('centros_costo').find((c) => c.id === usuario.centro_costo_id);
      if (centro) partes.push(`${centro.codigo} · ${centro.nombre}`);
      indicador.textContent = partes.join(' · ');
      indicador.setAttribute('aria-label', `Sesión activa: ${partes.join(', ')}`);
    } else {
      indicador.textContent = '';
      indicador.removeAttribute('aria-label');
    }
  }

  const controlRoles = qs('admin-rol-control');
  if (controlRoles) controlRoles.hidden = !esAdminTIActivo;

  if (topbar) topbar.classList.toggle('admin-ti-activo', esAdminTIActivo);
  sincronizarAsistente();
}

function ocultarErrorLogin() {
  const error = qs('login-error');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  for (const id of ['login-email-error', 'login-clave-error']) {
    const inline = qs(id);
    if (inline) {
      inline.hidden = true;
      inline.textContent = '';
    }
  }
  for (const id of ['login-email', 'login-clave']) {
    qs(id)?.removeAttribute('aria-invalid');
  }
}

function limpiarErrorCampo(id) {
  const inline = qs(`${id}-error`);
  if (inline) {
    inline.hidden = true;
    inline.textContent = '';
  }
  qs(id)?.removeAttribute('aria-invalid');
}

function mostrarErrorLogin(resultado) {
  const error = qs('login-error');
  if (error) {
    error.textContent = resultado.motivo;
    error.hidden = false;
  }
  const id = {
    email: 'login-email',
    clave: 'login-clave'
  }[resultado.campo];
  if (id && ['login-email', 'login-clave'].includes(id)) {
    const inline = qs(`${id}-error`);
    if (inline) {
      inline.textContent = resultado.motivo;
      inline.hidden = false;
    }
  }
  if (id) {
    qs(id)?.setAttribute('aria-invalid', 'true');
    qs(id)?.focus();
  }
}

/**
 * Genera el directorio visible desde los usuarios y centros de costo semilla.
 * En Modo Real no se materializan las credenciales ni siquiera en el DOM.
 */
function poblarDirectorioUsuarios() {
  const lista = qs('login-directorio-lista');
  if (!lista) return;
  if (modoDatos !== 'demo') {
    lista.innerHTML = '';
    return;
  }
  const usuarios = listarDirectorioUsuarios();
  lista.innerHTML = usuarios
    .map(
      (usuario) => `
      <li>
        <button type="button" class="directory-user" data-id="${escapar(usuario.id)}" data-email="${escapar(usuario.email)}"
          aria-label="Ingresar como ${escapar(usuario.nombre)}, ${escapar(usuario.rol_etiqueta)}, ${escapar(usuario.centro_etiqueta)}">
          <span class="directory-avatar" aria-hidden="true">${escapar(monogramFor(usuario.nombre))}</span>
          <span class="directory-info">
            <strong>${escapar(usuario.nombre)}</strong>
            <span class="directory-email">${escapar(usuario.email)}</span>
            <span class="directory-clave">Clave: ${escapar(CLAVE_DEMO)}</span>
            <span class="directory-meta">${escapar(usuario.rol_etiqueta)} · ${escapar(usuario.centro_etiqueta)}</span>
          </span>
          <svg class="directory-arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9"></path><path d="M8.5 4.5L12 8l-3.5 3.5"></path></svg>
        </button>
      </li>`
    )
    .join('');

  lista.querySelectorAll('.directory-user').forEach((boton) =>
    boton.addEventListener('click', () => {
      qs('login-email').value = boton.dataset.email;
      qs('login-clave').value = CLAVE_DEMO;
      ocultarErrorLogin();
      enviarFormularioLogin();
    })
  );
}

function enviarFormularioLogin() {
  const form = qs('login-form');
  if (!form) return;
  if (typeof form.requestSubmit === 'function') form.requestSubmit();
  else
    form.dispatchEvent(
      new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true })
    );
}

function bloquearInterfaz() {
  const overlay = qs('login-overlay');
  if (!overlay) return;

  overlay.hidden = false;
  loginActivo = true;
  cerrarAsistente();
  ocultarErrorLogin();
  modoPresentacion = false;
  sincronizarModoDatosUI();

  const workspace = document.querySelector('.workspace');
  if (workspace) {
    workspace.inert = true;
    workspace.setAttribute('aria-hidden', 'true');
  }
  const logout = qs('btn-logout');
  if (logout) logout.hidden = true;
  cerrarAsistente();
  reiniciarAsistente();
  sincronizarSesionUI();

  const email = qs('login-email');
  if (email) email.value = '';
  const clave = qs('login-clave');
  if (clave) {
    clave.value = '';
    clave.type = 'password';
  }
  const mostrar = qs('login-mostrar-clave');
  if (mostrar) {
    mostrar.textContent = 'Mostrar';
    mostrar.setAttribute('aria-pressed', 'false');
  }

  email?.focus();
}

function desbloquearInterfaz(renderizar = true) {
  const overlay = qs('login-overlay');
  if (!overlay) return;

  overlay.hidden = true;
  loginActivo = false;
  ocultarErrorLogin();

  const workspace = document.querySelector('.workspace');
  if (workspace) {
    workspace.inert = false;
    workspace.removeAttribute('aria-hidden');
  }
  const logout = qs('btn-logout');
  if (logout) logout.hidden = false;

  sincronizarSesionUI();
  if (renderizar) {
    reiniciarVistaCompras();
    renderComprasView();
  }
  qs('compras-root')?.querySelector('h1')?.focus();
}

function enviarLogin(evento) {
  evento.preventDefault();
  ocultarErrorLogin();
  const clave = qs('login-clave')?.value;
  const resultado = iniciarSesionConIdentificador(qs('login-email')?.value, clave);
  if (!resultado.ok) {
    mostrarErrorLogin(resultado);
    return;
  }
  desbloquearInterfaz();
}

function alternarVisibilidadClave() {
  const clave = qs('login-clave');
  const boton = qs('login-mostrar-clave');
  if (!clave || !boton) return;

  const mostrar = clave.type === 'password';
  clave.type = mostrar ? 'text' : 'password';
  boton.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  boton.setAttribute('aria-pressed', String(mostrar));
  boton.setAttribute('aria-label', mostrar ? 'Ocultar clave de acceso' : 'Mostrar clave de acceso');
  clave.focus();
}

function mantenerFocoEnLogin(evento) {
  if (!loginActivo || evento.key !== 'Tab') return;
  const overlay = qs('login-overlay');
  if (!overlay) return;

  const enfocables = [
    ...overlay.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
    )
  ].filter(
    (elemento) => !elemento.closest('[hidden]') && !elemento.closest('details:not([open])')
  );
  if (enfocables.length === 0) return;

  const primero = enfocables[0];
  const ultimo = enfocables[enfocables.length - 1];
  if (!overlay.contains(document.activeElement)) {
    evento.preventDefault();
    primero.focus();
    return;
  }
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}

function cablearEventos() {
  if (wired) return;
  wired = true;

  document
    .querySelectorAll('.nav-module')
    .forEach((boton) => boton.addEventListener('click', () => showModule()));

  qs('login-form')?.addEventListener('submit', enviarLogin);
  qs('login-email')?.addEventListener('input', () => limpiarErrorCampo('login-email'));
  qs('login-clave')?.addEventListener('input', () => limpiarErrorCampo('login-clave'));
  qs('login-mostrar-clave')?.addEventListener('click', alternarVisibilidadClave);
  qs('btn-modo-presentacion')?.addEventListener('click', alternarModoPresentacion);
  document.querySelectorAll('input[name="modo-datos"]').forEach((radio) =>
    radio.addEventListener('change', () => cambiarModoDatos(radio.value))
  );
  qs('btn-tema')?.addEventListener('click', alternarTema);
  qs('btn-logout')?.addEventListener('click', () => {
    cerrarSesion();
    bloquearInterfaz();
  });
  document.addEventListener('keydown', mantenerFocoEnLogin);
}

export function initApp(resolved) {
  mostrarErroresConfig(resolved.errors);
  setActiveConfig(resolved.config);
  aplicarModo(temaInicial());
  aplicarTema(resolved.config);
  renderLogo(qs('logo-mark'));
  renderLogo(qs('login-logo'));
  aplicarEtiquetas(resolved.config);
  sincronizarModoDatosUI();
  cablearEventos();
  inicializarCookiesUI();

  // Una cuenta suspendida no conserva una sesión abierta tras recargar.
  if (estaAutenticado() && usuarioSuspendido(getSesion().usuario_id)) cerrarSesion();

  if (estaAutenticado()) {
    showModule();
    desbloquearInterfaz(false);
  } else {
    bloquearInterfaz();
  }
}

export async function boot(overrideConfig) {
  const resolved =
    overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
