import { loadModuleConfig, normalizeConfig, setActiveConfig } from './module-config.js';
import { renderLogo, applyShellLabels, setActiveModule } from './components/shell.js';
import { getUsuarioActivo, setRolActivo } from './compras/almacenamiento.js';
import { renderComprasView } from './compras/vista.js';

function qs(id) {
  return document.getElementById(id);
}

let wired = false;

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

function cablearEventos() {
  if (wired) return;
  wired = true;

  document.querySelectorAll('.nav-module').forEach((boton) =>
    boton.addEventListener('click', () => showModule())
  );

  const selectorRol = qs('rol-activo');
  if (!selectorRol) return;
  const usuario = getUsuarioActivo();
  if ([...selectorRol.options].some((opcion) => opcion.value === usuario.rol)) {
    selectorRol.value = usuario.rol;
  }
  selectorRol.addEventListener('change', (evento) => {
    setRolActivo(evento.target.value);
    renderComprasView();
  });
}

export function initApp(resolved) {
  mostrarErroresConfig(resolved.errors);
  setActiveConfig(resolved.config);
  aplicarTema(resolved.config);
  renderLogo(qs('logo-mark'));
  aplicarEtiquetas(resolved.config);
  cablearEventos();
  showModule();
}

export async function boot(overrideConfig) {
  const resolved =
    overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
