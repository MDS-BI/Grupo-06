# Casos de Prueba - Módulo Adquisiciones y Compras (Versión Integrada)

**Proyecto:** ERP Grupo 06  
**Módulo:** 002 - Módulo Adquisiciones y Compras  
**Tipo de Pruebas:** Funcionales, Integración, Validación de Reglas de Negocio, Seguridad/Segregación de Funciones  
**Ambiente:** Frontend sobre template `001-erp-base-module` | Persistencia: `localStorage` + datos semilla ficticios  
**Fecha:** 2026-10-27  
**Elaborado por:** QA  
**Referencias:** 
- [spec.md](../../specs/002-modulo-adquisiciones-compras/spec.md)
- [data-model.md](../../specs/002-modulo-adquisiciones-compras/data-model.md)
- [plan.md](../../specs/002-modulo-adquisiciones-compras/plan.md)


## 1. Objetivo

Validar que el ciclo completo de Adquisiciones y Compras funciona de forma integrada: `Solicitud de Compra → Cotizaciones → Orden de Compra → Recepción → Factura del Proveedor`, aplicando todas las reglas de negocio, validaciones, segregación de funciones, conciliación de tres vías y alertas definidas en la especificación.


## 2. Roles y Usuarios para Pruebas

| Rol | Usuario (ejemplo semilla) | Alcance |
|---|---|---|
| `solicitante` | SOL-001 (perteneciente a un Centro de Costo) | Crear, enviar solicitudes de compra. No puede aprobar las propias. |
| `comprador` | COMP-001 | Cotizar, comparar, emitir OC (con/sin cotización según umbral), exportar listados. |
| `jefe_compras` | JC-001 | Aprobar/rechazar solicitudes, aprobar facturas para pago, evaluar proveedores, gestionar panel y alertas. |
| `bodega` | BOD-001 | Registrar recepciones, aceptar/rechazar unidades con motivo. No puede recibir OC que él mismo emitió. |
| `admin` | ADM-001 | Gestionar proveedores (crear/editar/bloquear), ver datos bancarios completos, mantener maestros. |
| `inventario` (simulado) | INT-001 | Verifica disponibilidad de `cantidad_aceptada` desde Recepción (Integración). |
| `contabilidad` (simulado) | CON-001 | Recibe facturas en estado `aprobada_pago` (Integración). |


## 3. Datos Semilla Requeridos

| Maestro | Requisito |
|---|---|
| `CENTRO_COSTO` | Al menos CC-ADM, CC-PROD, CC-VTA activos |
| `USUARIO` | Al menos un usuario por rol con centro de costo asignado |
| `PROVEEDOR` | Estados `potencial`, `aprobado`, `bloqueado`. Algunos con `acuerdo_plazo_mayor = true/false`. Incluir al menos uno con cuenta bancaria registrada y con `fecha_cambio_cuenta` reciente (<30 días) para validar alertas. |
| `PRODUCTO` | Productos activos e inactivos. Incluir productos compartidos con Inventario. |
| `PROVEEDOR_PRODUCTO` | Catálogo con `precio_referencia` actualizado y con al menos uno con `fecha_actualizacion > 90 días` para validar estado "desactualizado". |
| Parámetros | `UMBRAL_COTIZACIONES = 1.000.000 CLP neto`, `TOLERANCIA_CONCILIACION = 1% del neto` |


## 4. Casos de Prueba por Historia de Usuario

### HU-01: Gestionar Proveedores (P1)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-001-01 | Crear proveedor válido | Usuario con rol `admin` o `comprador` en lista de Proveedores | 1. Ir a Compras > Proveedores > Nuevo. 2. Ingresar RUT válido, razón social, giro, región, email/teléfono. 3. Guardar. | RUT: `76123456-5`, Razón Social: `Proveedor Demo SpA`, Giro: `Comercialización`, Región: `Metropolitana` | Proveedor guardado en estado `potencial`. Aparece en listado con sus datos. | Funcional | P1 |
| CP-COM-001-02 | Validación RUT inválido o duplicado | Listado de proveedores con RUT existente | 1. Crear proveedor con RUT con DV incorrecto. 2. Crear proveedor con RUT ya registrado. | DV erróneo / RUT duplicado | Sistema impide guardar. Se muestra mensaje explicativo (formato/DV o unicidad). | Funcional/Validación | P1 |
| CP-COM-001-03 | Condición de pago > 30 sin acuerdo | Usuario `admin/comprador` creando proveedor | 1. Ingresar `condicion_pago_dias = 45`. 2. Dejar `acuerdo_plazo_mayor = false`. 3. Intentar guardar. | 45 días sin acuerdo | No permite guardar. Explica máximo legal 30 días sin acuerdo inscrito (Ley 21.131). | Regla de Negocio | P1 |
| CP-COM-001-04 | Eliminar proveedor con OC | Proveedor con al menos una Orden de Compra asociada | 1. Abrir ficha del proveedor con OC. 2. Intentar eliminar. | Proveedor con `OC-2026-XXXX` | Sistema impide eliminar. Ofrece opción `Bloquear` en lugar de eliminar. | Funcional/Integridad | P1 |
| CP-COM-001-05 | Enmascarado de datos sensibles por rol | Usuario con rol distinto a `admin` visualiza ficha de proveedor | 1. Logueado como `comprador`/`jefe_compras`/`bodega`/`solicitante`. 2. Abrir ficha proveedor con cuenta bancaria. | Proveedor con `numero_cuenta` completo | Número de cuenta bancaria aparece enmascarado. Campo no editable. RUT de persona natural también enmascarado según rol. | Seguridad/Datos Sensibles | P1 |


### HU-02: Crear y Aprobar Solicitudes de Compra (P1)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-002-01 | Crear y enviar solicitud con productos | Usuario `solicitante` activo, productos activos existentes | 1. Nueva solicitud. 2. Agregar >=1 producto activo, cantidad, fecha requerida, justificación. 3. Enviar. | 2 productos, fecha_requerida > fecha_solicitud | Queda en estado `enviada`. Número correlativo `SC-AAAA-NNNN`. Monto estimado calculado (suma subtotales). | Funcional | P1 |
| CP-COM-002-02 | Aprobar solicitud | Solicitud en estado `enviada`, usuario `jefe_compras` distinto al solicitante | 1. Abrir solicitud. 2. Aprobar con observación opcional. | Solicitud de SOL-001, aprobador JC-001 | Pasa a `aprobada`. Se registra `aprobador`, `fecha_aprobacion`. Visible en historial. | Flujo de Aprobación | P1 |
| CP-COM-002-03 | Rechazar sin motivo | Solicitud `enviada` | 1. Intentar rechazar sin ingresar `motivo_rechazo`. | Sin motivo | Sistema exige motivo antes de guardar. No permite transición a `rechazada`. | Validación | P1 |
| CP-COM-002-04 | Auto-aprobación | `jefe_compras` es el mismo usuario que `solicitante` | 1. Crear y enviar solicitud con mismo usuario. 2. Intentar aprobar. | Mismo ID usuario | Sistema impide aprobar su propia solicitud. Muestra advertencia de segregación. | Segregación de Funciones | P1 |
| CP-COM-002-05 | Enviar solicitud sin productos | Solicitud en `borrador` sin líneas | 1. Agregar cabecera. 2. Intentar enviar. | Sin detalle | Sistema impide envío. Solicita agregar al menos un producto. | Validación | P1 |


### HU-03: Emitir Órdenes de Compra (P1)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-003-01 | OC por compra directa bajo umbral | Solicitud `aprobada`, monto estimado < `UMBRAL_COTIZACIONES`, proveedor `aprobado` | 1. Desde solicitud aprobada > Emitir OC. 2. Seleccionar proveedor aprobado. 3. Emitir sin cotización. | Monto < 1.000.000 CLP neto | OC queda `emitida` con número `OC-AAAA-NNNN`. IVA 19% del neto. Total correcto. Solicitud pasa a `adjudicada`. | Funcional | P1 |
| CP-COM-003-02 | OC directa sobre umbral sin cotizaciones | Solicitud `aprobada`, monto >= umbral, sin cotizaciones registradas | 1. Intentar emitir OC directa. | Monto >= 1.000.000 CLP neto | Sistema impide. Explica que se requieren cotizaciones. | Regla de Negocio | P1 |
| CP-COM-003-03 | OC a proveedor no aprobado/bloqueado | Solicitud `aprobada` | 1. Intentar emitir OC a proveedor `potencial` o `bloqueado`. | Proveedor en estado `potencial`/`bloqueado` | Sistema impide emisión. Solo permite proveedores `aprobado`. | Validación/Regla | P1 |
| CP-COM-003-04 | Evitar doble OC por cotización | Cotización `seleccionada` ya convertida a OC | 1. Intentar generar segunda OC desde misma cotización. | `id_cotizacion` ya usado | Sistema impide. Indica que ya existe OC para esa cotización. | Integridad | P1 |
| CP-COM-003-05 | Anular OC sin recepciones | OC `emitida` sin recepciones registradas | 1. Anular OC con motivo. | OC sin `RECEPCION` | Queda `anulada`. Solicitud vuelve a `aprobada` o `en_cotizacion` según tenga cotizaciones. | Flujo | P1 |


### HU-04: Registrar Recepciones (P1)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-004-01 | Recepción parcial y total | OC `emitida` con 10 unidades por línea | 1. Registrar recepción parcial: aceptar 6. 2. Registrar segunda recepción: aceptar 4. | 10 unidades total | Primera: OC pasa a `recibida_parcial`, muestra pendiente por línea. Segunda: pasa a `recibida_total`. Saldos correctos. | Funcional | P1 |
| CP-COM-004-02 | No aceptar más de lo pendiente | Línea con 4 unidades pendientes | 1. Intentar aceptar 5 unidades. | Pendiente 4 | Sistema impide. No permite exceder cantidad pendiente. | Validación | P1 |
| CP-COM-004-03 | Rechazo sin motivo | Recepción con `cantidad_rechazada > 0` | 1. Ingresar unidades rechazadas sin `motivo_rechazo`. | Rechazo > 0 sin motivo | Sistema exige motivo de rechazo (`danado`, `no_corresponde`, `fuera_de_especificacion`, `otro`). | Validación | P1 |
| CP-COM-004-04 | Segregación: receptor distinto al comprador | OC emitida por COMP-001 | 1. Intentar registrar recepción con mismo usuario COMP-001. | Mismo usuario | Sistema impide. Requiere usuario con rol `bodega` distinto al comprador de la OC. | Segregación de Funciones | P1 |


### HU-05: Panel de Compras (P1)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-005-01 | Acciones rápidas | Usuario con rol `jefe_compras`/`comprador` ingresa al módulo | 1. Cargar panel. | Sesión válida | Se muestran acciones rápidas: `Nueva solicitud`, `Nueva OC`, `Registrar recepción`, `Registrar factura`. Accesibles con un clic. | UI/Funcional | P1 |
| CP-COM-005-02 | Alertas de plazo legal | Existen facturas `recibida`/`conciliada` no aprobadas con `fecha_vencimiento <= hoy + 5 días` | 1. Abrir panel. | Factura vence en 5, 3 o 0 días | Aparecen destacadas como `Alerta de plazo legal`. Visible para roles con permiso (`jefe_compras`, `admin`). | Alertas/Regla | P1 |
| CP-COM-005-03 | Contadores se actualizan | Cambios realizados desde otras pantallas | 1. Crear solicitud / emitir OC / registrar recepción. 2. Volver al panel. | Acciones previas | Contadores (`Solicitudes por aprobar`, `OC por recibir`, `Facturas por aprobar`, `Gasto del mes`) reflejan cambios sin recargar manual. | Integración UI | P1 |


### HU-06: Registrar y Comparar Cotizaciones (P2)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-006-01 | Primera cotización pasa a en_cotizacion | Solicitud `aprobada` sin cotizaciones | 1. Registrar primera cotización desde proveedor `aprobado`. | Proveedor aprobado | Estado solicitud cambia a `en_cotizacion`. Cotización queda `recibida`. | Flujo | P2 |
| CP-COM-006-02 | Comparador con datos clave | Solicitud con >=2 cotizaciones | 1. Abrir `Comparar cotizaciones`. | 2-3 cotizaciones válidas | Se visualiza por proveedor: Total, Plazo entrega, Condición pago, Evaluación promedio + N° evaluaciones. | Funcional | P2 |
| CP-COM-006-03 | Mínimo 3 o justificación proveedor único | Solicitud >= umbral con solo 2 cotizaciones | 1. Intentar seleccionar cotización sin `justificacion_proveedor_unico`. | 2 cotizaciones, monto >= umbral | Sistema impide selección. Requiere 3 cotizaciones o justificar proveedor único. | Regla de Negocio | P2 |
| CP-COM-006-04 | Descartar exige motivo | Cotización en estado `recibida` | 1. Descartar sin motivo. 2. Descartar con motivo. | Sin motivo / con motivo | Sin motivo: impide. Con motivo (`precio`/`plazo`/`calidad`/`condiciones`/`otro`): pasa a `descartada` con `motivo_descarte`. | Validación | P2 |
| CP-COM-006-05 | Cotización vencida no seleccionable | Cotización con `fecha_validez < fecha_actual` | 1. Consultar comparador. 2. Intentar seleccionar. | Fecha validez pasada | Aparece estado `vencida`. No permite seleccionar. | Regla/Validación | P2 |


### HU-07: Registrar y Conciliar Facturas de Proveedor (P2)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-007-01 | Conciliación correcta (dentro de tolerancia) | OC con recepciones, 6 unidades aceptadas a 10.000 CLP neto c/u | 1. Registrar factura por 60.000 CLP neto, proveedor correcto, OC correcta. | Neto factura = valor recibido pendiente | Estado `conciliada`. `fecha_vencimiento = fecha_recepcion + condicion_pago_dias`. Calcula IVA/Total coherentes. | Conciliación 3 Vías | P2 |
| CP-COM-007-02 | Discrepancia fuera de tolerancia | Mismo caso anterior | 1. Registrar factura por 80.000 CLP neto. | Diferencia > 1% | Estado `con_discrepancia`. Muestra diferencia (monto y %). No queda conciliada. | Conciliación 3 Vías | P2 |
| CP-COM-007-03 | No aprobar factura con discrepancia | Factura en `con_discrepancia` | 1. Intentar aprobar para pago con rol `jefe_compras`. | Factura con_discrepancia | Sistema impide. Solo facturas `conciliadas` pueden pasar a `aprobada_pago`. | Regla de Negocio | P2 |
| CP-COM-007-04 | Folio duplicado por proveedor/tipo | Factura ya registrada para (proveedor, tipo_documento, folio) | 1. Intentar registrar nuevamente mismo folio. | Mismo proveedor + factura + folio | Sistema impide. Unicidad `(id_proveedor, tipo_documento, folio)`. | Integridad | P2 |
| CP-COM-007-05 | Alerta por cambio reciente de cuenta bancaria | Proveedor con `fecha_cambio_cuenta` hace < 30 días | 1. Aprobar factura para pago de ese proveedor. | Cambio cuenta < 30 días | Muestra advertencia de posible fraude. Registro debe quedar auditado (visible en log/historial). | Riesgo/Fraude | P2 |


### HU-08: Catálogo de Productos por Proveedor (P2)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-008-01 | Actualizar vs duplicar | Relación (proveedor, producto) ya existe | 1. Registrar mismo par nuevamente con nuevo precio/plazo. | Par duplicado | Actualiza registro existente (`id_proveedor_producto`). No crea duplicado. | Integridad | P2 |
| CP-COM-008-02 | Precio desactualizado | `fecha_actualizacion < hoy - 90 días` | 1. Visualizar catálogo/proveedor o sugerencia en solicitud. | > 90 días sin actualizar | Se marca como `desactualizado` visualmente (badge/etiqueta). | Alerta/Calidad Datos | P2 |


### HU-09: Evaluar Proveedores (P3)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-009-01 | Cálculo automático de nota_plazo | OC en `recibida_total` entregada con atraso | 1. Abrir evaluación. 2. Ingresar `nota_calidad` y `nota_servicio` (1-5). Guardar. | Entregada 2 días tarde vs fecha_entrega_esperada | `nota_plazo` se calcula automáticamente: 1-3 días tarde → 4. No editable por usuario. | Cálculo/Regla | P3 |
| CP-COM-009-02 | Una evaluación por OC | OC ya evaluada | 1. Intentar evaluar misma OC nuevamente. | Evaluación existente | Sistema impide. Relación 1:0..1 entre OC y Evaluación. | Integridad | P3 |


### HU-10: Exportar Reportes (P3)

| ID | Escenario (Spec) | Precondiciones | Pasos | Datos de Prueba | Resultado Esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|---|
| CP-COM-010-01 | Exportar CSV con filtro aplicado | Lista OC filtrada por mes/proveedor/estado | 1. Aplicar filtro. 2. Exportar CSV. 3. Abrir con Excel/LibreOffice. | Filtrado por mes actual | CSV contiene **exactamente** las filas filtradas. Montos en CLP sin decimales. Encabezados correctos. Valores coinciden con lo visto en pantalla. | Reportes/Export | P3 |


## 5. Casos de Prueba de Integración (End-to-End)

Estos casos validan el ciclo integrado completo y la interacción entre módulos simulados.

| ID | Nombre del Caso | Precondiciones | Pasos | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| CP-COM-INT-01 | Ciclo completo exitoso | Datos semilla completos, todos los roles disponibles | 1. `solicitante` crea y envía SC con 2 productos. 2. `jefe_compras` aprueba. 3. `comprador` registra 2 cotizaciones > umbral, compara, selecciona una y descarta otra con motivo. 4. `comprador` emite OC desde cotización seleccionada. 5. `bodega` registra recepción parcial y luego total (distinto al comprador). 6. `comprador/jefe_compras` registra factura conciliada. 7. `jefe_compras` aprueba para pago. 8. `jefe_compras` evalúa OC. | SC→`aprobada`→`en_cotizacion`→`adjudicada`. OC `emitida`→`recibida_parcial`→`recibida_total`. Factura `recibida`→`conciliada`→`aprobada_pago`. Evaluación creada con `nota_plazo` calculada. Todo trazable por números correlativos. | Integración E2E |
| CP-COM-INT-02 | Integración con Inventario (cantidad aceptada) | OC `recibida_total` con recepciones registradas | 1. Ver detalle recepción. 2. Verificar `cantidad_aceptada` por línea. | Las `cantidad_aceptada` quedan disponibles para Inventario (IR-002). El stock se actualizaría con esos valores. No se duplica conteo. | Integración Módulos |
| CP-COM-INT-03 | Integración con Contabilidad (factura aprobada) | Factura en estado `conciliada` aprobada por `jefe_compras` | 1. Aprobar para pago. 2. Verificar visibilidad para Contabilidad (simulado). | Factura pasa a `aprobada_pago`. Disponible para Contabilidad como cuenta por pagar (IR-003). Contabilidad solo registra pago (fuera de alcance). | Integración Módulos |
| CP-COM-INT-04 | Producto inactivo con solicitudes existentes | Producto pasa a `inactivo` con SC abiertas | 1. Marcar producto como inactivo. 2. Intentar agregarlo a nueva solicitud. 3. Ver solicitudes existentes. | Solicitudes existentes se mantienen sin cambios. No permite agregar producto inactivo a solicitudes nuevas. | Integración/Regla |
| CP-COM-INT-05 | Bloquear proveedor con OC abiertas | Proveedor con OC en `emitida`/`recibida_parcial` | 1. Bloquear proveedor desde ficha (admin). 2. Intentar emitir nueva OC. | OC abiertas siguen su curso normal. No permite emitir nuevas OC al proveedor `bloqueado`. | Integración/Regla |


## 6. Casos Límite (Edge Cases)

| ID | Caso Límite | Precondiciones | Pasos | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| CP-COM-LIM-01 | Anular OC con cotización seleccionada | OC anulada desde cotización `seleccionada` | 1. Anular OC sin recepciones. | Cotización permanece `seleccionada`. Puede generarse nueva OC desde esa misma cotización si reglas lo permiten. | Límite/Flujo |
| CP-COM-LIM-02 | Nota de crédito | Factura ya registrada, llega NC | 1. Registrar `nota_credito` contra misma OC. | Descuenta del monto facturado pendiente. Afecta conciliación. Se respeta unicidad por (proveedor,tipo_documento,folio). | Límite/Conciliación |
| CP-COM-LIM-03 | Excedente en recepción | OC pide 10, proveedor envía 12 | 1. Registrar recepción intentando aceptar 12. | Solo acepta hasta lo pendiente (máx 10). Excedente debe registrarse como rechazado con motivo `no_corresponde`. | Límite/Validación |
| CP-COM-LIM-04 | localStorage lleno/deshabilitado | Simular quota excedida o storage deshabilitado | 1. Realizar operación de guardado. | Muestra mensaje claro al usuario. No pierde información ya ingresada en pantalla. Aplicación sigue usable o degradagraciosamente con aviso. | Robustez |
| CP-COM-LIM-05 | Múltiples recepciones parciales | OC con varias entregas | 1. Registrar 3 recepciones con sumas parciales. | Estados correctos en cada paso. Pendiente siempre correcto. Al completar pasa a `recibida_total`. | Límite/Acumulado |


## 7. Criterios de Aceptación para Cierre QA

| Criterio | Condición de Aprobación |
|---|---|
| **Cobertura HU** | 100% de los escenarios de aceptación HU1-HU10 ejecutados con resultado PASSED. |
| **Ciclo Integrado** | CP-COM-INT-01 ejecutado sin desviaciones. Números correlativos correctos. |
| **Reglas Críticas** | Segregación de funciones (002-04, 004-04), umbral de cotizaciones (003-02, 006-03), conciliación (007-01/02/03), tope recepción (004-02, LIM-03). Todos PASSED. |
| **Seguridad/Datos** | Enmascarado por rol (001-05), alerta cambio cuenta (007-05), folio único (007-04). Verificados. |
| **Integración** | IR-001/002/003 validados con mocks/simulados. |
| **Rendimiento/UX** | Listados/búsquedas ágiles con ~500 registros (según SC-006). Sin bloqueos. |
| **Datos Semilla** | Únicamente datos ficticios. Sin información real. |


## 8. Evidencias Requeridas

Para cada caso ejecutado se debe adjuntar:

- **Evidencia:** Captura de pantalla (listado + ficha/detalle + estado)
- **Datos:** Valores ingresados y resultado mostrado
- **Trazabilidad:** ID Caso, Usuario/Rol, Fecha/Hora
- **Errores/Validaciones:** Mensajes exactos mostrados por el sistema
- **Estados:** Transiciones de estado verificadas (antes/después)
- **Integración:** Verificación en panel/otros módulos simulados
