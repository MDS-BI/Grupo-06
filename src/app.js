import { loadModuleConfig, normalizeConfig, setActiveConfig } from './module-config.js';
import { renderLogo, applyShellLabels, setActiveModule } from './components/shell.js';
import {
  getUsuarioActivo,
  setRolActivo,
  estaAutenticado
} from './compras/almacenamiento.js';
import { cerrarSesion, iniciarSesion, listarUsuarios } from './compras/autenticacion.js';
import { requiereNombre } from './compras/reglas.js';
import { renderComprasView } from './compras/vista.js';

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

function showModule() {
  // El único módulo de esta aplicación es Adquisiciones y Compras.
  const vista = qs('view-compras');
  if (vista) vista.hidden = false;
  setActiveModule('compras');
  renderComprasView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

function sincronizarSelectorRol() {
  const selector = qs('rol-activo');
  if (!selector) return;
  const rol = getUsuarioActivo().rol;
  selector.value = [...selector.options].some((opcion) => opcion.value === rol)
    ? rol
    : selector.options[0].value;
}

function poblarNombresLogin(rol) {
  const datalist = qs('nombres-demo');
  if (!datalist) return;
  const nombres = requiereNombre(rol)
    ? listarUsuarios()
        .filter((usuario) => usuario.rol === rol)
        .map((usuario) => usuario.nombre)
        .filter(Boolean)
    : [];
  datalist.innerHTML = [...new Set(nombres)]
    .map((nombre) => `<option value="${escapar(nombre)}"></option>`)
    .join('');
}

/** El campo de nombre solo existe para Solicitante y Comprador. */
function actualizarCampoNombre({ enfocar = false } = {}) {
  const rol = qs('login-rol')?.value;
  const campo = qs('campo-nombre');
  const nombre = qs('login-nombre');
  if (!campo || !nombre) return;

  const visible = requiereNombre(rol);
  campo.hidden = !visible;
  nombre.required = visible;
  if (!visible) nombre.value = '';
  poblarNombresLogin(rol);
  if (visible && enfocar) nombre.focus();
}

function ocultarErrorLogin() {
  const error = qs('login-error');
  if (!error) return;
  error.hidden = true;
  error.textContent = '';
}

function bloquearInterfaz() {
  const overlay = qs('login-overlay');
  if (!overlay) return;

  overlay.hidden = false;
  loginActivo = true;
  ocultarErrorLogin();

  const workspace = document.querySelector('.workspace');
  if (workspace) {
    workspace.inert = true;
    workspace.setAttribute('aria-hidden', 'true');
  }
  const logout = qs('btn-logout');
  if (logout) logout.hidden = true;

  const rol = qs('login-rol');
  if (rol) rol.value = '';
  const nombre = qs('login-nombre');
  if (nombre) nombre.value = '';
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

  actualizarCampoNombre();
  rol?.focus();
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

  sincronizarSelectorRol();
  if (renderizar) renderComprasView();
  qs('compras-root')?.querySelector('h1')?.focus();
}

function enviarLogin(evento) {
  evento.preventDefault();
  const rol = qs('login-rol')?.value;
  const nombre = qs('login-nombre')?.value;
  const resultado = iniciarSesion(rol, nombre, qs('login-clave')?.value);
  if (!resultado.ok) {
    const error = qs('login-error');
    if (error) {
      error.textContent = resultado.motivo;
      error.hidden = false;
    }
    const id = { rol: 'login-rol', nombre: 'login-nombre', clave: 'login-clave' }[resultado.campo];
    qs(id)?.focus();
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
  ].filter((elemento) => !elemento.closest('[hidden]'));
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

  document.querySelectorAll('.nav-module').forEach((boton) =>
    boton.addEventListener('click', () => showModule())
  );

  const selectorRol = qs('rol-activo');
  if (selectorRol) {
    selectorRol.addEventListener('change', (evento) => {
      setRolActivo(evento.target.value);
      renderComprasView();
    });
  }

  qs('login-form')?.addEventListener('submit', enviarLogin);
  qs('login-rol')?.addEventListener('change', () => actualizarCampoNombre({ enfocar: true }));
  qs('login-mostrar-clave')?.addEventListener('click', alternarVisibilidadClave);
  qs('btn-logout')?.addEventListener('click', () => {
    cerrarSesion();
    bloquearInterfaz();
  });
  document.addEventListener('keydown', mantenerFocoEnLogin);
}

export function initApp(resolved) {
  mostrarErroresConfig(resolved.errors);
  setActiveConfig(resolved.config);
  aplicarTema(resolved.config);
  renderLogo(qs('logo-mark'));
  renderLogo(qs('login-logo'));
  aplicarEtiquetas(resolved.config);
  cablearEventos();
  showModule();

  if (estaAutenticado()) desbloquearInterfaz(false);
  else bloquearInterfaz();
}

export async function boot(overrideConfig) {
  const resolved =
    overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
