export const CLAVE_CONSENTIMIENTO = 'compras_cookie_consent_v1';

export function leerConsentimiento() {
  try {
    const raw = sessionStorage.getItem(CLAVE_CONSENTIMIENTO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function guardarConsentimiento(preferencias) {
  const estado = {
    esenciales: true,
    preferenciasUI: !!preferencias?.preferenciasUI,
    analiticaInterna: !!preferencias?.analiticaInterna,
    aceptadoTodas: !!preferencias?.aceptadoTodas,
    soloEsenciales: !!preferencias?.soloEsenciales,
    fecha: new Date().toISOString()
  };
  sessionStorage.setItem(CLAVE_CONSENTIMIENTO, JSON.stringify(estado));
  return estado;
}

export function aceptarTodas() {
  return guardarConsentimiento({ preferenciasUI: true, analiticaInterna: true, aceptadoTodas: true });
}

export function soloEsenciales() {
  return guardarConsentimiento({ preferenciasUI: false, analiticaInterna: false, soloEsenciales: true });
}

function escogerValor(estado, clave, porDefecto = false) {
  return estado?.[clave] ?? porDefecto;
}

export function inicializarCookiesUI() {
  const banner = document.getElementById('cookies-banner');
  const modal = document.getElementById('cookies-modal');
  const footerBoton = document.getElementById('btn-cookies');
  if (!banner || !modal || !footerBoton) return;

  const plantillaBanner = `
    <div class="cookies-card" role="region" aria-label="Consentimiento de cookies">
      <p><strong>Tu privacidad importa.</strong> Usamos cookies esenciales para la sesión y, si lo permites, preferencias de interfaz y analítica interna.</p>
      <div class="cookies-acciones">
        <button type="button" class="cookies-btn primario" data-cookie="todas">Aceptar todas</button>
        <button type="button" class="cookies-btn" data-cookie="esenciales">Solo esenciales</button>
        <button type="button" class="cookies-btn" data-cookie="configurar">Configurar preferencias</button>
      </div>
    </div>`;

  const plantillaModal = `
    <div class="cookies-card" role="dialog" aria-modal="true" aria-labelledby="cookies-titulo">
      <h2 id="cookies-titulo">Configurar preferencias</h2>
      <label><input type="checkbox" checked disabled /> Esenciales (siempre activas)</label>
      <label><input type="checkbox" id="cookie-ui" /> Preferencias UI</label>
      <label><input type="checkbox" id="cookie-analitica" /> Analítica interna</label>
      <div class="cookies-acciones">
        <button type="button" class="cookies-btn primario" data-cookie="guardar">Guardar preferencias</button>
        <button type="button" class="cookies-btn" data-cookie="cerrar">Cancelar</button>
      </div>
    </div>`;

  function ocultarTodo() {
    banner.hidden = true;
    modal.hidden = true;
  }

  function abrirBanner() {
    banner.innerHTML = plantillaBanner;
    banner.hidden = Boolean(leerConsentimiento());
  }

  function abrirModal() {
    const actual = leerConsentimiento() || {};
    modal.innerHTML = plantillaModal;
    modal.hidden = false;
    modal.querySelector('#cookie-ui').checked = escogerValor(actual, 'preferenciasUI');
    modal.querySelector('#cookie-analitica').checked = escogerValor(actual, 'analiticaInterna');
  }

  banner.addEventListener('click', (evento) => {
    const accion = evento.target?.dataset?.cookie;
    if (accion === 'todas') {
      aceptarTodas();
      ocultarTodo();
    } else if (accion === 'esenciales') {
      soloEsenciales();
      ocultarTodo();
    } else if (accion === 'configurar') {
      abrirModal();
    }
  });

  modal.addEventListener('click', (evento) => {
    const accion = evento.target?.dataset?.cookie;
    if (accion === 'guardar') {
      guardarConsentimiento({
        preferenciasUI: modal.querySelector('#cookie-ui').checked,
        analiticaInterna: modal.querySelector('#cookie-analitica').checked
      });
      ocultarTodo();
    } else if (accion === 'cerrar') {
      modal.hidden = true;
    }
  });

  footerBoton.addEventListener('click', abrirModal);
  abrirBanner();
}