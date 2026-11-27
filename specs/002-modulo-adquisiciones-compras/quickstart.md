# Inicio Rápido: Módulo Adquisiciones y Compras

**Funcionalidad**: `002-modulo-adquisiciones-compras`  
**Propósito**: verificar de extremo a extremo que el módulo funciona con los datos semilla, sin repetir la especificación ni el modelo de datos.  
**Referencias**: [spec.md](spec.md) (historias, FR y SC), [plan.md](plan.md), [data-model.md](data-model.md), [research.md](research.md) y [contratos](contracts/).

## Requisitos previos

- Node.js y npm compatibles con las versiones de Vite y Vitest declaradas en `package.json`.
- Un navegador de escritorio moderno con `localStorage` disponible.
- No se necesita backend ni base de datos después de instalar dependencias. La tipografía `Plus Jakarta Sans` se solicita desde Google Fonts cuando hay conexión; sin internet se aplica el respaldo `system-ui` declarado en `src/styles.css`, por lo que la funcionalidad no depende de la red. El acceso es simulado con la clave genérica `Compras2026`: el campo de identificación acepta correo corporativo o RUT válido con Módulo 11. El portal implementa **UI-01**: no expone selector visual de modo; inicia directamente con la semilla completa de **8 usuarios** (`semilla.json` v3) y el botón **Activar modo presentación** despliega el Directorio Interno de acceso rápido con ingreso en un clic. Al desactivar el modo presentación, el directorio vuelve a quedar oculto. El rol queda fijo hasta cerrar sesión; para usar otro rol, cierre sesión e ingrese de nuevo.

## Configuración

1. Si la reconstrucción se ejecuta con `/speckit.implement`, verifique que `specs/002-modulo-adquisiciones-compras/assets/login-bg.avif` exista y cópielo a `public/login-bg.avif` solo si esa ruta no existe. No se modifica ningún otro archivo; mientras la imagen no esté disponible, `src/styles.css` conserva el degradado oscuro de respaldo.
2. Desde la raíz del repositorio, instale las dependencias:

   ```bash
   npm install
   ```

3. Inicie el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abra la URL local que muestra Vite (por defecto `http://localhost:5173`).
5. En la pantalla de acceso escriba un correo de la semilla (por ejemplo `francisca.herrera@pyme.cl`) o su RUT (por ejemplo `16.345.678-8`) y la clave genérica `Compras2026`. El sistema inicia con los 8 usuarios de la semilla; puede pulsar **Activar modo presentación** y elegir una de las ocho entradas del Directorio Interno para completar correo y clave con un clic. El botón **Mostrar/Ocultar** permite verificar la clave y **Cerrar sesión** devuelve a esta pantalla sin borrar los datos. Con la sesión iniciada no es posible cambiar de rol: en los escenarios, "como `<rol>`" significa cerrar sesión e ingresar con el correo o RUT de ese rol (los dos `jefe_compras` son `andres.contreras@pyme.cl` y `valentina.lagos@pyme.cl`).

La primera visita carga automáticamente `src/compras/semilla.json`: 8 usuarios (dos `jefe_compras` y dos `bodega`), 4 centros de costo, 20 productos, 12 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación, 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Todos los datos son ficticios y las fechas se ajustan al día actual.

Si quiere volver al estado inicial, limpie las claves `erp_compras:*` y `erp_base_module:entities` desde las herramientas de desarrollo del navegador y recargue. Con el servidor de Vite abierto también puede ejecutar en la consola:

```js
await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras());
```

Después recargue la página para que se vuelva a cargar la semilla.

## Comandos de verificación

| Comando                | Resultado esperado                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Servidor Vite activo; la interfaz pide acceso y luego muestra solo el módulo Adquisiciones y Compras.          |
| `npm test -- --run` o `npx vitest run` | 321 pruebas aprobadas en 27 archivos y 56 omitidas en 10 archivos (los omitidos pertenecen al template base). |
| `npm run lint`         | 0 errores y 0 advertencias.                                                                                      |
| `npm run build`        | Build de producción sin errores.                                                                                |
| `npm run preview`      | El build se sirve en `http://localhost:4173` con el mismo comportamiento.                                       |
| `npm run format:check` | Sin diferencias en todo el código y las pruebas incluidos por `.prettierignore`.                                  |

## Escenarios de validación

### 1. Arranque, navegación y rol fijo por sesión (FR-018, FR-033, FR-034, FR-036, FR-037, SC-002)

1. Ingrese con un rol y la clave `Compras2026` (con nombre si es Solicitante, Comprador, Jefe de Compras o Encargado de Bodega; como Administrador TI basta el rol). Confirme que la barra superior muestra la marca **Adquisiciones y Compras**, el indicador de solo lectura con el usuario y el rol actuales y el botón **Cerrar sesión**, sin ningún selector de rol; que la barra lateral muestra **Panel** y los grupos **Adquisiciones** y **Compras**; que el encabezado muestra la sección actual; y que no aparece la tarjeta **Sesión activa**.
2. Compruebe las vistas visibles por rol:
   - `comprador`, `jefe_compras` y `admin_ti`: las diez vistas (Panel, Proveedores, Catálogo, Evaluaciones, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas y Devoluciones).
   - `solicitante`: Panel, Catálogo, Solicitudes, Órdenes de compra y Recepciones.
   - `bodega`: Panel, Solicitudes (solo las propias), Órdenes de compra, Recepciones y Devoluciones, sin el grupo Adquisiciones.
3. En el Panel, verifique los pendientes por rol, las alertas de vencimiento y los indicadores del período, y que las acciones rápidas muestran una descripción (p. ej., _Crear solicitud de compra_), no la clave del permiso. La acción _Crear solicitud de compra_ aparece para los cinco roles.
4. Con la sesión de `solicitante` iniciada, compruebe que no hay forma de cambiar de rol desde la barra superior. Pulse **Cerrar sesión**, ingrese como `jefe_compras` y repita con `bodega` y con `admin_ti`. Estando en **Cotizaciones** con `comprador`, cierre sesión e ingrese como `bodega`.
5. Repita el ingreso con `Rodrigo Araya Mena` y con `Paula Cárdenas Rivas`: el indicador y las solicitudes propias deben corresponder a cada persona, no al rol genérico `bodega`.

**Resultado esperado**: el rol no cambia mientras la sesión está iniciada; el indicador muestra siempre el usuario y el rol con que se ingresó. Tras cerrar sesión e ingresar con otro rol, la aplicación abre el Panel de ese rol y la barra lateral y los botones corresponden a la matriz de visibilidad.

### 2. Proveedores y datos sensibles (US1, FR-001 a FR-004, FR-025, SC-009)

1. Ingrese como `comprador`, abra **Proveedores** y busque el proveedor de la semilla con RUT tributario `9.876.543-3` y cuenta `555444333`. Confirme que el RUT aparece completo, la cuenta como `****4333` y que los campos bancarios no son editables.
2. Cierre sesión e ingrese como `jefe_compras`: RUT y cuenta deben verse completos, sin habilitar la edición bancaria.
3. Cierre sesión e ingrese como `admin_ti`: además debe poder editar banco y cuenta. Modifique la cuenta, guarde y confirme que se actualizó `fecha_cambio_cuenta`; el cambio queda registrado en `erp_compras:trazabilidad` con la representación autorizada por `visibilidad.js`.
4. Ingrese como `bodega` y abra una **Recepción**: el RUT del proveedor debe verse completo solo en la recepción y en la guía de despacho, nunca la cuenta. Confirme que `bodega` no tiene acceso al directorio de **Proveedores**.
5. Ingrese como `solicitante`: confirme que no ve el directorio de proveedores, el RUT tributario ni cuentas en catálogo, OC ni recepciones; en el indicador de sesión ve solo su propio RUT sin enmascarar.
6. Abra la trazabilidad como `jefe_compras` y confirme que el RUT personal de otro empleado aparece como `18.XXX.XXX-5`; como `admin_ti` aparece completo y como `solicitante`, `comprador` o `bodega` aparece `••••••••-•` o no se entrega.
7. Con `admin_ti`, desbloquee el proveedor bloqueado de la semilla y confirme que vuelve a `aprobado`. Ingresando como `comprador`, la acción de desbloquear no aparece. Con `admin_ti`, no se pueden crear proveedores ni editar sus datos generales.
8. Busque un proveedor sin cuenta registrada y confirme **No registrado**; busque una cuenta existente con `solicitante` o `bodega` y confirme **No disponible** en `cuenta_visible`, sin ningún dígito ni valor inventado.

**Resultado esperado**: tablas, modales, búsquedas, CSV y respuestas del asistente entregan solo la representación autorizada por la matriz de `visibilidad.js` para cada rol y canal; nunca el valor completo ni dígitos no autorizados. El cambio bancario actualiza `fecha_cambio_cuenta` y deja un evento de trazabilidad con la representación autorizada.

### 3. Ciclo completo de compra (US2, US6, US3, US4, US7; SC-002)

Con los datos semilla ya hay documentos en todos los estados. Para repetir el ciclo desde cero (cada "como `<rol>`" implica cerrar sesión e ingresar con ese rol):

1. Como `solicitante`, cree una solicitud con al menos tres líneas, envíela y verifique el correlativo `SC-AAAA-NNNN`.
2. Como `jefe_compras` (`Andrés Contreras Pérez`), apruébela. Cree y envíe una solicitud propia e intente aprobarla: el sistema lo bloquea (FR-006). Cierre sesión, ingrese como `jefe_compras` con `Valentina Lagos Fuentes` y apruebe esa solicitud: el aprobador registrado es `Valentina Lagos Fuentes`.
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

**Resultado esperado**: las tildes, la `ñ` y los símbolos se ven correctos; las columnas están separadas por `;`; se conserva el filtro; y el RUT tributario exportado sigue la matriz: completo para `comprador`, `••••••••-•` para `solicitante` y visible para `bodega` solo en recepciones. El formato del archivo se detalla en [contracts/exportacion-e-integracion.md](contracts/exportacion-e-integracion.md).

### 7. Persistencia y reinicio

1. Cree un proveedor o una solicitud, recargue la página y compruebe que el registro sigue ahí.
2. Reinicie los datos con el procedimiento de la sección **Configuración** y recargue.

**Resultado esperado**: las colecciones `erp_compras:*` y la Entidad base conservan los cambios entre recargas, y el reinicio devuelve la semilla original. Las claves y operaciones están descritas en [contracts/almacenamiento-compras.md](contracts/almacenamiento-compras.md).

### 8. Gobernanza: modo presentación, padrón, OTP y auditoría forense (FR-042–FR-046, SC-020–SC-023)

1. En la pantalla de acceso confirme que no existe un selector visual de modo. Pulse **Activar modo presentación** y verifique que el Directorio Interno despliega las ocho entradas con nombre, correo, clave, rol y centro de costo; al desactivar la presentación, el directorio vuelve a quedar oculto. Ingrese con `13.789.012-7` y `Compras2026` y confirme que el acceso por RUT Módulo 11 válido resuelve al usuario correcto.
2. Como `admin_ti`, abra el **Padrón de Usuarios · Administración TI**: debe tener ocho filas con nombre propio, RUT completo, correo, centro de costo, estado y acciones. El nombre `Tomás Villarroel Sepúlveda` y los demás son enlaces; pulse `Camila Rojas Soto`.
3. En la ficha confirme que Nombre, Correo corporativo, RUT, Rol y Centro de costo están bloqueados. Pulse **Solicitar autorización del titular (Código OTP)**; durante el modo presentación puede aparecer la ayuda visual con el código y se crea una notificación interna al titular. Escriba un código erróneo y compruebe el rechazo; luego escriba el código mostrado y confirme que los campos se habilitan. Modifique el nombre, guarde y verifique que el RUT inválido o el correo mal formado se rechazan, pero el cambio válido se aplica.
4. Vuelva al padrón, abra la ficha de `Diego Muñoz Vera`, solicite autorización para cambiar estado, valide el OTP y pulse **Suspender cuenta**. Intente ingresar con `diego.munoz@pyme.cl` o `17.234.567-0`: el sistema lo rechaza. Confirme que no puede suspenderse a sí mismo ni dejar al sistema sin `admin_ti` activo.
5. En **Parámetros de compras** solicite OTP y cambie el umbral de cotizaciones a `900000` y la tolerancia a `0,02`. Confirme que el nuevo umbral se aplica de inmediato en Cotizaciones y Órdenes de compra y persiste tras recargar.
6. Abra **Log de Auditoría Forense**: cada edición, suspensión, reactivación, cambio de parámetros y desbloqueo de excepciones debe mostrar actor, usuario afectado, tipo de evento, campos anterior → nuevo, resultado OTP y timestamp, con **Integridad verificada**. Exporte el CSV; un código reutilizado o expirado debe rechazarse y no generar evento.

**Resultado esperado**: el portal cumple UI-01 (sin selector visual de modo, 8 usuarios iniciales y Directorio Interno activado por **Activar modo presentación**), ningún campo personal cambia sin OTP vigente, las cuentas suspendidas no ingresan y toda operación sensible queda registrada de forma íntegra y consultable solo por `admin_ti`.

## Verificación automatizada de las reglas

Las reglas de cálculo, validación, transiciones y conciliación de la sección 5 de `data-model.md` se comprueban con:

```bash
npx vitest run tests/unit/compras/reglas.test.js
npx vitest run tests/integration/compras
```

Los flujos de cada historia están en `tests/integration/compras/`: `proveedores.test.js`, `flujo-compras.test.js`, `catalogo-panel.test.js`, `casos-limite.test.js`, `vista.test.js`, `autenticacion.test.js`, `portal-corporativo.test.js`, `permisos.test.js`, `asistente.test.js`, `almacenamiento.test.js`, `trazabilidad.test.js`, `rendimiento.test.js`, `usuarios.test.js` y `auditoria-forense.test.js`. La lógica pura de OTP y padrón está en `tests/unit/compras/otp.test.js` y `tests/unit/compras/usuarios.test.js`.

## Cobertura pendiente

- Recorrido manual en navegador (T144/T155/T168): ejecutar los escenarios 1 a 8 con los cinco roles, cerrando sesión entre cada uno. La verificación automatizada ya está completada (321 pruebas aprobadas).

T127, T137 y T139 están cerradas: el filtro del `solicitante` se aplica en servicios, UI y CSV, y el panel muestra «Mis solicitudes» y los indicadores de FR-035 para los cinco roles, con pruebas parametrizadas por rol.

T107, T108, T120, T140, T142 y T143 están cerradas: `npm run format:check` pasa sin diferencias en todo el alcance de `.prettierignore`, la accesibilidad (SC-013) se verifica en `vista.test.js`, la auditoría de SC-003 en `flujo-compras.test.js`, `admin_ti` queda en solo lectura en `permisos.test.js` y la documentación comparte el estado canónico.
