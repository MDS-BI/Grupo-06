import semilla from './semilla.json';
import { loadEntities, saveEntities } from '../storage.js';
import { ROLES, diasEntre, hoyISO, sumarDias } from './reglas.js';

const PREFIX = 'erp_compras:';
const memoria = new Map();

export const COLECCIONES = Object.freeze([
  'usuarios',
  'centros_costo',
  'productos',
  'solicitudes',
  'cotizaciones',
  'ordenes',
  'recepciones',
  'facturas',
  'devoluciones',
  'catalogo',
  'evaluaciones'
]);

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
    return raw ? JSON.parse(raw) : [];
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

export function eliminar(nombre, id) {
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

export function cargarSemilla({ forzar = false, hoy = hoyISO() } = {}) {
  if (!forzar && semillaCargada()) return { cargada: false, motivo: 'ya_cargada' };
  const delta = diasEntre('2026-11-03', hoy);
  const datos = desplazarFechas(clonar(semilla), delta);
  try {
    for (const nombre of COLECCIONES) {
      if (Array.isArray(datos[nombre])) guardar(nombre, datos[nombre]);
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
  if (semillaCargada()) return { cargada: false, motivo: 'ya_cargada' };
  return cargarSemilla();
}

const SESION_KEY = 'sesion';
const SESION_DEFAULT = Object.freeze({ usuario_id: 'u-solicitante-1', rol: 'solicitante' });

export function getSesion() {
  try {
    const raw = leerCrudo(SESION_KEY);
    if (!raw) return { ...SESION_DEFAULT };
    const sesion = JSON.parse(raw);
    if (!ROLES.includes(sesion.rol)) return { ...SESION_DEFAULT };
    return { ...SESION_DEFAULT, ...sesion };
  } catch {
    return { ...SESION_DEFAULT };
  }
}

export function setSesion(sesion) {
  const rol = ROLES.includes(sesion.rol) ? sesion.rol : 'solicitante';
  const usuarios = leer('usuarios');
  const candidato =
    usuarios.find((u) => u.rol === rol) || usuarios.find((u) => u.id === sesion.usuario_id);
  const out = { usuario_id: sesion.usuario_id || candidato?.id || SESION_DEFAULT.usuario_id, rol };
  escribirCrudo(SESION_KEY, JSON.stringify(out));
  return out;
}

export function getUsuarioActivo() {
  const sesion = getSesion();
  const usuarios = leer('usuarios');
  const usuario = usuarios.find((u) => u.id === sesion.usuario_id) ||
    usuarios.find((u) => u.rol === sesion.rol) || {
      id: sesion.usuario_id,
      nombre: sesion.rol,
      rol: sesion.rol
    };
  return { ...usuario, rol: sesion.rol };
}

export function setRolActivo(rol) {
  const usuarios = leer('usuarios');
  const usuario = usuarios.find((u) => u.rol === rol);
  return setSesion({ rol, usuario_id: usuario?.id });
}

export const PERMISOS = Object.freeze({
  crear_solicitud: ['solicitante', 'comprador', 'jefe_compras', 'admin_ti'],
  aprobar_solicitud: ['jefe_compras', 'admin_ti'],
  gestionar_proveedores: ['comprador', 'jefe_compras', 'admin_ti'],
  editar_datos_bancarios: ['admin_ti'],
  emitir_oc: ['comprador', 'jefe_compras', 'admin_ti'],
  gestionar_cotizaciones: ['comprador', 'jefe_compras', 'admin_ti'],
  registrar_recepcion: ['bodega', 'admin_ti'],
  registrar_factura: ['comprador', 'jefe_compras', 'admin_ti'],
  conciliar_factura: ['comprador', 'jefe_compras', 'admin_ti'],
  aprobar_pago: ['jefe_compras', 'admin_ti'],
  registrar_devolucion: ['bodega', 'admin_ti'],
  aprobar_devolucion: ['jefe_compras', 'admin_ti'],
  gestionar_catalogo: ['comprador', 'jefe_compras', 'admin_ti'],
  evaluar_proveedor: ['comprador', 'jefe_compras', 'admin_ti'],
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
