# Inicio Rápido: Módulo Adquisiciones y Compras

**Funcionalidad**: `002-modulo-adquisiciones-compras`  
**Propósito**: verificar de extremo a extremo que el módulo funciona con los datos semilla, sin repetir la especificación ni el modelo de datos.  
**Referencias**: [spec.md](spec.md) (historias, FR y SC), [plan.md](plan.md), [data-model.md](data-model.md), [research.md](research.md) y [contratos](contracts/).

## Requisitos previos

- Node.js y npm compatibles con las versiones de Vite y Vitest declaradas en `package.json`.
- Un navegador de escritorio moderno con `localStorage` disponible.
- No se necesita backend, base de datos, cuenta de usuario ni conexión a internet después de instalar dependencias.

## Configuración

1. Desde la raíz del repositorio, instale las dependencias:

   ```bash
   npm install
   ```

2. Inicie el servidor de desarrollo:

   ```bash
   npm run dev
   ```

3. Abra la URL local que muestra Vite (por defecto `http://localhost:5173`).

La primera visita carga automáticamente `src/compras/semilla.json`: 6 usuarios, 4 centros de costo, 20 productos, 8 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación, 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Todos los datos son ficticios y las fechas se ajustan al día actual.

Si quiere volver al estado inicial, limpie las claves `erp_compras:*` y `erp_base_module:entities` desde las herramientas de desarrollo del navegador y recargue. Con el servidor de Vite abierto también puede ejecutar en la consola:

```js
await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras());
```

Después recargue la página para que se vuelva a cargar la semilla.

## Comandos de verificación

| Comando                | Resultado esperado                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Servidor Vite activo; la interfaz muestra solo el módulo Adquisiciones y Compras.                               |
| `npx vitest run`       | 144 pruebas aprobadas y 56 omitidas (las omitidas pertenecen al template base).                                 |
| `npm run lint`         | 0 errores y 0 advertencias.                                                                                      |
| `npm run build`        | Build de producción sin errores.                                                                                |
| `npm run preview`      | El build se sirve en `http://localhost:4173` con el mismo comportamiento.                                       |
| `npm run format:check` | Sin diferencias en el alcance de `.prettierignore` (núcleo base); el resto de `src/**` y `tests/**` está excluido. |

## Escenarios de validación

### 1. Arranque, navegación y rol activo (FR-018, SC-002)

1. Confirme que la barra superior muestra la marca **Adquisiciones y Compras** y el selector **Rol Activo**, y que la barra lateral solo tiene la sección **Compras**.
2. Compruebe las diez pestañas: Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones.
3. En el Panel, verifique los pendientes por rol, las alertas de vencimiento y los indicadores del período.
4. Cambie el **Rol Activo** de `solicitante` a `jefe_compras` y luego a `bodega`.

**Resultado esperado**: el contenido se actualiza sin recargar, la sesión activa muestra el rol elegido y los pendientes y botones cambian según los permisos del rol.

### 2. Proveedores y datos sensibles (US1, FR-001 a FR-004, FR-025, SC-009)

1. Abra **Proveedores** y busque el proveedor persona natural de la semilla (RUT `9.876.543-3`, cuenta `555444333`).
2. Con rol `comprador` o `bodega`, confirme que el RUT aparece como `98.***.***-3` y la cuenta como `****4333`, y que los campos bancarios están deshabilitados.
3. Cambie a `jefe_compras`: RUT y cuenta deben verse completos, sin habilitar la edición bancaria.
4. Cambie a `admin_ti`: además debe poder editar banco y cuenta. Modifique la cuenta, guarde y confirme que se actualizó `fecha_cambio_cuenta`; el cambio queda registrado en `erp_compras:trazabilidad` con el valor enmascarado.
5. Busque un proveedor sin cuenta registrada y confirme el texto **No registrado**.

**Resultado esperado**: en roles sin permiso ni la tabla, ni el formulario, ni el CSV contienen el valor completo. El cambio bancario actualiza `fecha_cambio_cuenta` y deja un evento de trazabilidad con el valor enmascarado.

### 3. Ciclo completo de compra (US2, US6, US3, US4, US7; SC-002)

Con los datos semilla ya hay documentos en todos los estados. Para repetir el ciclo desde cero:

1. Como `solicitante`, cree una solicitud con al menos tres líneas, envíela y verifique el correlativo `SC-AAAA-NNNN`.
2. Como `jefe_compras`, apruébela; intente aprobar una solicitud propia y compruebe que se bloquea (FR-006).
3. Como `comprador`, registre tres cotizaciones para una solicitud sobre el umbral, descarte una con motivo y seleccione otra (FR-008 y FR-009).
4. Emita la orden de compra desde la cotización seleccionada: líneas y precios se copian, el neto, el IVA de 19 % y el total se calculan en CLP enteros y la solicitud pasa a `adjudicada`.
5. Como `bodega`, registre una recepción parcial y una unidad dañada con motivo `danado`; intente recibir más de lo pendiente y compruebe el bloqueo (FR-013 y FR-026).
6. Como `comprador`, registre la factura y verifique que queda `conciliada` cuando la diferencia está dentro de la tolerancia del 1 %.
7. Use el botón de cadena documental en cualquier documento para recorrer solicitud → cotización → OC → recepción → factura y revisar el historial (FR-028).

**Resultado esperado**: el ciclo se completa en menos de cinco minutos, con estados congruentes y eventos de auditoría en cada cambio.

### 4. Panel, alertas y pago dentro de plazo (US5, FR-017, SC-005)

1. Vuelva a **Panel** con los roles `jefe_compras` y `admin_ti`.
2. Revise las facturas no aprobadas con vencimiento a cinco días o menos y los accesos directos a sus documentos.
3. Como `jefe_compras`, apruebe para pago solo una factura `conciliada`; una factura `con_discrepancia` no debe pasar.

**Resultado esperado**: las alertas coinciden con los vencimientos de la semilla y los botones del panel respetan el rol activo.

### 5. Catálogo, evaluaciones y devoluciones (US8, US9, US11)

1. En **Catálogo**, identifique un precio con más de 90 días sin actualizar y compruébelo como desactualizado; al crear una solicitud se sugiere el menor precio vigente.
2. En **Evaluaciones**, confirme que la nota de plazo se calcula desde las fechas de recepción y no se ingresa manualmente.
3. En **Devoluciones**, registre una devolución con motivo `defectuoso` sobre una recepción aceptada y, cuando corresponda, una nota de crédito contra una factura existente.

**Resultado esperado**: la cantidad devuelta deja de contar como recibida y facturada, la factura queda saldada cuando el saldo llega a cero y la OC se cierra sin perder el historial.

### 6. Exportación CSV (US10, FR-024, SC-008, SC-010)

1. En **Proveedores**, aplique un filtro y pulse **Exportar CSV**.
2. Abra el archivo en una planilla de cálculo en español.
3. Repita la exportación con rol `comprador` y con `jefe_compras`.

**Resultado esperado**: las tildes, la `ñ` y los símbolos se ven correctos; las columnas están separadas por `;`; se conserva el filtro; y el RUT de personas naturales sigue enmascarado para `comprador`. El formato del archivo se detalla en [contracts/exportacion-e-integracion.md](contracts/exportacion-e-integracion.md).

### 7. Persistencia y reinicio

1. Cree un proveedor o una solicitud, recargue la página y compruebe que el registro sigue ahí.
2. Reinicie los datos con el procedimiento de la sección **Configuración** y recargue.

**Resultado esperado**: las colecciones `erp_compras:*` y la Entidad base conservan los cambios entre recargas, y el reinicio devuelve la semilla original. Las claves y operaciones están descritas en [contracts/almacenamiento-compras.md](contracts/almacenamiento-compras.md).

## Verificación automatizada de las reglas

Las reglas de cálculo, validación, transiciones y conciliación de la sección 5 de `data-model.md` se comprueban con:

```bash
npx vitest run tests/unit/compras/reglas.test.js
npx vitest run tests/integration/compras
```

Los flujos de cada historia están en `tests/integration/compras/`: `proveedores.test.js`, `flujo-compras.test.js`, `catalogo-panel.test.js`, `casos-limite.test.js`, `vista.test.js`, `almacenamiento.test.js`, `trazabilidad.test.js` y `rendimiento.test.js`.

## Cobertura aún pendiente

- T043 a T050, T100, T101, T102 a T106, T109, T110 y T118: verificaciones adicionales del panel, daño posterior a la aceptación, crédito a favor, anulación con motivo y trazabilidad registradas en `tasks.md`.

T107, T108 y T120 están cerradas: `npm run format:check` pasa sin diferencias en el alcance de `.prettierignore`, la accesibilidad (SC-013) se verifica en `vista.test.js` y la auditoría de SC-003 en `flujo-compras.test.js`.
