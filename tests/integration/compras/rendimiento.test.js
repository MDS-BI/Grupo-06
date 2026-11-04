import { beforeEach, describe, expect, it } from 'vitest';
import { guardar, leer } from '../../../src/compras/almacenamiento.js';
import { esProveedor, listarProveedores } from '../../../src/compras/proveedores.js';
import {
  crearSolicitud,
  enviarSolicitud,
  listarSolicitudes
} from '../../../src/compras/solicitudes.js';
import { listarCotizaciones } from '../../../src/compras/cotizaciones.js';
import { listarOrdenes } from '../../../src/compras/ordenes-compra.js';
import { listarRecepciones } from '../../../src/compras/recepciones.js';
import { listarFacturas } from '../../../src/compras/facturas.js';
import { listarDevoluciones } from '../../../src/compras/devoluciones.js';
import { listarCatalogo } from '../../../src/compras/catalogo.js';
import { listarEvaluaciones } from '../../../src/compras/evaluaciones.js';
import { exportarSolicitudes } from '../../../src/compras/exportacion.js';
import { loadEntities, saveEntities } from '../../../src/storage.js';
import { cargarDatos, USUARIOS } from './helpers.js';

const COLECCIONES = [
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
];

function replicar(nombre, cantidad = 500) {
  const base = leer(nombre);
  if (base.length === 0) return;
  guardar(
    nombre,
    Array.from({ length: cantidad }, (_, i) => {
      if (i < base.length) return base[i];
      const original = base[i % base.length];
      const id = `${nombre}-perf-${i}`;
      return { ...original, id, ...('entity_id' in original ? { entity_id: id } : {}) };
    })
  );
}

function prepararVolumen() {
  for (const nombre of COLECCIONES) replicar(nombre);
  const proveedores = loadEntities().filter(esProveedor);
  saveEntities(
    Array.from({ length: 500 }, (_, i) => {
      if (i < proveedores.length) return proveedores[i];
      const original = proveedores[i % proveedores.length];
      const id = `prov-perf-${i}`;
      return {
        ...original,
        id,
        entity_id: id,
        code: `PRV-P${i}`,
        name: `Proveedor de prueba ${i}`
      };
    })
  );
}

describe('rendimiento de compras', () => {
  beforeEach(() => {
    cargarDatos();
    prepararVolumen();
  });

  it('responde listas con 500 registros por colección', () => {
    const inicio = performance.now();
    expect(listarProveedores()).toHaveLength(500);
    expect(listarSolicitudes(USUARIOS.jefe)).toHaveLength(500);
    expect(listarCotizaciones()).toHaveLength(500);
    expect(listarOrdenes()).toHaveLength(500);
    expect(listarRecepciones()).toHaveLength(500);
    expect(listarFacturas()).toHaveLength(500);
    expect(listarDevoluciones()).toHaveLength(500);
    expect(listarCatalogo()).toHaveLength(500);
    expect(listarEvaluaciones()).toHaveLength(500);
    expect(performance.now() - inicio).toBeLessThan(2000);
  });

  it('crea y envía una solicitud de 3 productos en menos de 2 minutos', () => {
    const inicio = performance.now();
    const solicitud = crearSolicitud(
      {
        justificacion: 'Compra de tres productos',
        fecha_requerida: '2026-12-01',
        centro_costo_id: 'cc-001',
        fecha_creacion: '2026-11-01',
        lineas: [
          { producto_id: 'prod-001', cantidad: 1, precio_estimado: 100000 },
          { producto_id: 'prod-002', cantidad: 1, precio_estimado: 100000 },
          { producto_id: 'prod-003', cantidad: 1, precio_estimado: 100000 }
        ]
      },
      USUARIOS.solicitante
    );
    enviarSolicitud(solicitud.id, USUARIOS.solicitante);
    expect(performance.now() - inicio).toBeLessThan(120000);
  });

  it('exporta 500 solicitudes a CSV en menos de 1 segundo', () => {
    const inicio = performance.now();
    const csv = exportarSolicitudes(USUARIOS.jefe, { descargar: false });
    expect(csv.split('\r\n').length).toBeGreaterThan(500);
    expect(performance.now() - inicio).toBeLessThan(1000);
  });
});
