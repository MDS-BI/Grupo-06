import { describe, expect, it } from 'vitest';
import {
  IVA,
  UMBRAL_COTIZACIONES,
  TOLERANCIA_CONCILIACION,
  calcularLinea,
  calcularTotales,
  calcularVencimiento,
  conciliarFactura,
  diasEntre,
  diasHasta,
  enmascararCuenta,
  enmascararRut,
  formatearRut,
  generarNumero,
  notaPlazo,
  normalizarRut,
  puedeTransicionar,
  redondearCLP,
  redondearPromedio,
  siguienteSecuencia,
  sumarDias,
  validarCondicionPago,
  validarRut
} from '../../../src/compras/reglas.js';

describe('reglas de compras', () => {
  it('expone los parámetros definitivos del negocio', () => {
    expect(IVA).toBe(0.19);
    expect(UMBRAL_COTIZACIONES).toBe(1000000);
    expect(TOLERANCIA_CONCILIACION).toBe(0.01);
  });

  describe('RUT', () => {
    it('normaliza y valida RUT con o sin formato', () => {
      expect(normalizarRut('12.345.678-5')).toBe('12345678-5');
      expect(validarRut('12345678-5')).toBe(true);
      expect(validarRut('12.345.678-5')).toBe(true);
      expect(validarRut('12345678-9')).toBe(false);
      expect(validarRut('abc')).toBe(false);
    });

    it('formatea RUT válidos y deja intactos los inválidos', () => {
      expect(formatearRut('12345678-5')).toBe('12.345.678-5');
      expect(formatearRut('invalido')).toBe('invalido');
    });

    it('enmascara RUT y cuenta según el rol', () => {
      expect(enmascararRut('12345678-5', 'comprador')).toBe('12.***.***-5');
      expect(enmascararRut('12345678-5', 'admin_ti')).toBe('12.345.678-5');
      expect(enmascararRut('invalido', 'bodega')).toBe('***');
      expect(enmascararCuenta('123456789', 'comprador')).toBe('****6789');
      expect(enmascararCuenta('123456789', 'admin_ti')).toBe('123456789');
      expect(enmascararCuenta('', 'admin_ti')).toBe('');
    });
  });

  describe('cálculo de líneas y totales', () => {
    it('calcula subtotal, descuento y neto de una línea', () => {
      expect(calcularLinea({ cantidad: 3, precio_unitario: 1000, descuento_pct: 10 })).toEqual({
        cantidad: 3,
        precio_unitario: 1000,
        descuento_pct: 10,
        subtotal: 3000,
        descuento: 300,
        neto: 2700
      });
    });

    it('acepta precio_estimado como alias y acota valores negativos', () => {
      expect(calcularLinea({ cantidad: 2, precio_estimado: 500 }).neto).toBe(1000);
      expect(calcularLinea({ cantidad: -2, precio_unitario: -10 }).neto).toBe(0);
      expect(
        calcularLinea({ cantidad: 1, precio_unitario: 100, descuento_pct: 150 }).descuento_pct
      ).toBe(100);
    });

    it('suma líneas y agrega IVA sobre el neto final', () => {
      const totales = calcularTotales([
        { cantidad: 2, precio_unitario: 1000, descuento_pct: 10 },
        { cantidad: 1, precio_unitario: 500 }
      ]);
      expect(totales).toEqual({
        subtotal: 2500,
        descuento: 200,
        neto: 2300,
        iva: 437,
        total: 2737
      });
    });

    it('redondea montos CLP y promedios', () => {
      expect(redondearCLP(10.6)).toBe(11);
      expect(redondearCLP('sin numero')).toBe(0);
      expect(redondearPromedio([4, 5, 4])).toBe(4.3);
      expect(redondearPromedio([])).toBe(0);
    });
  });

  describe('condiciones de pago y transiciones', () => {
    it('exige acuerdo para plazos mayores a 30 días', () => {
      expect(validarCondicionPago(30, '').valid).toBe(true);
      expect(validarCondicionPago(31, '').valid).toBe(false);
      expect(validarCondicionPago(31, 'Acuerdo firmado').valid).toBe(true);
      expect(validarCondicionPago(-1, '').valid).toBe(false);
      expect(validarCondicionPago(1.5, '').valid).toBe(false);
    });

    it('permite solo transiciones declaradas', () => {
      expect(puedeTransicionar('solicitud', 'borrador', 'enviada')).toBe(true);
      expect(puedeTransicionar('solicitud', 'enviada', 'aprobada')).toBe(true);
      expect(puedeTransicionar('solicitud', 'adjudicada', 'en_cotizacion')).toBe(true);
      expect(puedeTransicionar('solicitud', 'anulada', 'enviada')).toBe(false);
      expect(puedeTransicionar('solicitud', 'borrador', 'borrador')).toBe(true);
      expect(puedeTransicionar('desconocido', 'a', 'b')).toBe(false);
    });
  });

  describe('fechas', () => {
    it('suma y calcula diferencias de días', () => {
      expect(sumarDias('2026-11-03', 10)).toBe('2026-11-13');
      expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
      expect(sumarDias('', 5)).toBe('');
      expect(diasEntre('2026-11-03', '2026-11-13')).toBe(10);
      expect(diasEntre('2026-11-13', '2026-11-03')).toBe(-10);
      expect(diasHasta('2026-11-06', '2026-11-03')).toBe(3);
    });

    it('calcula vencimiento y nota de plazo por atraso', () => {
      expect(calcularVencimiento('2026-11-03', 30)).toBe('2026-12-03');
      expect(calcularVencimiento('2026-11-03', 0)).toBe('2026-11-03');
      expect(notaPlazo(0)).toBe(5);
      expect(notaPlazo(1)).toBe(4);
      expect(notaPlazo(3)).toBe(4);
      expect(notaPlazo(4)).toBe(3);
      expect(notaPlazo(7)).toBe(3);
      expect(notaPlazo(8)).toBe(2);
      expect(notaPlazo(14)).toBe(2);
      expect(notaPlazo(15)).toBe(1);
    });
  });

  describe('conciliación de facturas', () => {
    it('concilia dentro de la tolerancia de 1%', () => {
      const dentro = conciliarFactura({ netoFactura: 100000, valorRecibido: 100000 });
      expect(dentro.estado).toBe('conciliada');
      expect(dentro.toleranciaMonto).toBe(1000);
      expect(dentro.diferencia).toBe(0);

      const borde = conciliarFactura({ netoFactura: 100000, valorRecibido: 100500 });
      expect(borde.estado).toBe('conciliada');
    });

    it('marca discrepancia fuera de tolerancia y descuenta documentos previos', () => {
      const fuera = conciliarFactura({ netoFactura: 100000, valorRecibido: 101500 });
      expect(fuera.estado).toBe('con_discrepancia');
      expect(fuera.diferencia).toBe(-1500);

      const conPrevios = conciliarFactura({
        netoFactura: 100000,
        valorRecibido: 100000,
        facturasPreviasNeto: 50000,
        notasCreditoNeto: 10000,
        devolucionesNeto: 5000
      });
      expect(conPrevios.pendiente).toBe(35000);
      expect(conPrevios.diferencia).toBe(65000);
      expect(conPrevios.estado).toBe('con_discrepancia');
    });
  });

  describe('numeración', () => {
    it('genera números con correlativo de cuatro dígitos', () => {
      expect(generarNumero('SC', 2026, 1)).toBe('SC-2026-0001');
      expect(generarNumero('OC', 2026, 42)).toBe('OC-2026-0042');
    });

    it('calcula la siguiente secuencia por prefijo y año', () => {
      expect(siguienteSecuencia(['SC-2026-0001', 'SC-2026-0007', 'SC-2025-0009'], 'SC', 2026)).toBe(
        8
      );
      expect(siguienteSecuencia([], 'SC', 2026)).toBe(1);
      expect(siguienteSecuencia(['SC-2026-0001'], 'OC', 2026)).toBe(1);
    });
  });
});
