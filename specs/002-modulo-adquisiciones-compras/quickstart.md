# Inicio Rápido: Módulo Adquisiciones y Compras

**Funcionalidad**: `002-modulo-adquisiciones-compras`  
**Propósito**: verificar de extremo a extremo que el módulo funciona con los datos semilla, sin repetir la especificación ni el modelo de datos.  
**Referencias**: [spec.md](spec.md) (historias, FR y SC), [plan.md](plan.md), [data-model.md](data-model.md), [research.md](research.md) y [contratos](contracts/).

## Requisitos previos

- Node.js y npm compatibles con las versiones de Vite y Vitest declaradas en `package.json`.
- Un navegador de escritorio moderno con `localStorage` disponible.
- No se necesita backend, base de datos ni conexión a internet después de instalar dependencias. El acceso es simulado: escriba su correo corporativo o use el directorio de acceso rápido con la clave genérica `Compras2026`; también está disponible el acceso por rol. Solicitante, Comprador y Jefe de Compras piden nombre. El rol queda fijo hasta cerrar sesión; para usar otro rol, cierre sesión e ingrese de nuevo.

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
4. En la pantalla de acceso escriba `carla.diaz@example.com` o pulse su entrada en el directorio, e ingrese la clave genérica `Compras2026`. Por el acceso alternativo por rol, elija **Comprador**, escriba `Carla Díaz` y use la misma clave. **Jefe de Compras** también pide nombre: la semilla tiene dos usuarios de ese rol, `Marcela Rojas` y `Jorge Muñoz`. Si ingresa como **Encargado de Bodega** o **Administrador TI**, el campo de nombre se oculta y la sesión muestra el rol con su centro de costo. El botón **Mostrar** permite verificar la clave y **Cerrar sesión** devuelve a esta pantalla sin borrar los datos. Con la sesión iniciada no es posible cambiar de rol: en los escenarios, "como `<rol>`" significa cerrar sesión e ingresar con ese rol.

La primera visita carga automáticamente `src/compras/semilla.json`: 7 usuarios (dos de ellos `jefe_compras`), 4 centros de costo, 20 productos, 8 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación, 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Todos los datos son ficticios y las fechas se ajustan al día actual.

Si quiere volver al estado inicial, limpie las claves `erp_compras:*` y `erp_base_module:entities` desde las herramientas de desarrollo del navegador y recargue. Con el servidor de Vite abierto también puede ejecutar en la consola:

```js
await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras());
```

Después recargue la página para que se vuelva a cargar la semilla.

## Comandos de verificación

| Comando                | Resultado esperado                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Servidor Vite activo; la interfaz pide acceso y luego muestra solo el módulo Adquisiciones y Compras.          |
| `npx vitest run`       | 232 pruebas aprobadas y 56 omitidas (las omitidas pertenecen al template base).                                 |
| `npm run lint`         | 0 errores y 0 advertencias.                                                                                      |
| `npm run build`        | Build de producción sin errores.                                                                                |
| `npm run preview`      | El build se sirve en `http://localhost:4173` con el mismo comportamiento.                                       |
| `npm run format:check` | Sin diferencias en el alcance de `.prettierignore` (núcleo base); el resto de `src/**` y `tests/**` está excluido. |

## Escenarios de validación

### 1. Arranque, navegación y rol fijo por sesión (FR-018, FR-033, FR-034, FR-036, FR-037, SC-002)

1. Ingrese con un rol y la clave `Compras2026` (con nombre si es Solicitante, Comprador o Jefe de Compras). Confirme que la barra superior muestra la marca **Adquisiciones y Compras**, el indicador de solo lectura con el usuario y el rol actuales y el botón **Cerrar sesión**, sin ningún selector de rol; que la barra lateral muestra **Panel** y los grupos **Adquisiciones** y **Compras**; que el encabezado muestra la sección actual; y que no aparece la tarjeta **Sesión activa**.
2. Compruebe las vistas visibles por rol:
   - `comprador`, `jefe_compras` y `admin_ti`: las diez vistas (Panel, Proveedores, Catálogo, Evaluaciones, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas y Devoluciones).
   - `solicitante`: Panel, Catálogo, Solicitudes, Órdenes de compra y Recepciones.
   - `bodega`: Panel, Solicitudes (solo las propias), Órdenes de compra, Recepciones y Devoluciones, sin el grupo Adquisiciones.
3. En el Panel, verifique los pendientes por rol, las alertas de vencimiento y los indicadores del período, y que las acciones rápidas muestran una descripción (p. ej., _Crear solicitud de compra_), no la clave del permiso. La acción _Crear solicitud de compra_ aparece para los cinco roles.
4. Con la sesión de `solicitante` iniciada, compruebe que no hay forma de cambiar de rol desde la barra superior. Pulse **Cerrar sesión**, ingrese como `jefe_compras` y repita con `bodega` y con `admin_ti`. Estando en **Cotizaciones** con `comprador`, cierre sesión e ingrese como `bodega`.

**Resultado esperado**: el rol no cambia mientras la sesión está iniciada; el indicador muestra siempre el usuario y el rol con que se ingresó. Tras cerrar sesión e ingresar con otro rol, la aplicación abre el Panel de ese rol y la barra lateral y los botones corresponden a la matriz de visibilidad.

### 2. Proveedores y datos sensibles (US1, FR-001 a FR-004, FR-025, SC-009)

1. Abra **Proveedores** y busque el proveedor persona natural de la semilla (RUT `9.876.543-3`, cuenta `555444333`).
2. Ingresando como `comprador` (o como `bodega`), confirme que el RUT aparece como `98.***.***-3` y la cuenta como `****4333`, y que los campos bancarios están deshabilitados.
3. Cierre sesión e ingrese como `jefe_compras`: RUT y cuenta deben verse completos, sin habilitar la edición bancaria.
4. Cierre sesión e ingrese como `admin_ti`: además debe poder editar banco y cuenta. Modifique la cuenta, guarde y confirme que se actualizó `fecha_cambio_cuenta`; el cambio queda registrado en `erp_compras:trazabilidad` con el valor enmascarado.
5. Con `admin_ti`, desbloquee el proveedor bloqueado de la semilla y confirme que vuelve a `aprobado`. Ingresando como `comprador`, la acción de desbloquear no aparece. Con `admin_ti`, no se pueden crear proveedores ni editar sus datos generales.
6. Busque un proveedor sin cuenta registrada y confirme el texto **No registrado**.

**Resultado esperado**: en roles sin permiso ni la tabla, ni el formulario, ni el CSV contienen el valor completo. El cambio bancario actualiza `fecha_cambio_cuenta` y deja un evento de trazabilidad con el valor enmascarado.

### 3. Ciclo completo de compra (US2, US6, US3, US4, US7; SC-002)

Con los datos semilla ya hay documentos en todos los estados. Para repetir el ciclo desde cero (cada "como `<rol>`" implica cerrar sesión e ingresar con ese rol):

1. Como `solicitante`, cree una solicitud con al menos tres líneas, envíela y verifique el correlativo `SC-AAAA-NNNN`.
2. Como `jefe_compras` (`Marcela Rojas`), apruébela. Cree y envíe una solicitud propia e intente aprobarla: el sistema lo bloquea (FR-006). Cierre sesión, ingrese como `jefe_compras` con `Jorge Muñoz` y apruebe esa solicitud: el aprobador registrado es `Jorge Muñoz`.
3. Como `bodega`, cree y envíe una solicitud y confirme que en **Solicitudes** solo ve las propias; como `comprador`, confirme que puede crear una solicitud propia y que las ajenas se ven en solo lectura (FR-005).
4. Como `comprador`, registre tres cotizaciones para una solicitud sobre el umbral, descarte una con motivo y seleccione otra (FR-008 y FR-009).
5. Emita la orden de compra desde la cotización seleccionada: líneas y precios se copian, el neto, el IVA de 19 % y el total se calculan en CLP enteros y la solicitud pasa a `adjudicada`.
6. Como `bodega`, registre una recepción parcial y una unidad dañada con motivo `danado`; intente recibir más de lo pendiente y compruebe el bloqueo (FR-013 y FR-026). Intente registrar la recepción con el usuario que emitió la OC y compruebe que se bloquea para cualquier rol (FR-014).
7. Como `comprador`, registre la factura y verifique que queda `conciliada` cuando la diferencia está dentro de la tolerancia del 1 %.
8. Use el botón de cadena documental en cualquier documento para recorrer solicitud → cotización → OC → recepción → factura y revisar el historial (FR-028): solo `jefe_compras` (consulta) y `admin_ti` (consulta y exporta) ven los eventos; el resto de los roles ve solo la cadena.

**Resultado esperado**: el ciclo se completa en menos de cinco minutos, con estados congruentes y eventos de auditoría en cada cambio.

### 4. Panel, alertas y pago dentro de plazo (US5, FR-017, FR-035, SC-005)

1. Recorra el **Panel** con los cinco roles, cerrando sesión e ingresando con cada uno, y verifique que cada uno ve solo sus pendientes e indicadores (tabla de FR-035 en `spec.md`).
2. Revise las facturas no aprobadas con vencimiento a cinco días o menos y los accesos directos a sus documentos.
3. Como `jefe_compras`, apruebe para pago solo una factura `conciliada`; una factura `con_discrepancia` no debe pasar.
4. Con `admin_ti`, compruebe que ve los cambios bancarios recientes y las alertas de fraude, y que no tiene botones para aprobar solicitudes, pagos ni devoluciones.

**Resultado esperado**: las alertas coinciden con los vencimientos de la semilla y los botones del panel respetan el rol activo.

### 5. Catálogo, evaluaciones y devoluciones (US8, US9, US11)

1. En **Catálogo**, identifique un precio con más de 90 días sin actualizar y compruébelo como desactualizado; al crear una solicitud se sugiere el menor precio vigente.
2. En **Evaluaciones**, confirme que la nota de plazo se calcula desde las fechas de recepción y no se ingresa manualmente.
3. En **Devoluciones**, como `bodega`, registre una devolución con motivo `defectuoso` sobre una recepción aceptada; si quien la registra recibió la mercadería, apruébela como `jefe_compras`. Cuando corresponda, registre una nota de crédito contra una factura existente.

**Resultado esperado**: la cantidad devuelta deja de contar como recibida y facturada, la factura queda saldada cuando el saldo llega a cero y la OC se cierra sin perder el historial.

### 6. Exportación CSV (US10, FR-024, SC-008, SC-010)

1. En **Proveedores**, aplique un filtro y pulse **Exportar CSV**.
2. Abra el archivo en una planilla de cálculo en español.
3. Repita la exportación ingresando como `comprador` y luego como `jefe_compras`.

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

Los flujos de cada historia están en `tests/integration/compras/`: `proveedores.test.js`, `flujo-compras.test.js`, `catalogo-panel.test.js`, `casos-limite.test.js`, `vista.test.js`, `autenticacion.test.js`, `almacenamiento.test.js`, `trazabilidad.test.js` y `rendimiento.test.js`.

## Cobertura aún pendiente

- T101 y T110: cierre de OC con saldo pendiente y cálculo y visualización de `credito_a_favor` cuando una devolución `defectuosa` descuenta una factura ya aprobada.
- T104, T109 y T118: anulación con `motivo_anulacion` en facturas, devoluciones, cotizaciones y recepciones, con su registro en trazabilidad.
- Rediseño de permisos y navegación por rol (FR-033 a FR-036): permisos y visibilidad base implementados (T121-T123); la navegación agrupada y el modo solo lectura por vista (T125-T132) siguen pendientes.
- Creación de solicitudes por los cinco roles, segundo `jefe_compras` en la semilla y rol fijo por sesión (FR-005, FR-006, FR-037): implementados en T121, T146 y T147; la barra superior muestra el indicador de solo lectura y no existe selector **Rol Activo**. La navegación agrupada por rol (FR-034) sigue pendiente en T125.

T107, T108 y T120 están cerradas: `npm run format:check` pasa sin diferencias en el alcance de `.prettierignore`, la accesibilidad (SC-013) se verifica en `vista.test.js` (errores junto al campo con `role="alert"`/`aria-describedby`) y la auditoría de SC-003 en `flujo-compras.test.js`.
