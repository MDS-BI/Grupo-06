import { loadEntities, saveEntities } from '../storage.js';
import {
  generarId,
  leer,
  exigirPermiso,
  getUsuarioActivo,
  puede
} from './almacenamiento.js';
import {
  validarRut,
  formatearRut,
  normalizarRut,
  puedeEditarDatosBancarios,
  validarCondicionPago,
  hoyISO
} from './reglas.js';
import {
  CUENTA_NO_DISPONIBLE,
  enmascararCuentaPorRol,
  enmascararRutProveedor,
  puedeVerDatosBancarios,
  puedeVerRutProveedor
} from './visibilidad.js';
import { registrarCambioBancario, registrarEvento } from './trazabilidad.js';
import {
  BANCO_ESTADO,
  esBancoValido,
  esCuentaRut,
  esTipoCuentaValido,
  normalizarBanco,
  normalizarTipoCuenta
} from './catalogos-bancarios.js';

/** Etiquetas legibles de estado, derivadas del estado operativo canónico. */
const ETIQUETA_ESTADO = Object.freeze({
  potencial: 'En evaluación',
  aprobado: 'Activo',
  bloqueado: 'Suspendido'
});

const ESTADOS_PROVEEDOR = Object.freeze(['potencial', 'aprobado', 'bloqueado']);
const TRANSICIONES_PROVEEDOR = Object.freeze({
  potencial: ['aprobado'],
  aprobado: ['bloqueado'],
  bloqueado: []
});

const CAMPOS_REQUERIDOS = Object.freeze({
  razon_social: 'La razón social es obligatoria',
  rut: 'El RUT es obligatorio',
  tipo_persona: 'El tipo de persona es obligatorio',
  giro: 'El giro es obligatorio',
  region: 'La región es obligatoria',
  condicion_pago_dias: 'La condición de pago es obligatoria'
});

export function esProveedor(entidad) {
  return Boolean(entidad && (entidad.tipo_persona || entidad.estado_proveedor));
}

export function listarProveedores() {
  return loadEntities().filter(esProveedor);
}

export function obtenerProveedor(id) {
  return listarProveedores().find((p) => p.id === id || p.entity_id === id);
}

export function buscarProveedores(termino, usuario = getUsuarioActivo()) {
  const q = String(termino ?? '')
    .trim()
    .toLowerCase();
  const lista = listarProveedores();
  if (!q) return lista;
  const campos = (p) => [
    p.name,
    p.code,
    p.giro,
    p.region,
    p.email,
    p.estado_proveedor,
    ...(puedeVerRutProveedor(usuario?.rol) ? [p.taxId] : [])
  ];
  return lista.filter((p) =>
    campos(p).some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(q)
    )
  );
}

function validarEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function validarProveedor(datos, { idExcluir } = {}) {
  const errors = {};
  const valor = (clave) => String(datos[clave] ?? '').trim();
  const nombre = valor('razon_social') || valor('name');
  if (!nombre) errors.razon_social = CAMPOS_REQUERIDOS.razon_social;
  if (!valor('rut') && !valor('taxId')) errors.rut = CAMPOS_REQUERIDOS.rut;
  else if (!validarRut(valor('rut') || valor('taxId')))
    errors.rut = 'El RUT no es válido (revisa formato y dígito verificador)';
  for (const clave of ['tipo_persona', 'giro', 'region', 'condicion_pago_dias']) {
    if (datos[clave] === undefined || String(datos[clave]).trim() === '')
      errors[clave] = CAMPOS_REQUERIDOS[clave];
  }
  if (
    datos.tipo_persona &&
    !['natural', 'jurídica', 'juridica'].includes(String(datos.tipo_persona).trim())
  ) {
    errors.tipo_persona = 'El tipo de persona debe ser natural o jurídica';
  }
  const cond = validarCondicionPago(datos.condicion_pago_dias, datos.acuerdo_plazo_mayor);
  if (!cond.valid) errors.condicion_pago_dias = cond.error;
  if (!validarEmail(datos.email)) errors.email = 'El correo electrónico no es válido';
  const rut = normalizarRut(valor('rut') || valor('taxId'));
  if (rut && !errors.rut) {
    const duplicado = listarProveedores().find(
      (p) => p.id !== idExcluir && p.entity_id !== idExcluir && normalizarRut(p.taxId) === rut
    );
    if (duplicado)
      errors.rut = `El RUT ya está registrado por ${duplicado.name} (${duplicado.code})`;
  }
  if (datos.banco || datos.numero_cuenta) {
    if (!valor('banco')) errors.banco = 'El banco es obligatorio si registra datos bancarios';
    else if (!esBancoValido(valor('banco')))
      errors.banco = 'Selecciona un banco del catálogo chileno disponible';
    if (!valor('numero_cuenta'))
      errors.numero_cuenta = 'El número de cuenta es obligatorio si registra datos bancarios';
  }
  if (valor('tipo_cuenta') && !esTipoCuentaValido(valor('tipo_cuenta'))) {
    errors.tipo_cuenta = 'Selecciona un tipo de cuenta del catálogo chileno disponible';
  } else if (esCuentaRut(valor('tipo_cuenta')) && normalizarBanco(valor('banco')) !== BANCO_ESTADO) {
    errors.banco = 'CuentaRUT solo está disponible en BancoEstado';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function payloadDesdeDatos(datos, previo = {}) {
  const ahora = hoyISO();
  const banco = normalizarBanco(datos.banco ?? previo.banco ?? '');
  const tipoCuenta = normalizarTipoCuenta(datos.tipo_cuenta ?? previo.tipo_cuenta ?? '');
  const cuenta = String(datos.numero_cuenta ?? previo.numero_cuenta ?? '').trim();
  const cambioCuenta =
    (banco !== (previo.banco || '') ||
      tipoCuenta !== (previo.tipo_cuenta || '') ||
      cuenta !== (previo.numero_cuenta || '')) &&
    (banco || cuenta);
  return {
    name: String(datos.razon_social ?? datos.name ?? previo.name ?? '').trim(),
    nombre_fantasia: String(
      datos.nombre_fantasia ?? previo.nombre_fantasia ?? ''
    ).trim(),
    code: String(datos.codigo ?? datos.code ?? previo.code ?? '').trim(),
    taxId: formatearRut(String(datos.rut ?? datos.taxId ?? previo.taxId ?? '').trim()),
    email: String(datos.email ?? previo.email ?? '').trim(),
    phone: String(datos.telefono ?? datos.phone ?? previo.phone ?? '').trim(),
    address: String(datos.direccion ?? datos.address ?? previo.address ?? '').trim(),
    category: String(datos.categoria ?? datos.category ?? previo.category ?? '').trim(),
    rubro: String(datos.rubro ?? previo.rubro ?? datos.categoria ?? previo.category ?? '').trim(),
    description: String(datos.giro ?? datos.description ?? previo.description ?? '').trim(),
    paymentTerms: `neto ${Number(datos.condicion_pago_dias ?? previo.condicion_pago_dias ?? 0)}`,
    tipo_persona: String(datos.tipo_persona ?? previo.tipo_persona ?? '').trim(),
    giro: String(datos.giro ?? previo.giro ?? '').trim(),
    region: String(datos.region ?? previo.region ?? '').trim(),
    comuna: String(datos.comuna ?? previo.comuna ?? '').trim(),
    tamano_empresa: String(datos.tamano_empresa ?? previo.tamano_empresa ?? '').trim(),
    estado_proveedor: String(
      datos.estado_proveedor ?? previo.estado_proveedor ?? 'potencial'
    ).trim(),
    estado:
      ETIQUETA_ESTADO[
        String(datos.estado_proveedor ?? previo.estado_proveedor ?? 'potencial').trim()
      ] || String(datos.estado ?? previo.estado ?? '').trim(),
    calificacion_promedio:
      Number(datos.calificacion_promedio ?? previo.calificacion_promedio ?? 0) || 0,
    condicion_pago_dias: Number(datos.condicion_pago_dias ?? previo.condicion_pago_dias ?? 0),
    acuerdo_plazo_mayor: String(
      datos.acuerdo_plazo_mayor ?? previo.acuerdo_plazo_mayor ?? ''
    ).trim(),
    banco,
    tipo_cuenta: tipoCuenta,
    numero_cuenta: cuenta,
    fecha_cambio_cuenta: cambioCuenta ? ahora : previo.fecha_cambio_cuenta || '',
    updatedAt: new Date().toISOString()
  };
}

function siguienteCodigo() {
  const numeros = listarProveedores()
    .map((p) => Number(String(p.code || '').replace(/\D/g, '')))
    .filter(Number.isFinite);
  const max = numeros.length > 0 ? Math.max(...numeros) : 0;
  return `PRV-${String(max + 1).padStart(3, '0')}`;
}

export function crearProveedor(datos, usuario) {
  exigirPermiso('gestionar_proveedores', usuario);
  const { valid, errors } = validarProveedor(datos);
  if (!valid) throw new Error(Object.values(errors)[0]);
  if ((datos.banco || datos.numero_cuenta) && !puede('editar_datos_bancarios', usuario)) {
    throw new Error('Solo el rol admin_ti puede registrar datos bancarios');
  }
  const entityId = generarId('prov');
  const ahora = new Date().toISOString();
  const payload = payloadDesdeDatos(datos, { estado_proveedor: 'potencial' });
  const proveedor = {
    id: entityId,
    entity_id: entityId,
    ...payload,
    code: payload.code || siguienteCodigo(),
    createdAt: ahora
  };
  const lista = loadEntities();
  lista.push(proveedor);
  saveEntities(lista);
  if (proveedor.banco || proveedor.numero_cuenta) registrarCambioBancario(proveedor, usuario);
  return proveedor;
}

export function actualizarProveedor(id, cambios, usuario) {
  exigirPermiso('gestionar_proveedores', usuario);
  const lista = loadEntities();
  const idx = lista.findIndex((p) => p.id === id || p.entity_id === id);
  if (idx === -1) throw new Error('Proveedor no encontrado');
  const previo = lista[idx];
  const fusionado = { ...previo, ...cambios };
  const { valid, errors } = validarProveedor(fusionado, { idExcluir: previo.id });
  if (!valid) throw new Error(Object.values(errors)[0]);
  const bancoCambio =
    String(fusionado.banco ?? '').trim() !== String(previo.banco ?? '').trim() ||
    String(fusionado.numero_cuenta ?? '').trim() !== String(previo.numero_cuenta ?? '').trim();
  if (bancoCambio && !puede('editar_datos_bancarios', usuario)) {
    throw new Error('Solo el rol admin_ti puede modificar los datos bancarios');
  }
  lista[idx] = { ...previo, ...payloadDesdeDatos(fusionado, previo) };
  saveEntities(lista);
  if (bancoCambio) registrarCambioBancario(lista[idx], usuario);
  return lista[idx];
}

export function actualizarDatosBancarios(id, datos, usuario) {
  exigirPermiso('editar_datos_bancarios', usuario);
  const lista = loadEntities();
  const idx = lista.findIndex((p) => p.id === id || p.entity_id === id);
  if (idx === -1) throw new Error('Proveedor no encontrado');
  const previo = lista[idx];
  const banco = normalizarBanco(datos.banco ?? previo.banco ?? '');
  const tipoCuenta = normalizarTipoCuenta(datos.tipo_cuenta ?? previo.tipo_cuenta ?? '');
  const numeroCuenta = String(datos.numero_cuenta ?? previo.numero_cuenta ?? '').trim();
  const fusionado = { ...previo, banco, tipo_cuenta: tipoCuenta, numero_cuenta: numeroCuenta };
  const { valid, errors } = validarProveedor(fusionado, { idExcluir: previo.id });
  if (!valid) throw new Error(Object.values(errors)[0]);
  const bancoCambio =
    banco !== normalizarBanco(previo.banco ?? '') ||
    tipoCuenta !== normalizarTipoCuenta(previo.tipo_cuenta ?? '') ||
    numeroCuenta !== String(previo.numero_cuenta ?? '').trim();
  lista[idx] = {
    ...previo,
    banco,
    tipo_cuenta: tipoCuenta,
    numero_cuenta: numeroCuenta,
    fecha_cambio_cuenta: bancoCambio ? hoyISO() : previo.fecha_cambio_cuenta || '',
    updatedAt: new Date().toISOString()
  };
  saveEntities(lista);
  if (bancoCambio) registrarCambioBancario(lista[idx], usuario);
  return lista[idx];
}

export function cambiarEstadoProveedor(id, nuevoEstado, usuario) {
  exigirPermiso('gestionar_proveedores', usuario);
  if (!ESTADOS_PROVEEDOR.includes(nuevoEstado)) throw new Error('Estado de proveedor inválido');
  const lista = loadEntities();
  const idx = lista.findIndex((p) => p.id === id || p.entity_id === id);
  if (idx === -1) throw new Error('Proveedor no encontrado');
  const actual = lista[idx].estado_proveedor || 'potencial';
  if (actual !== nuevoEstado && !(TRANSICIONES_PROVEEDOR[actual] || []).includes(nuevoEstado)) {
    throw new Error(`Transición de proveedor inválida de "${actual}" a "${nuevoEstado}"`);
  }
  lista[idx] = {
    ...lista[idx],
    estado_proveedor: nuevoEstado,
    estado: ETIQUETA_ESTADO[nuevoEstado],
    updatedAt: new Date().toISOString()
  };
  saveEntities(lista);
  return lista[idx];
}

export function desbloquearProveedor(id, usuario) {
  exigirPermiso('desbloquear_proveedor', usuario);
  const lista = loadEntities();
  const idx = lista.findIndex((p) => p.id === id || p.entity_id === id);
  if (idx === -1) throw new Error('Proveedor no encontrado');
  const anterior = lista[idx].estado_proveedor || 'potencial';
  if (anterior !== 'bloqueado') throw new Error('Solo se puede desbloquear un proveedor bloqueado');
  lista[idx] = {
    ...lista[idx],
    estado_proveedor: 'aprobado',
    estado: ETIQUETA_ESTADO.aprobado,
    updatedAt: new Date().toISOString()
  };
  saveEntities(lista);
  registrarEvento('proveedor', lista[idx].entity_id, 'desbloqueo', {
    usuario,
    anterior,
    nuevo: 'aprobado'
  });
  return lista[idx];
}

export function eliminarProveedor(id, usuario) {
  exigirPermiso('gestionar_proveedores', usuario);
  const proveedor = obtenerProveedor(id);
  if (!proveedor) throw new Error('Proveedor no encontrado');
  const tieneOrdenes = leer('ordenes').some((oc) => oc.proveedor_id === proveedor.entity_id);
  if (tieneOrdenes) {
    const error = new Error(
      'No se puede eliminar un proveedor con órdenes de compra. Puedes bloquearlo en su lugar.'
    );
    error.codigo = 'PROVEEDOR_CON_OC';
    throw error;
  }
  const lista = loadEntities().filter(
    (p) => p.id !== proveedor.id && p.entity_id !== proveedor.entity_id
  );
  saveEntities(lista);
  return lista;
}

export function proveedorAprobado(id) {
  const p = obtenerProveedor(id);
  return Boolean(p && p.estado_proveedor === 'aprobado');
}

/** Campos que nunca pueden copiarse en crudo desde el registro original. */
const CAMPOS_SENSIBLES = new Set([
  'rut',
  'taxId',
  'banco',
  'tipo_cuenta',
  'numero_cuenta',
  'fecha_cambio_cuenta',
  'rut_visible',
  'cuenta_visible',
  'rut_completo_visible',
  'datos_bancarios_visibles',
  'puede_editar_banco'
]);

export function vistaProveedor(proveedor, rol, contexto = 'general') {
  const puedeVerBanco = puedeVerDatosBancarios(rol);
  const puedeVerRut = puedeVerRutProveedor(rol, contexto);
  const rutVisible = proveedor?.taxId
    ? enmascararRutProveedor(proveedor.taxId, rol, contexto)
    : '';
  const cuentaVisible = proveedor?.numero_cuenta
    ? enmascararCuentaPorRol(proveedor.numero_cuenta, rol) || CUENTA_NO_DISPONIBLE
    : 'No registrado';

  // Se copian solo campos no sensibles: ningún dato bancario ni RUT crudo se
  // filtra por el spread antes de pasar por la matriz del rol activo.
  const vista = Object.fromEntries(
    Object.entries(proveedor ?? {}).filter(([clave]) => !CAMPOS_SENSIBLES.has(clave))
  );
  vista.rut_visible = rutVisible;
  vista.cuenta_visible = cuentaVisible;
  vista.rut_completo_visible = puedeVerRut;
  vista.datos_bancarios_visibles = puedeVerBanco;
  vista.puede_editar_banco = puedeEditarDatosBancarios(rol);

  if (puedeVerRut) vista.taxId = rutVisible;
  if (puedeVerBanco) {
    vista.banco = proveedor?.banco;
    vista.tipo_cuenta = proveedor?.tipo_cuenta;
    vista.numero_cuenta = proveedor?.numero_cuenta;
    vista.fecha_cambio_cuenta = proveedor?.fecha_cambio_cuenta;
  } else if (rol === 'comprador') {
    vista.numero_cuenta = cuentaVisible;
  }
  return vista;
}

export function cuentaCambiadaRecientemente(proveedor, hoy = hoyISO()) {
  if (!proveedor?.fecha_cambio_cuenta) return false;
  const [y, m, d] = proveedor.fecha_cambio_cuenta.split('-').map(Number);
  const cambio = new Date(Date.UTC(y, m - 1, d));
  const [hy, hm, hd] = hoy.split('-').map(Number);
  const ahora = new Date(Date.UTC(hy, hm - 1, hd));
  return (ahora - cambio) / 86400000 < 30;
}

export { ESTADOS_PROVEEDOR, TRANSICIONES_PROVEEDOR };
