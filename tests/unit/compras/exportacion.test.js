import { describe, expect, it } from 'vitest';
import {
  escaparCSV,
  exportarProveedores,
  generarCSV
} from '../../../src/compras/exportacion.js';

const PROVEEDOR = {
  code: 'P-1',
  name: 'Proveedor Prueba',
  taxId: '9.876.543-3',
  numero_cuenta: '555444333',
  banco: 'Banco Prueba',
  tipo_cuenta: 'corriente',
  tipo_persona: 'jurídica',
  estado_proveedor: 'aprobado',
  condicion_pago_dias: 30
};

describe('exportación CSV', () => {
  it('protege fórmulas y conserva números negativos', () => {
    expect(escaparCSV('=SUM(A1:A3)')).toBe("'=SUM(A1:A3)");
    expect(escaparCSV('+1+1')).toBe("'+1+1");
    expect(escaparCSV('@hola')).toBe("'@hola");
    expect(escaparCSV('-5')).toBe('-5');
    expect(escaparCSV('-5.25')).toBe('-5.25');
  });

  it('escapa separadores, comillas y saltos de línea', () => {
    expect(escaparCSV('a;b')).toBe('"a;b"');
    expect(escaparCSV('a,b')).toBe('"a,b"');
    expect(escaparCSV('dice "hola"')).toBe('"dice ""hola"""');
    expect(escaparCSV('linea1\nlinea2')).toBe('"linea1\nlinea2"');
    expect(escaparCSV(null)).toBe('');
  });

  it('conserva tildes y eñes con BOM UTF-8 y separador punto y coma', () => {
    const csv = generarCSV(
      [
        { key: 'nombre', header: 'Descripción' },
        { key: 'monto', header: 'Monto' }
      ],
      [{ nombre: 'Artículo dañado · ñandú', monto: 1500 }]
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Descripción;Monto\r\n');
    expect(csv).toContain('Artículo dañado · ñandú;1500\r\n');
  });

  it('genera CSV con BOM, cabecera, separador punto y coma y CRLF', () => {
    const csv = generarCSV(
      [
        { key: 'nombre', header: 'Nombre' },
        { key: 'monto', header: 'Monto' },
        { header: 'Calculado', valor: (fila) => fila.monto * 2 }
      ],
      [{ nombre: 'Uno; dos', monto: 100 }]
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Nombre;Monto;Calculado\r\n');
    expect(csv).toContain('"Uno; dos";100;200\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('aplica la matriz de visibilidad al RUT y la cuenta exportados', () => {
    const exportar = (rol) =>
      exportarProveedores({
        filas: [PROVEEDOR],
        descargar: false,
        usuario: { rol }
      });

    expect(exportar('comprador')).toContain('P-1;Proveedor Prueba;9.876.543-3;****4333;');
    expect(exportar('jefe_compras')).toContain(
      'P-1;Proveedor Prueba;9.876.543-3;555444333;'
    );
    expect(exportar('admin_ti')).toContain('P-1;Proveedor Prueba;9.876.543-3;555444333;');
    expect(exportar('solicitante')).toContain(
      'P-1;Proveedor Prueba;••••••••-•;No disponible;'
    );
    expect(exportar('bodega')).toContain('P-1;Proveedor Prueba;••••••••-•;No disponible;');
  });

  it('no permite filtrar por RUT tributario desde un rol sin acceso', () => {
    const csv = exportarProveedores({
      filas: [PROVEEDOR],
      filtro: '9.876.543-3',
      descargar: false,
      usuario: { rol: 'solicitante' }
    });
    expect(csv).not.toContain('Proveedor Prueba');
    expect(csv).not.toContain('9.876.543-3');
  });

  it('exporta No registrado cuando el proveedor no tiene cuenta', () => {
    const csv = exportarProveedores({
      filas: [{ ...PROVEEDOR, numero_cuenta: '' }],
      descargar: false,
      usuario: { rol: 'comprador' }
    });
    expect(csv).toContain('9.876.543-3;No registrado;');
  });
});
