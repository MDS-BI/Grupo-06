import { leer, guardar, generarId, exigirPermiso, getUsuarioActivo } from './almacenamiento.js';
import { DIAS_CATALOGO_DESACTUALIZADO, diasEntre, hoyISO } from './reglas.js';
import { obtenerProveedor } from './proveedores.js';

export function listarCatalogo({ proveedor_id, incluirInactivos = true } = {}) {
  return leer('catalogo')
    .filter((c) => !proveedor_id || c.proveedor_id === proveedor_id)
    .filter((c) => incluirInactivos || c.activo !== false);
}

export function obtenerEntradaCatalogo(id) {
  return leer('catalogo').find((c) => c.id === id);
}

export function esDesactualizado(entrada, hoy = hoyISO()) {
  if (!entrada?.fecha_actualizacion) return true;
  return diasEntre(entrada.fecha_actualizacion, hoy) > DIAS_CATALOGO_DESACTUALIZADO;
}

export function catalogoEnriquecido(entrada, hoy = hoyISO()) {
  const producto = leer('productos').find((p) => p.id === entrada.producto_id);
  const proveedor = obtenerProveedor(entrada.proveedor_id);
  return {
    ...entrada,
    producto,
    proveedor,
    desactualizado: esDesactualizado(entrada, hoy)
  };
}

export function buscarCatalogo(termino, hoy = hoyISO()) {
  const q = String(termino ?? '')
    .trim()
    .toLowerCase();
  const lista = listarCatalogo().map((c) => catalogoEnriquecido(c, hoy));
  if (!q) return lista;
  return lista.filter((c) =>
    [c.producto?.nombre, c.producto?.codigo, c.proveedor?.name, c.proveedor?.code].some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(q)
    )
  );
}

export function precioReferenciaVigente(productoId, hoy = hoyISO()) {
  const vigentes = listarCatalogo({ incluirInactivos: false })
    .filter((c) => c.producto_id === productoId)
    .filter((c) => !esDesactualizado(c, hoy))
    .map((c) => Number(c.precio_referencia))
    .filter(Number.isFinite);
  if (vigentes.length === 0) return null;
  return Math.min(...vigentes);
}

export function agregarProductoCatalogo(datos, usuario = getUsuarioActivo()) {
  exigirPermiso('gestionar_catalogo', usuario);
  const proveedor = obtenerProveedor(datos.proveedor_id);
  if (!proveedor) throw new Error('El proveedor no existe');
  const producto = leer('productos').find((p) => p.id === datos.producto_id);
  if (!producto || producto.activo === false)
    throw new Error('El producto no existe o está inactivo');
  const precio = Number(datos.precio_referencia);
  const plazo = Number(datos.plazo_entrega_dias);
  if (!Number.isFinite(precio) || precio < 0)
    throw new Error('El precio de referencia debe ser un número no negativo');
  if (!Number.isInteger(plazo) || plazo < 0)
    throw new Error('El plazo de entrega debe ser un entero no negativo');
  const duplicado = leer('catalogo').find(
    (c) => c.proveedor_id === datos.proveedor_id && c.producto_id === datos.producto_id
  );
  if (duplicado) throw new Error('Ya existe una referencia para este proveedor y producto');
  const entrada = {
    id: generarId('cat'),
    proveedor_id: datos.proveedor_id,
    producto_id: datos.producto_id,
    precio_referencia: precio,
    plazo_entrega_dias: plazo,
    fecha_actualizacion: hoyISO(),
    activo: true,
    createdAt: new Date().toISOString()
  };
  const lista = leer('catalogo');
  lista.push(entrada);
  guardar('catalogo', lista);
  return entrada;
}

export function actualizarProductoCatalogo(id, cambios, usuario = getUsuarioActivo()) {
  exigirPermiso('gestionar_catalogo', usuario);
  const lista = leer('catalogo');
  const idx = lista.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Referencia de catálogo no encontrada');
  const previo = lista[idx];
  const precio =
    cambios.precio_referencia === undefined
      ? previo.precio_referencia
      : Number(cambios.precio_referencia);
  const plazo =
    cambios.plazo_entrega_dias === undefined
      ? previo.plazo_entrega_dias
      : Number(cambios.plazo_entrega_dias);
  if (!Number.isFinite(precio) || precio < 0)
    throw new Error('El precio de referencia debe ser un número no negativo');
  if (!Number.isInteger(plazo) || plazo < 0)
    throw new Error('El plazo de entrega debe ser un entero no negativo');
  lista[idx] = {
    ...previo,
    precio_referencia: precio,
    plazo_entrega_dias: plazo,
    activo: cambios.activo === undefined ? previo.activo : Boolean(cambios.activo),
    fecha_actualizacion:
      precio !== previo.precio_referencia ? hoyISO() : previo.fecha_actualizacion,
    updatedAt: new Date().toISOString()
  };
  guardar('catalogo', lista);
  return lista[idx];
}

export function desactivarProductoCatalogo(id, usuario = getUsuarioActivo()) {
  return actualizarProductoCatalogo(id, { activo: false }, usuario);
}

export function productosDisponiblesParaNuevasLineas(proveedorId) {
  return listarCatalogo({ proveedor_id: proveedorId, incluirInactivos: false })
    .filter((c) => {
      const producto = leer('productos').find((p) => p.id === c.producto_id);
      return producto && producto.activo !== false;
    })
    .map((c) => ({ ...c, producto: leer('productos').find((p) => p.id === c.producto_id) }));
}
