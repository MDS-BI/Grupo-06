import semilla from './semilla.json';
import { loadEntities, saveEntities } from '../storage.js';
import { ROLES, ROLES_CON_NOMBRE, diasEntre, hoyISO, sumarDias } from './reglas.js';

const PREFIX = 'erp_compras:';
const memoria = new Map();

export const COLECCIONES = Object.freeze([
  'usuarios',
  'centros_costo',
  'productos',
  'proveedores',
  'solicitudes',
  'cotizaciones',
  'ordenes',
  'recepciones',
  'facturas',
  'devoluciones',
  'catalogo',
  'evaluaciones',
  'trazabilidad'
]);

/** Nombres corporativos de los usuarios semilla que no traen el campo `nombre`. */
const NOMBRES_USUARIO_SEMILLA = Object.freeze({
  'u-bodega-1': 'Encargado de Bodega',
  'u-admin-1': 'Administrador TI'
});

/** Completa el nombre de un usuario sin sobrescribir los nombres ya registrados. */
function normalizarUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return usuario;
  if (String(usuario.nombre ?? '').trim()) return usuario;
  const nombre = NOMBRES_USUARIO_SEMILLA[usuario.id];
  return nombre ? { ...usuario, nombre } : usuario;
}

function normalizarUsuarios(lista) {
  return Array.isArray(lista) ? lista.map(normalizarUsuario) : lista;
}

const ENTIDAD_POR_COLECCION = Object.freeze({
  solicitudes: 'solicitud',
  cotizaciones: 'cotizacion',
  ordenes: 'orden',
  recepciones: 'recepcion',
  facturas: 'factura',
  devoluciones: 'devolucion'
});

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function clave(nombre) {
  return `${PREFIX}${nombre}`;
}

function leerCrudo(nombre) {
  const s = storage();
  if (!s) return memoria.has(nombre) ? memoria.get(nombre) : null;
  try {
    return s.getItem(clave(nombre));
  } catch {
    return null;
  }
}

function escribirCrudo(nombre, valor) {
  const s = storage();
  if (!s) {
    memoria.set(nombre, valor);
    return;
  }
  try {
    s.setItem(clave(nombre), valor);
  } catch (e) {
    throw new Error(`No se pudo guardar en el almacenamiento local: ${e.message}`);
  }
}

export function leer(nombre) {
  try {
    const raw = leerCrudo(nombre);
    const datos = raw ? JSON.parse(raw) : [];
    // La normalización en lectura también cubre datos previos guardados sin nombre.
    return nombre === 'usuarios' ? normalizarUsuarios(datos) : datos;
  } catch (e) {
    console.error(`No se pudo leer la colección ${nombre}`, e);
    return [];
  }
}

export function guardar(nombre, lista) {
  escribirCrudo(nombre, JSON.stringify(lista));
  return lista;
}

export function generarId(prefijo = 'id') {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function agregar(nombre, item) {
  const lista = leer(nombre);
  lista.push(item);
  guardar(nombre, lista);
  return item;
}

export function buscar(nombre, id) {
  return leer(nombre).find((item) => item.id === id || item.entity_id === id);
}

export function actualizar(nombre, id, cambios) {
  const lista = leer(nombre);
  const idx = lista.findIndex((item) => item.id === id || item.entity_id === id);
  if (idx === -1) throw new Error('Registro no encontrado');
  lista[idx] = { ...lista[idx], ...cambios, updatedAt: new Date().toISOString() };
  guardar(nombre, lista);
  return lista[idx];
}

export function puedeEliminar(nombre, id) {
  const entidad = ENTIDAD_POR_COLECCION[nombre];
  if (!entidad) return true;
  return !leer('trazabilidad').some((e) => e.entidad === entidad && e.entidad_id === id);
}

export function eliminar(nombre, id) {
  if (!puedeEliminar(nombre, id)) {
    const error = new Error(
      'No se puede eliminar un documento con historial; debes anularlo con un motivo registrado'
    );
    error.codigo = 'DOCUMENTO_CON_HISTORIAL';
    throw error;
  }
  const lista = leer(nombre);
  const nueva = lista.filter((item) => item.id !== id && item.entity_id !== id);
  guardar(nombre, nueva);
  return nueva;
}

export function limpiarColeccion(nombre) {
  guardar(nombre, []);
}

export function reiniciarCompras() {
  for (const nombre of COLECCIONES) guardar(nombre, []);
  escribirCrudo('meta', JSON.stringify({ semilla_cargada: false }));
}

export function semillaCargada() {
  try {
    const raw = leerCrudo('meta');
    return Boolean(raw && JSON.parse(raw).semilla_cargada);
  } catch {
    return false;
  }
}

export function marcarSemillaCargada(valor = true) {
  escribirCrudo('meta', JSON.stringify({ semilla_cargada: valor }));
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function desplazarFechas(valor, delta) {
  if (delta === 0) return valor;
  if (Array.isArray(valor)) return valor.map((v) => desplazarFechas(v, delta));
  if (valor && typeof valor === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(valor)) {
      out[k] =
        typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? sumarDias(v, delta)
          : desplazarFechas(v, delta);
    }
    return out;
  }
  return valor;
}

function proveedorDesdeSemilla(p, hoy) {
  const fechaCambio = p.cambio_cuenta_reciente ? sumarDias(hoy, -10) : p.fecha_cambio_cuenta;
  return {
    id: p.entity_id,
    entity_id: p.entity_id,
    name: p.razon_social,
    code: p.codigo,
    taxId: p.rut,
    email: p.email,
    phone: p.telefono,
    address: p.direccion,
    category: p.categoria,
    description: p.giro,
    paymentTerms: `neto ${p.condicion_pago_dias}`,
    tipo_persona: p.tipo_persona,
    giro: p.giro,
    region: p.region,
    comuna: p.comuna,
    tamano_empresa: p.tamano_empresa,
    estado_proveedor: p.estado_proveedor,
    condicion_pago_dias: p.condicion_pago_dias,
    acuerdo_plazo_mayor: p.acuerdo_plazo_mayor || '',
    banco: p.banco || '',
    numero_cuenta: p.numero_cuenta || '',
    fecha_cambio_cuenta: fechaCambio || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/** Colecciones semilla que aún no existen en el almacenamiento. */
function coleccionesSinDatos() {
  return COLECCIONES.filter((nombre) => {
    if (!Array.isArray(semilla[nombre])) return false;
    return !leerCrudo(nombre);
  });
}

export function cargarSemilla({ forzar = false, hoy = hoyISO() } = {}) {
  const yaCargada = semillaCargada();
  const faltantes = coleccionesSinDatos();
  if (!forzar && yaCargada && faltantes.length === 0) {
    return { cargada: false, motivo: 'ya_cargada' };
  }
  const delta = diasEntre('2026-11-03', hoy);
  const datos = desplazarFechas(clonar(semilla), delta);
  try {
    for (const nombre of COLECCIONES) {
      if (!Array.isArray(datos[nombre])) continue;
      // Si la semilla ya estaba cargada, solo rellenamos lo que falta sin borrar cambios del usuario.
      if (!forzar && yaCargada && !faltantes.includes(nombre)) continue;
      guardar(nombre, nombre === 'usuarios' ? normalizarUsuarios(datos[nombre]) : datos[nombre]);
    }
    if (Array.isArray(datos.proveedores)) {
      const actuales = loadEntities();
      const existentes = new Set(actuales.map((e) => e.entity_id));
      const nuevos = datos.proveedores
        .filter((p) => !existentes.has(p.entity_id))
        .map((p) => proveedorDesdeSemilla(p, hoy));
      if (nuevos.length > 0) saveEntities([...actuales, ...nuevos]);
    }
    marcarSemillaCargada(true);
    return { cargada: true, motivo: 'ok' };
  } catch (e) {
    return { cargada: false, motivo: e.message };
  }
}

export function asegurarSemilla() {
  if (semillaCargada() && coleccionesSinDatos().length === 0) {
    return { cargada: false, motivo: 'ya_cargada' };
  }
  return cargarSemilla();
}

const SESION_KEY = 'sesion';
const AUTENTICACION_KEY = 'autenticado';
const SESION_DEFAULT = Object.freeze({ usuario_id: 'u-solicitante-1', rol: 'solicitante' });

/** Indica si la sesión de demostración fue iniciada con la clave genérica. */
export function estaAutenticado() {
  try {
    return leerCrudo(AUTENTICACION_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Registra el estado de autenticación de la sesión de demostración. */
export function marcarAutenticacion(valor = true) {
  escribirCrudo(AUTENTICACION_KEY, valor ? 'true' : 'false');
  return Boolean(valor);
}

/** Completa la identidad de la sesión con el usuario semilla correspondiente. */
function completarSesion(sesion) {
  const usuarios = leer('usuarios');
  const usuario =
    usuarios.find((u) => u.id === sesion.usuario_id) ||
    usuarios.find((u) => u.rol === sesion.rol);
  return {
    ...SESION_DEFAULT,
    ...sesion,
    nombre: sesion.nombre || usuario?.nombre || etiquetaRolTexto(sesion.rol),
    centro_costo_id: sesion.centro_costo_id || usuario?.centro_costo_id || ''
  };
}

export function getSesion() {
  try {
    const raw = leerCrudo(SESION_KEY);
    if (!raw) return completarSesion({ ...SESION_DEFAULT });
    const sesion = JSON.parse(raw);
    if (!ROLES.includes(sesion.rol)) return completarSesion({ ...SESION_DEFAULT });
    return completarSesion(sesion);
  } catch {
    return completarSesion({ ...SESION_DEFAULT });
  }
}

export function setSesion(sesion) {
  const rol = ROLES.includes(sesion.rol) ? sesion.rol : 'solicitante';
  const usuarios = leer('usuarios');
  const usuario =
    usuarios.find((u) => u.id === sesion.usuario_id) || usuarios.find((u) => u.rol === rol);
  const out = {
    usuario_id: usuario?.id || sesion.usuario_id || SESION_DEFAULT.usuario_id,
    nombre: usuario?.nombre || sesion.nombre || etiquetaRolTexto(rol),
    rol,
    centro_costo_id: usuario?.centro_costo_id || sesion.centro_costo_id || ''
  };
  escribirCrudo(SESION_KEY, JSON.stringify(out));
  return out;
}

export function getUsuarioActivo() {
  const sesion = getSesion();
  const usuarios = leer('usuarios');
  const candidato =
    usuarios.find((u) => u.id === sesion.usuario_id) ||
    usuarios.find((u) => u.rol === sesion.rol);
  const usuario = candidato || {
    id: sesion.usuario_id,
    nombre: sesion.nombre || etiquetaRolTexto(sesion.rol),
    rol: sesion.rol,
    centro_costo_id: sesion.centro_costo_id
  };
  return {
    ...usuario,
    nombre: String(usuario.nombre || '').trim() || etiquetaRolTexto(sesion.rol),
    rol: sesion.rol,
    centro_costo_id: usuario.centro_costo_id || sesion.centro_costo_id || ''
  };
}

function etiquetaRolTexto(rol) {
  return (
    {
      solicitante: 'Solicitante',
      comprador: 'Comprador',
      jefe_compras: 'Jefe de Compras',
      bodega: 'Encargado de Bodega',
      admin_ti: 'Administrador TI'
    }[rol] || rol
  );
}

/** Etiqueta visible de un usuario: persona solo en solicitante/comprador, rol en el resto. */
export function etiquetaUsuario(id) {
  const usuario = leer('usuarios').find((u) => u.id === id);
  if (!usuario) return id || '';
  if (ROLES_CON_NOMBRE.includes(usuario.rol)) {
    return usuario.nombre || etiquetaRolTexto(usuario.rol);
  }
  return etiquetaRolTexto(usuario.rol);
}

export function setRolActivo(rol) {
  // El rol queda fijo durante una sesión iniciada: solo se cambia al cerrar sesión.
  if (estaAutenticado()) return getSesion();
  const usuarios = leer('usuarios');
  const usuario = usuarios.find((u) => u.rol === rol);
  return setSesion({ rol, usuario_id: usuario?.id });
}

export const PERMISOS = Object.freeze({
  crear_solicitud: ['solicitante', 'comprador', 'jefe_compras', 'bodega', 'admin_ti'],
  aprobar_solicitud: ['jefe_compras'],
  gestionar_proveedores: ['comprador'],
  editar_datos_bancarios: ['admin_ti'],
  desbloquear_proveedor: ['admin_ti'],
  emitir_oc: ['comprador'],
  gestionar_cotizaciones: ['comprador'],
  registrar_recepcion: ['bodega'],
  registrar_factura: ['comprador'],
  conciliar_factura: ['comprador'],
  aprobar_pago: ['jefe_compras'],
  registrar_devolucion: ['bodega'],
  aprobar_devolucion: ['jefe_compras'],
  gestionar_catalogo: ['comprador'],
  evaluar_proveedor: ['comprador', 'jefe_compras'],
  consultar_trazabilidad: ['jefe_compras', 'admin_ti'],
  exportar_trazabilidad: ['admin_ti'],
  exportar: ['solicitante', 'comprador', 'jefe_compras', 'bodega', 'admin_ti']
});

export function puede(accion, usuario = getUsuarioActivo()) {
  const roles = PERMISOS[accion];
  return Boolean(roles && roles.includes(usuario?.rol));
}

export function exigirPermiso(accion, usuario = getUsuarioActivo()) {
  if (!puede(accion, usuario))
    throw new Error(`El rol ${usuario?.rol || 'desconocido'} no puede ejecutar esta acción`);
}
