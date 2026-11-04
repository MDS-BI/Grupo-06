// ============================================================================
// Configuración del Módulo — edita `userConfig` abajo para adaptar este módulo
// base a un módulo ERP específico (p. ej., Ventas). Ningún otro archivo necesita cambios.
// ============================================================================

// Establece en null para ejecutar con los valores predeterminados integrados,
// o proporciona un objeto como:
// {
//   moduleName: 'Ventas',
//   labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
//   customFields: [
//     { target: 'entity', key: 'zona', label: 'Zona', type: 'select', options: ['Norte', 'Sur'] },
//     { target: 'document', key: 'metodoEnvio', label: 'Método de envío', type: 'select', options: ['estándar', 'exprés'] }
//   ],
//   statusLifecycle: {
//     statuses: ['cotización', 'pedido', 'facturado'],
//     transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
//   },
//   theme: { accentColor: '#0f62fe' }
// }
export const userConfig = null;

// Parámetros definitivos del módulo de Adquisiciones y Compras.
export const COMPRAS_PARAMETROS = Object.freeze({
  iva: 0.19,
  umbralCotizaciones: 1000000,
  toleranciaConciliacion: 0.01
});

// Configuración opcional para reutilizar el template base con Compras:
// Proveedor como Entidad y Orden de Compra como Documento.
export const COMPRAS_CONFIG = Object.freeze({
  moduleName: 'Adquisiciones y Compras',
  labels: Object.freeze({
    entity: 'Proveedor',
    entities: 'Proveedores',
    document: 'Orden de Compra',
    documents: 'Órdenes de Compra'
  }),
  customFields: Object.freeze([
    { target: 'entity', key: 'tipo_persona', label: 'Tipo de persona', type: 'select', options: ['natural', 'jurídica'], required: true },
    { target: 'entity', key: 'giro', label: 'Giro', type: 'text', required: true },
    { target: 'entity', key: 'region', label: 'Región', type: 'text', required: true },
    { target: 'entity', key: 'comuna', label: 'Comuna', type: 'text' },
    { target: 'entity', key: 'tamano_empresa', label: 'Tamaño de empresa', type: 'select', options: ['micro', 'pequeña', 'mediana', 'grande'] },
    { target: 'entity', key: 'estado_proveedor', label: 'Estado del proveedor', type: 'select', options: ['potencial', 'aprobado', 'bloqueado'], required: true },
    { target: 'entity', key: 'condicion_pago_dias', label: 'Condición de pago (días)', type: 'number', required: true },
    { target: 'entity', key: 'acuerdo_plazo_mayor', label: 'Acuerdo de plazo mayor', type: 'text' },
    { target: 'entity', key: 'banco', label: 'Banco', type: 'text' },
    { target: 'entity', key: 'numero_cuenta', label: 'Número de cuenta', type: 'text' },
    { target: 'entity', key: 'fecha_cambio_cuenta', label: 'Fecha de cambio de cuenta', type: 'date' },
    { target: 'document', key: 'solicitud_id', label: 'Solicitud de compra', type: 'text' },
    { target: 'document', key: 'cotizacion_id', label: 'Cotización', type: 'text' },
    { target: 'document', key: 'proveedor_id', label: 'Proveedor', type: 'text', required: true },
    { target: 'document', key: 'fecha_emision', label: 'Fecha de emisión', type: 'date' },
    { target: 'document', key: 'fecha_entrega_prometida', label: 'Fecha de entrega prometida', type: 'date' },
    { target: 'document', key: 'condicion_pago_dias', label: 'Condición de pago (días)', type: 'number' },
    { target: 'document', key: 'moneda', label: 'Moneda', type: 'text' },
    { target: 'document', key: 'emitida_por', label: 'Emitida por', type: 'text' }
  ]),
  statusLifecycle: Object.freeze({
    statuses: Object.freeze(['emitida', 'recibida_parcial', 'recibida_total', 'cerrada', 'anulada']),
    transitions: Object.freeze({
      emitida: Object.freeze(['recibida_parcial', 'recibida_total', 'anulada']),
      recibida_parcial: Object.freeze(['recibida_total']),
      recibida_total: Object.freeze(['cerrada']),
      cerrada: Object.freeze([]),
      anulada: Object.freeze([])
    })
  }),
  theme: Object.freeze({ accentColor: '#2563eb' })
});

// ---------------------------------------------------------------------------
// Cargador central — no deberías necesitar modificar nada debajo de esta línea.
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG = Object.freeze({
  moduleName: 'Módulo Base ERP',
  labels: Object.freeze({
    entity: 'Entidad',
    entities: 'Entidades',
    document: 'Documento',
    documents: 'Documentos'
  }),
  customFields: Object.freeze([]),
  statusLifecycle: null,
  theme: Object.freeze({ accentColor: '#2563eb' })
});

export const FIELD_TYPES = ['text', 'number', 'date', 'select'];

export const BASE_FIELDS = Object.freeze({
  entity: Object.freeze(['id', 'entity_id', 'name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'creditLimit', 'paymentTerms', 'createdAt', 'updatedAt']),
  document: Object.freeze(['id', 'entity_id', 'series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'paymentTerms', 'notes', 'status', 'createdAt', 'updatedAt'])
});

function isNonEmptyString(v){ return typeof v === 'string' && v.trim().length > 0; }

function validateCustomFields(raw, errors){
  const seen = { entity: new Set(), document: new Set() };
  if(!Array.isArray(raw)) { errors.push('customFields debe ser un arreglo'); return []; }
  const clean = [];
  raw.forEach((f, i) => {
    const where = `customFields[${i}]`;
    if(!f || typeof f !== 'object'){ errors.push(`${where} debe ser un objeto`); return; }
    if(f.target !== 'entity' && f.target !== 'document'){ errors.push(`${where}.target debe ser "entity" o "document"`); return; }
    if(!isNonEmptyString(f.key)){ errors.push(`${where}.key debe ser una cadena no vacía`); return; }
    if(BASE_FIELDS[f.target].includes(f.key)){ errors.push(`${where}.key "${f.key}" choca con un campo base de ${f.target}`); return; }
    if(seen[f.target].has(f.key)){ errors.push(`${where}.key "${f.key}" está declarada más de una vez`); return; }
    if(!FIELD_TYPES.includes(f.type)){ errors.push(`${where}.type debe ser uno de: ${FIELD_TYPES.join(', ')}`); return; }
    if(f.type === 'select' && !(Array.isArray(f.options) && f.options.length > 0)){ errors.push(`${where}.options debe ser un arreglo no vacío para campos de selección`); return; }
    seen[f.target].add(f.key);
    clean.push({ target: f.target, key: f.key, label: isNonEmptyString(f.label) ? f.label : f.key, type: f.type, required: Boolean(f.required), options: Array.isArray(f.options) ? [...f.options] : undefined });
  });
  return clean;
}

function validateLifecycle(raw, errors){
  if(raw === null || raw === undefined) return null;
  if(typeof raw !== 'object' || !Array.isArray(raw.statuses) || raw.statuses.length === 0 || !raw.statuses.every(isNonEmptyString)){
    errors.push('statusLifecycle.statuses debe ser un arreglo no vacío de nombres de estado');
    return null;
  }
  const statuses = new Set(raw.statuses);
  const transitions = {};
  if(raw.transitions !== undefined && (typeof raw.transitions !== 'object' || raw.transitions === null)){
    errors.push('statusLifecycle.transitions debe ser un objeto que mapee estado -> arreglo de estados siguientes');
    return null;
  }
  const source = raw.transitions || {};
  for(const [from, toList] of Object.entries(source)){
    if(!statuses.has(from)){ errors.push(`statusLifecycle.transitions referencia el estado desconocido "${from}"`); return null; }
    if(!Array.isArray(toList) || !toList.every((s) => statuses.has(s))){ errors.push(`statusLifecycle.transitions["${from}"] debe listar estados conocidos`); return null; }
    transitions[from] = [...toList];
  }
  return { statuses: [...raw.statuses], transitions };
}

function validateTheme(raw, errors){
  if(raw === null || raw === undefined) return structuredClone(DEFAULT_CONFIG.theme);
  if(typeof raw !== 'object'){
    errors.push('theme debe ser un objeto');
    return structuredClone(DEFAULT_CONFIG.theme);
  }
  const out = { accentColor: DEFAULT_CONFIG.theme.accentColor };
  if(raw.accentColor !== undefined && raw.accentColor !== null){
    const value = String(raw.accentColor).trim();
    if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)){
      errors.push('theme.accentColor debe ser un color hexadecimal como #rrggbb');
    } else {
      out.accentColor = value;
    }
  }
  return out;
}

export function normalizeConfig(raw){
  if(raw === null || raw === undefined){
    return { config: structuredClone(DEFAULT_CONFIG), errors: [] };
  }
  if(typeof raw !== 'object'){
    return { config: structuredClone(DEFAULT_CONFIG), errors: ['La configuración del módulo debe ser un objeto'] };
  }
  const errors = [];
  const cfg = structuredClone(DEFAULT_CONFIG);
  if(raw.moduleName !== undefined){
    if(!isNonEmptyString(raw.moduleName)) errors.push('moduleName debe ser una cadena no vacía');
    else cfg.moduleName = raw.moduleName.trim();
  }
  if(raw.labels !== undefined){
    if(typeof raw.labels !== 'object' || raw.labels === null) errors.push('labels debe ser un objeto');
    else {
      for(const key of ['entity', 'entities', 'document', 'documents']){
        if(raw.labels[key] === undefined) continue;
        if(!isNonEmptyString(raw.labels[key])){ errors.push(`labels.${key} debe ser una cadena no vacía`); continue; }
        cfg.labels[key] = raw.labels[key].trim();
      }
    }
  }
  if(raw.customFields !== undefined && raw.customFields !== null){
    cfg.customFields = validateCustomFields(raw.customFields, errors);
  }
  if(raw.statusLifecycle !== undefined){
    const lc = validateLifecycle(raw.statusLifecycle, errors);
    if(lc) cfg.statusLifecycle = lc;
  }
  if(raw.theme !== undefined){
    cfg.theme = validateTheme(raw.theme, errors);
  }
  return { config: cfg, errors };
}

let activeConfig = structuredClone(DEFAULT_CONFIG);

export function setActiveConfig(config){
  activeConfig = normalizeConfig(config).config;
}

export function getConfig(){
  return activeConfig;
}

export function labelFor(kind){
  return activeConfig.labels[kind] || DEFAULT_CONFIG.labels[kind];
}

export async function loadModuleConfig(){
  const { config, errors } = normalizeConfig(userConfig);
  return { config, errors };
}
