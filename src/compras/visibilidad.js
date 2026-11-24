export const VISIBILIDAD = Object.freeze({
  solicitudes: Object.freeze({
    solicitante: 'opera',
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'opera'
  }),
  cotizaciones: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  }),
  ordenes: Object.freeze({
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: 'lectura',
    admin_ti: 'lectura'
  }),
  recepciones: Object.freeze({
    solicitante: 'lectura',
    comprador: 'lectura',
    jefe_compras: 'lectura',
    bodega: 'opera',
    admin_ti: 'lectura'
  }),
  facturas: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  }),
  devoluciones: Object.freeze({
    solicitante: null,
    comprador: 'lectura',
    jefe_compras: 'opera',
    bodega: 'opera',
    admin_ti: 'lectura'
  }),
  proveedores: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  }),
  catalogo: Object.freeze({
    solicitante: 'lectura',
    comprador: 'opera',
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'lectura'
  }),
  evaluaciones: Object.freeze({
    solicitante: null,
    comprador: 'opera',
    jefe_compras: 'opera',
    bodega: null,
    admin_ti: 'lectura'
  }),
  trazabilidad: Object.freeze({
    solicitante: null,
    comprador: null,
    jefe_compras: 'lectura',
    bodega: null,
    admin_ti: 'opera'
  })
});

export const GRUPOS = Object.freeze({
  Panel: Object.freeze(['panel']),
  Adquisiciones: Object.freeze(['proveedores', 'catalogo', 'evaluaciones']),
  Compras: Object.freeze([
    'solicitudes',
    'cotizaciones',
    'ordenes',
    'recepciones',
    'facturas',
    'devoluciones'
  ])
});

export function nivelVista(vista, usuario) {
  if (vista === 'panel') return 'opera';
  const fila = VISIBILIDAD[vista];
  if (!fila) return null;
  return fila[usuario?.rol] ?? null;
}

export function vistasVisibles(usuario) {
  const operativas = Object.keys(VISIBILIDAD).filter((vista) => nivelVista(vista, usuario));
  return ['panel', ...operativas];
}
