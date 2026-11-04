import { describe, expect, it } from 'vitest';
import { escaparCSV, generarCSV } from '../../../src/compras/exportacion.js';

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
});
