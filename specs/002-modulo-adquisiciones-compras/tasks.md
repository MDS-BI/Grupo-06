# Tasks: Módulo Adquisiciones y Compras

**Entrada**: [spec.md](spec.md) (fuente de historias y requisitos), [plan.md](plan.md) y [data-model.md](data-model.md)

**Prerrequisitos**: plan.md, spec.md y data-model.md aprobados; módulo base `001-erp-base-module` operativo.

**Pruebas**: obligatorias según la constitución del proyecto y el plan. Cada regla de la sección 5 de `data-model.md` debe tener prueba unitaria, y cada historia de usuario debe tener al menos una prueba de integración de su flujo.

**Organización**: las tareas siguen el orden y la numeración de las historias de `spec.md`: **US1, US2, US3, US4, US5, US6, US7, US8, US9, US10 y US11**. Cada historia tiene su propia fase y no se mezclan responsabilidades entre ellas.

> **Alineación con spec.md**: las cotizaciones se separan en **US6** (registro y comparativa side-by-side), la emisión de OC queda en **US3**, el catálogo en **US8**, la evaluación de proveedores en **US9** y la exportación CSV en **US10**. Todas fueron creadas y ordenadas en `spec.md`; ya no existen tareas de "soporte" sin historia.
>
> **Roles**: se usan los roles definidos en `spec.md`: `solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`.
>
> **Extensión necesaria para US11**: para cumplir el documento de devolución con correlativo `DEV-AAAA-NNNN` se agrega `src/compras/devoluciones.js` y la colección `erp_compras:devoluciones`, no detallada en `plan.md` pero exigida por los escenarios de US11. Las notas de crédito se registran como `FACTURA_PROVEEDOR` con `tipo_documento = nota_credito`, según `data-model.md`.
>
> **Extensión necesaria para US10**: se agrega `src/compras/exportacion.js` con el generador CSV, sin dependencias externas, respetando filtros y permisos del rol activo.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Historia]**: historia de `spec.md` a la que pertenece la tarea.
- **[FR-xxx]**, **[IR-xxx]**, **[SC-xxx]**: trazabilidad con requisitos y criterios de éxito.
- Incluir rutas de archivo exactas en las descripciones.

## Convenciones de Rutas

- **Proyecto único**: `src/` y `tests/` en la raíz del repositorio, extendiendo `001-erp-base-module`.
- Código propio del módulo en `src/compras/`; pruebas en `tests/unit/compras/` y `tests/integration/compras/`.

---

## Fase 1: Configuración

**Propósito**: preparar la estructura y confirmar la dependencia bloqueante de la plantilla base.

- [x] T001 Verificar que la plantilla base exista y funcione: `src/`, `src/module-config.js`, contrato de almacenamiento de `specs/001-erp-base-module/contracts/entity-storage.md` y Vitest configurado. BLOQUEANTE según `plan.md`.
- [x] T002 Crear la estructura del módulo en `src/compras/`: `reglas.js`, `almacenamiento.js`, `solicitudes.js`, `cotizaciones.js`, `ordenes-compra.js`, `recepciones.js`, `facturas.js`, `devoluciones.js`, `catalogo.js`, `evaluaciones.js`, `panel.js`, `exportacion.js` y `semilla.json`.
- [x] T003 [P] Crear la estructura de pruebas en `tests/unit/compras/` y `tests/integration/compras/`.

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: infraestructura común que debe existir antes de cualquier historia.

- [x] T004 Configurar `src/module-config.js` para Compras: Proveedor como Entidad y Orden de Compra como Documento, con mapeo de campos base, campos personalizados y ciclo de vida de OC definido en `plan.md`.
- [x] T005 [P] Implementar en `src/compras/reglas.js` las funciones puras de validación de RUT, cálculo de montos con IVA 19 %, transiciones de estado, conciliación, vencimientos y nota de plazo. [FR-012]
- [x] T006 [P] Implementar en `src/compras/almacenamiento.js` las colecciones `erp_compras:*` con el contrato del template (`load`, `save`, `add`, `update`, `delete`), arrays `lineas` para detalles y validadores de unicidad. Manejar `localStorage` lleno o deshabilitado sin perder lo que el usuario tenía en pantalla.
- [x] T007 [P] Implementar el cargador de datos semilla en `src/compras/almacenamiento.js`, con carga en la primera ejecución y mensaje claro si falla.
- [x] T008 Crear `src/compras/semilla.json` con datos completamente ficticios: 4 centros de costo, 6 usuarios (los 5 roles y un segundo solicitante), 8 proveedores (uno bloqueado, uno con cuenta cambiada hace menos de 30 días y uno persona natural), 20 productos y registros en todos los estados, incluidas cotizaciones, recepciones, facturas, notas de crédito, devoluciones, catálogo y evaluaciones. [FR-020]
- [x] T009 Cargar `PRODUCTO`, `USUARIO` y `CENTRO_COSTO` como datos maestros de solo lectura mientras Inventario, RR.HH. y Contabilidad no estén conectados. [IR-001]
- [x] T010 Implementar el selector de usuario/rol simulado en `src/app.js` o componente de compras, con los roles `solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`, y un helper de autorización reutilizable.

**Punto de control**: base lista; las historias pueden comenzar.

---

## Fase 3: Historia de Usuario 1 - Gestionar proveedores (P1)

**Objetivo**: crear, editar, buscar, aprobar y bloquear proveedores con validación de RUT, condición de pago legal, bloqueo de eliminación y enmascaramiento de datos sensibles.

**Prueba Independiente**: crear un proveedor con RUT válido, encontrarlo, cambiar su estado a `aprobado` y luego a `bloqueado`; rechazar RUT inválido, RUT duplicado y condición de pago mayor a 30 días sin acuerdo.

- [x] T011 [US1] Extender el almacenamiento de proveedores sobre la Entidad base con todos los campos de `data-model.md`: tipo de persona, giro, región, tamaño, estado, condición de pago, acuerdo de plazo mayor, datos bancarios y `fecha_cambio_cuenta`. [FR-001]
- [x] T012 [US1] Implementar validación de RUT chileno (formato y dígito verificador) y unicidad, impidiendo guardar y sugiriendo el registro existente cuando corresponda. [FR-001]
- [x] T013 [US1] Implementar la lista y búsqueda de proveedores sobre la gestión de entidades base. [FR-001]
- [x] T014 [US1] Implementar el formulario de proveedor con campos obligatorios y la regla de que una condición de pago mayor a 30 días exige `acuerdo_plazo_mayor` (Ley 21.131). [FR-001, FR-002]
- [x] T015 [US1] Implementar el cambio de estado `potencial → aprobado → bloqueado` y restringir la emisión de OC solo a proveedores `aprobado`. [FR-001, FR-010]
- [x] T016 [US1] Impedir eliminar proveedores con órdenes de compra y ofrecer bloquearlos en su lugar. Las OC abiertas siguen su curso y no se permiten OC nuevas a un proveedor bloqueado. [FR-003]
- [x] T017 [US1] Enmascarar el RUT de personas naturales y el número de cuenta bancaria para roles distintos de `admin_ti`; permitir editar datos bancarios solo a `admin_ti` y actualizar `fecha_cambio_cuenta` al modificarlos. [FR-004]
- [x] T018 [US1] Agregar pruebas unitarias de RUT, condición de pago, enmascaramiento y eliminación/bloqueo en `tests/unit/compras/reglas.test.js`.
- [x] T019 [US1] Agregar prueba de integración del flujo completo de US1 en `tests/integration/compras/us1-proveedores.test.js`.

**Punto de control**: gestión de proveedores funcional.

---

## Fase 4: Historia de Usuario 2 - Crear y aprobar solicitudes de compra (P1)

**Objetivo**: crear solicitudes con líneas, enviarlas y aprobarlas o rechazarlas con segregación de funciones.

**Prueba Independiente**: un solicitante crea una solicitud de dos productos y la envía; el jefe de compras la aprueba y queda `aprobada` con número `SC-AAAA-NNNN`; no puede aprobar su propia solicitud.

- [x] T020 [US2] Crear los esquemas de `SOLICITUD_COMPRA` y sus `lineas` de detalle en `src/compras/almacenamiento.js`, conforme a `data-model.md`. [FR-005]
- [x] T021 [US2] Implementar la creación y edición de solicitudes con al menos un producto activo, justificación, fecha requerida, centro de costo, prioridad y cálculo de `monto_estimado`. [FR-005]
- [x] T022 [US2] Implementar la numeración correlativa `SC-AAAA-NNNN` y las transiciones `borrador → enviada → aprobada | rechazada`, `aprobada → en_cotizacion → adjudicada` y `anulada` antes de `adjudicada`. [FR-005]
- [x] T023 [US2] Impedir enviar solicitudes sin productos y restringir al `solicitante` a ver y crear solo sus propias solicitudes. [FR-005, FR-018]
- [x] T024 [US2] Implementar aprobación y rechazo solo por `jefe_compras` o `admin_ti` distinto del solicitante; el rechazo exige motivo y se registra el aprobador con su fecha. [FR-006]
- [x] T025 [US2] Agregar pruebas unitarias de transiciones, autoaprobación bloqueada, rechazo sin motivo y solicitud vacía en `tests/unit/compras/solicitudes.test.js`.
- [x] T026 [US2] Agregar prueba de integración del flujo completo de US2 en `tests/integration/compras/us2-solicitudes.test.js`.

**Punto de control**: solicitudes de compra funcionales.

---

## Fase 5: Historia de Usuario 3 - Emitir órdenes de compra (P1)

**Objetivo**: transformar una solicitud aprobada en una OC, desde una cotización seleccionada o como compra directa bajo el umbral, con numeración, cálculos y anulación auditada.

**Prueba Independiente**: con una solicitud aprobada bajo el umbral, el comprador emite una OC `OC-AAAA-NNNN` con neto, IVA y total, y la solicitud pasa a `adjudicada`; sobre el umbral sin cotización seleccionada, el sistema exige cotizaciones.

- [x] T027 [US3] Crear el esquema de `ORDEN_COMPRA` y sus `lineas` en `src/compras/almacenamiento.js`, conforme a `data-model.md`. [FR-010]
- [x] T028 [US3] Implementar en `src/compras/ordenes-compra.js` la creación de OC desde una cotización `seleccionada`: mismo proveedor, copia de líneas y precios, solicitud `adjudicada` y proveedor en estado `aprobado`. [FR-010]
- [x] T029 [US3] Permitir la compra directa sin cotización solo si `monto_estimado < UMBRAL_COTIZACIONES` y el proveedor está `aprobado`; sobre el umbral, impedirla y exigir cotizaciones. [FR-010]
- [x] T030 [US3] Impedir más de una OC no anulada por solicitud y más de una OC por cotización. [FR-011]
- [x] T031 [US3] Implementar la numeración `OC-AAAA-NNNN` y el cálculo de subtotales, neto, IVA 19 % y total en CLP enteros. [FR-012]
- [x] T032 [US3] Implementar la anulación de una OC solo si no tiene recepciones, dejando registro de auditoría; la solicitud vuelve a `en_cotizacion` si tiene cotizaciones o a `aprobada` si no las tiene, y puede emitirse una nueva OC. [FR-011]
- [x] T033 [US3] Agregar pruebas unitarias de duplicidad de OC, compra directa bajo umbral, proveedor bloqueado y cálculos de montos en `tests/unit/compras/ordenes-compra.test.js` y `tests/unit/compras/reglas.test.js`.
- [x] T034 [US3] Agregar prueba de integración del flujo completo de US3 en `tests/integration/compras/us3-ordenes-compra.test.js`.

**Punto de control**: órdenes de compra funcionales.

---

## Fase 6: Historia de Usuario 4 - Registrar recepciones (Bodega) (P1)

**Objetivo**: registrar recepciones parciales o totales por línea, sin exceder lo pendiente y con separación entre compra y bodega.

**Prueba Independiente**: sobre una OC de 10 unidades se registran 6 aceptadas y la OC queda `recibida_parcial`; luego 4 más la dejan `recibida_total`; aceptar 5 con 4 pendientes se impide.

- [x] T035 [US4] Crear los esquemas de `RECEPCION` y `DETALLE_RECEPCION` en `src/compras/almacenamiento.js`, referenciando la línea de OC recibida. [FR-013]
- [x] T036 [US4] Implementar el registro de recepciones en `src/compras/recepciones.js` para OC en estado `emitida` o `recibida_parcial`, con cantidades aceptadas por línea que no superen lo pendiente. [FR-013]
- [x] T037 [US4] Exigir motivo cuando haya unidades rechazadas; si llega más de lo pedido, aceptar solo lo pendiente y registrar el excedente como rechazado con motivo `no_corresponde`. [FR-013]
- [x] T038 [US4] Impedir que el comprador que emitió la OC registre su recepción y restringir la operación al rol `bodega` (o `admin_ti` para auditoría), manteniendo la segregación de funciones. [FR-014]
- [x] T039 [US4] Actualizar automáticamente el estado de la OC a `recibida_parcial` o `recibida_total` según la suma de cantidades aceptadas por línea. [FR-013]
- [x] T040 [US4] Dejar disponibles las cantidades aceptadas de cada recepción para que Inventario actualice el stock, usando `id_producto`. [IR-002]
- [x] T041 [US4] Agregar pruebas unitarias de tope por línea, motivo de rechazo, segregación y actualización de estado en `tests/unit/compras/recepciones.test.js`.
- [x] T042 [US4] Agregar prueba de integración del flujo completo de US4 en `tests/integration/compras/us4-recepciones.test.js`.

**Punto de control**: recepciones funcionales.

---

## Fase 7: Historia de Usuario 5 - Panel de pendientes y alertas por rol (P1)

**Objetivo**: mostrar al ingresar solo los pendientes que corresponden al rol, las alertas de vencimiento y los indicadores del período.

**Prueba Independiente**: un jefe de compras con dos solicitudes enviadas y una factura que vence en 3 días abre el panel, ve esos tres pendientes con acceso directo y, al aprobar una solicitud, el contador baja sin recargar la página.

- [x] T043 [US5] Crear el componente de panel en `src/compras/panel.js` e integrarlo en la navegación principal de la aplicación. [FR-018]
- [x] T044 [US5] Mostrar pendientes por rol con contador y acceso directo: solicitudes por aprobar, OC sin recepción, recepciones por registrar y facturas por conciliar. El `solicitante` solo ve sus propias solicitudes y no los pendientes de otros usuarios. [FR-018]
- [x] T045 [US5] Mostrar una alerta destacada para facturas no aprobadas que vencen en 5 días o menos, con proveedor, folio y días restantes. [FR-017]
- [x] T046 [US5] Listar como pendientes de seguimiento las OC emitidas sin recepción registrada por más de 7 días, visibles para `bodega` y `comprador`. [FR-018]
- [x] T047 [US5] Calcular y mostrar los indicadores del período seleccionado (mes actual): monto comprometido en OC no anuladas, órdenes abiertas y facturas aprobadas para pago. [FR-018]
- [x] T048 [US5] Implementar el estado vacío del panel cuando no hay pendientes y actualizar los contadores sin recargar la página tras una acción. [FR-018]
- [x] T049 [US5] Agregar acciones rápidas por rol para crear solicitud, OC, recepción o registrar factura según corresponda. [FR-018]
- [x] T050 [US5] Agregar prueba de integración de US5 que cubra los seis escenarios y SC-005 en `tests/integration/compras/us5-panel.test.js`.

**Punto de control**: panel de compras funcional.

---

## Fase 8: Historia de Usuario 6 - Cotizaciones y comparativa side-by-side (P1)

**Objetivo**: registrar cotizaciones por proveedor, compararlas lado a lado y seleccionar una de forma justificada, aplicando el umbral y el vencimiento.

**Prueba Independiente**: sobre una solicitud aprobada, registrar tres cotizaciones de proveedores distintos, verlas comparadas lado a lado y seleccionar una, dejando las demás descartadas con motivo.

- [x] T051 [US6] Crear el esquema de `COTIZACION_PROVEEDOR` con sus `lineas` y la restricción de una cotización por solicitud y proveedor; permitir el registro solo para solicitudes `aprobada` o `en_cotizacion`, moviendo la solicitud a `en_cotizacion` con la primera cotización. [FR-007]
- [x] T052 [US6] Implementar el registro y actualización de cotizaciones en `src/compras/cotizaciones.js` y la vista de comparación side-by-side con precio, plazo, condición de pago y evaluación promedio del proveedor. [FR-007]
- [x] T053 [US6] Marcar cotizaciones como `vencidas` al superar `fecha_validez` sin selección, exigir `motivo_descarte` al descartar y permitir una sola cotización `seleccionada` por solicitud. [FR-009]
- [x] T054 [US6] Exigir al menos 3 cotizaciones o una `justificacion_proveedor_unico` no vacía para seleccionar una cotización cuando `monto_estimado` sea igual o superior a `UMBRAL_COTIZACIONES`. [FR-008]
- [x] T055 [US6] Agregar pruebas unitarias de cotización duplicada, vencida, descarte sin motivo, umbral y única seleccionada en `tests/unit/compras/cotizaciones.test.js`.
- [x] T056 [US6] Agregar prueba de integración del flujo completo de US6 en `tests/integration/compras/us6-cotizaciones.test.js`.

**Punto de control**: cotizaciones y comparativa funcionales.

---

## Fase 9: Historia de Usuario 7 - Registrar y conciliar facturas (P2)

**Objetivo**: registrar facturas y notas de crédito contra OC con recepciones, conciliar a tres vías y aprobar para pago solo lo conciliado y dentro de plazo.

**Prueba Independiente**: sobre una OC recibida de 10.000 CLP neto, una factura por el mismo valor queda `conciliada`; una por 15.000 CLP queda `con_discrepancia` y no puede aprobarse para pago.

- [x] T057 [US7] Crear el esquema `FACTURA_PROVEEDOR` en `src/compras/almacenamiento.js` con `tipo_documento`, folio único por proveedor y tipo de documento, y validación de que la OC tenga al menos una recepción. [FR-015]
- [x] T058 [US7] Implementar el registro manual de facturas y notas de crédito en `src/compras/facturas.js`, con neto, IVA y total tal como vienen en el documento. [FR-015]
- [x] T059 [US7] Implementar la conciliación a tres vías en `src/compras/reglas.js`: comparar el neto de la factura contra el valor recibido de la OC menos devoluciones y menos el neto de facturas anteriores no rechazadas; las notas de crédito restan. Clasificar como `conciliada` o `con_discrepancia` según `TOLERANCIA_CONCILIACION`. [FR-016]
- [x] T060 [US7] Calcular `fecha_vencimiento` desde la fecha de recepción de la factura y la condición de pago de la OC, y alertar las facturas no aprobadas que vencen en 5 días o menos. [FR-017]
- [x] T061 [US7] Impedir folios duplicados por proveedor y tipo de documento, impedir aprobar facturas `con_discrepancia` y permitir pasar a `aprobada_pago` solo una factura `conciliada`, con rol `jefe_compras`. [FR-015, FR-016]
- [x] T062 [US7] Emitir una alerta de posible fraude al aprobar una factura de un proveedor cuya cuenta bancaria cambió hace menos de 30 días. [FR-004]
- [x] T063 [US7] Dejar disponibles las facturas `aprobada_pago` para Contabilidad como cuentas por pagar. [IR-003]
- [x] T064 [US7] Agregar pruebas unitarias de conciliación con y sin discrepancia, tolerancia, nota de crédito, folio duplicado y bloqueo de aprobación en `tests/unit/compras/facturas.test.js`.
- [x] T065 [US7] Agregar prueba de integración del flujo completo de US7 en `tests/integration/compras/us7-facturas.test.js`.

**Punto de control**: conciliación de facturas funcional.

---

## Fase 10: Historia de Usuario 8 - Catálogo de productos por proveedor (P2)

**Objetivo**: mantener el catálogo de productos ofrecidos por cada proveedor, con precio de referencia, plazo y control de desactualización.

**Prueba Independiente**: agregar un producto al catálogo de un proveedor con precio y plazo, buscarlo, actualizar el precio y ver marcada como desactualizada una referencia con más de 90 días.

- [x] T066 [US8] Crear el esquema de `PROVEEDOR_PRODUCTO` en `src/compras/almacenamiento.js`: relación única proveedor/producto, precio de referencia, plazo de entrega y fecha de actualización. [FR-023]
- [x] T067 [US8] Implementar en `src/compras/catalogo.js` el alta, edición, búsqueda y baja del catálogo, impidiendo duplicar el par proveedor-producto y ocultando productos desactivados para nuevas líneas. [FR-023]
- [x] T068 [US8] Marcar como desactualizados los precios con más de 90 días y sugerir el menor precio de referencia vigente al crear líneas de solicitud. [FR-023]
- [x] T069 [US8] Agregar pruebas unitarias y de integración de catálogo en `tests/unit/compras/catalogo.test.js` y `tests/integration/compras/us8-catalogo.test.js`.

**Punto de control**: catálogo proveedor-producto funcional.

---

## Fase 11: Historia de Usuario 9 - Evaluación de desempeño de proveedores (P2)

**Objetivo**: evaluar el desempeño de cada proveedor por orden recibida y exponer el promedio en la ficha y en la comparativa de cotizaciones.

**Prueba Independiente**: sobre una OC recibida con 6 días de atraso, registrar una evaluación, obtener `nota_plazo = 3` y ver el promedio en la ficha del proveedor.

- [x] T070 [US9] Crear el esquema de `EVALUACION_PROVEEDOR` en `src/compras/almacenamiento.js`, con puntajes, comentario y relación a la OC y al proveedor. [FR-019]
- [x] T071 [US9] Implementar en `src/compras/evaluaciones.js` el registro de una única evaluación por OC en estado `recibida_total` o `cerrada`. [FR-019]
- [x] T072 [US9] Calcular `nota_plazo` por días de atraso (0 días → 5; 1-3 → 4; 4-7 → 3; 8-14 → 2; más de 14 → 1) y mostrar el promedio en la comparación de cotizaciones y en la ficha del proveedor. [FR-019]
- [x] T073 [US9] Agregar pruebas unitarias y de integración de evaluación en `tests/unit/compras/evaluaciones.test.js` y `tests/integration/compras/us9-evaluaciones.test.js`.

**Punto de control**: evaluación de proveedores funcional.

---

## Fase 12: Historia de Usuario 10 - Exportación de reportes en CSV (P3)

**Objetivo**: exportar los listados y reportes visibles a CSV, respetando filtros, permisos del rol y escapado correcto.

**Prueba Independiente**: un jefe de compras exporta el listado de órdenes del período y obtiene un CSV con encabezados y una fila por OC, respetando los filtros y el rol activo.

- [x] T074 [US10] Implementar en `src/compras/exportacion.js` el generador CSV sin dependencias externas, con encabezados, escapado de comas, comillas y saltos de línea. [FR-024]
- [x] T075 [US10] Agregar acciones de exportación a los listados de proveedores, solicitudes, OC, recepciones y facturas, respetando el filtro vigente. [FR-024]
- [x] T076 [US10] Restringir la exportación según rol (el `solicitante` solo exporta sus solicitudes) y manejar listados vacíos sin error. [FR-024]
- [x] T077 [US10] Agregar pruebas unitarias y de integración de exportación CSV en `tests/unit/compras/exportacion.test.js` y `tests/integration/compras/us10-exportacion.test.js`. [SC-008]

**Punto de control**: exportación CSV funcional.

---

## Fase 13: Historia de Usuario 11 - Registrar devoluciones y notas de crédito (P2)

**Objetivo**: descontar del saldo recibido y facturado lo que no cumple, con documentos trazables y segregación de funciones.

**Prueba Independiente**: sobre una OC `recibida_total` facturada por 100.000 CLP neto, una devolución de 20.000 CLP por defectuosos baja el saldo pendiente a 80.000 CLP y una factura posterior por ese monto queda `conciliada`.

- [x] T078 [US11] Crear el esquema de `DEVOLUCION` y su detalle en `src/compras/devoluciones.js` y `erp_compras:devoluciones`, con correlativo `DEV-AAAA-NNNN`, relación a la OC y a la línea de OC. [FR-015]
- [x] T079 [US11] Implementar el registro de devoluciones con línea, cantidad y motivo; descontar la cantidad del saldo recibido y no permitir devolver más de lo aceptado. [FR-015]
- [x] T080 [US11] Implementar notas de crédito contra una factura ya registrada: deben asociarse a OC y factura, no pueden superar el monto facturado y su folio es único por proveedor y tipo de documento. [FR-015]
- [x] T081 [US11] Cuando la devolución o nota de crédito reduzca el saldo pendiente a cero, cerrar la OC y dar por saldada la factura sin pasarla a `aprobada_pago` por el monto descontado. [FR-016]
- [x] T082 [US11] Si quien registró la recepción intenta registrar la devolución, exigir la aprobación de un `jefe_compras` o `admin_ti` distinto. [FR-014]
- [x] T083 [US11] Agregar pruebas unitarias de devoluciones, notas de crédito, topes, duplicidad, cierre de OC y segregación en `tests/unit/compras/devoluciones.test.js`.
- [x] T084 [US11] Agregar prueba de integración del flujo completo de US11 en `tests/integration/compras/us11-devoluciones.test.js`.

**Punto de control**: devoluciones y notas de crédito funcionales; ciclo de P2 cerrado.

---

## Fase 14: Pulido y Aspectos Transversales

**Propósito**: integración final, parámetros, rendimiento, casos límite y documentación.

- [x] T085 Integrar todas las pantallas en la navegación y aplicar controles de interfaz basados en rol en todo el módulo, respetando las restricciones de `spec.md`.
- [x] T086 Parametrizar `UMBRAL_COTIZACIONES` y `TOLERANCIA_CONCILIACION` en configuración con los valores acordados: 1.000.000 CLP neto y 1 % del neto. [FR-021, FR-022]
- [x] T087 Ejecutar y completar las pruebas unitarias de todas las reglas de la sección 5 de `data-model.md`. [SC-007]
- [x] T088 Ejecutar las pruebas de integración de los flujos P1 (US1 a US6) y P2 (US7 a US9 y US11), además de la exportación de US10.
- [x] T089 Verificar rendimiento con hasta 500 registros por colección y los tiempos de SC-001 (solicitud de 3 productos en menos de 2 minutos), SC-006 y SC-008. [SC-001, SC-006, SC-008]
- [x] T090 Ejecutar la demostración de extremo a extremo de SC-002 en menos de 5 minutos: solicitud, 3 cotizaciones, OC, recepción y factura conciliada. [SC-002]
- [x] T091 Validar los casos límite de `spec.md`: anulación de OC con cotización seleccionada, nota de crédito, sobreentrega, producto desactivado con solicitudes abiertas, proveedor bloqueado con OC abiertas y `localStorage` lleno o deshabilitado.
- [x] T092 Actualizar el README con instrucciones de ejecución, roles, datos semilla y alcance del módulo de compras.

---

## Dependencias y Orden de Ejecución

### Dependencias de Fases

- **Configuración (Fase 1)**: sin dependencias; T001 es bloqueante.
- **Fundacional (Fase 2)**: depende de Fase 1 y bloquea todas las historias.
- **US1 (Fase 3)**: depende de Fundacional.
- **US2 (Fase 4)**: depende de Fundacional; no depende de US1.
- **US3 (Fase 5)**: depende de US1 (proveedor aprobado) y US2 (solicitud aprobada); la emisión desde cotización requiere US6.
- **US4 (Fase 6)**: depende de US3.
- **US5 (Fase 7)**: depende de US2, US3, US4 y US7 para mostrar todos sus pendientes; puede desarrollarse con datos semilla antes de US7.
- **US6 (Fase 8)**: depende de US1 y US2; habilita la emisión de OC desde cotización en US3.
- **US7 (Fase 9)**: depende de US4.
- **US8 (Fase 10)**: depende de US1 y de los productos maestros; puede iniciarse tras Fundacional.
- **US9 (Fase 11)**: depende de US4 y sus evaluaciones se consumen en US6 y US1.
- **US10 (Fase 12)**: depende de los listados de US1, US2, US3, US4, US5 y US7.
- **US11 (Fase 13)**: depende de US7 y de la recepción de US4.
- **Pulido (Fase 14)**: al finalizar todas las historias.

### Dependencias Críticas

- La plantilla base debe tener `src/` operativo y sus pruebas deben pasar antes de T002.
- Una solicitud sin aprobación no puede generar OC; una OC sin recepciones no puede recibir facturas; una factura con discrepancia no puede aprobarse para pago.
- Una cotización no puede registrarse sin solicitud aprobada ni convertirse en OC sin estar seleccionada.
- La segregación de funciones debe respetarse en solicitudes, OC, recepciones y devoluciones.

---

## Estrategia de Implementación

### MVP Primero (Historias P1)

1. Configuración y verificación de la plantilla base.
2. Fundacional: configuración, reglas, almacenamiento, semilla y roles.
3. US1 (Proveedores).
4. US2 (Solicitudes).
5. US6 (Cotizaciones y comparativa).
6. US3 (Órdenes de compra).
7. US4 (Recepciones).
8. US5 (Panel).
9. Demostración del ciclo de extremo a extremo.

### Entrega Incremental

Agregar primero US7 (facturas), luego US8 (catálogo), US9 (evaluación) y US11 (devoluciones y notas de crédito), y finalmente US10 (exportación CSV), manteniendo siempre el ciclo completo funcionando.

---

## Trazabilidad con Requisitos

### Requisitos Funcionales

| Requisito | Tareas |
|---|---|
| FR-001 | T011, T012, T013, T014, T015 |
| FR-002 | T014 |
| FR-003 | T016 |
| FR-004 | T017, T062 |
| FR-005 | T020, T021, T022, T023 |
| FR-006 | T024 |
| FR-007 | T051, T052 |
| FR-008 | T054 |
| FR-009 | T053 |
| FR-010 | T015, T028, T029 |
| FR-011 | T030, T032 |
| FR-012 | T005, T031 |
| FR-013 | T036, T037, T039 |
| FR-014 | T038, T082 |
| FR-015 | T057, T058, T061, T078, T079, T080 |
| FR-016 | T059, T081 |
| FR-017 | T045, T060 |
| FR-018 | T043, T044, T046, T047, T048, T049 |
| FR-019 | T072 |
| FR-020 | T008 |
| FR-021 | T086 |
| FR-022 | T086 |
| FR-023 | T066, T067, T068 |
| FR-024 | T074, T075, T076 |

### Requisitos de Integración

| Requisito | Tareas |
|---|---|
| IR-001 | T009 |
| IR-002 | T040 |
| IR-003 | T063 |

### Criterios de Éxito

| Criterio | Tareas |
|---|---|
| SC-001 | T089 |
| SC-002 | T090 |
| SC-003 | T054, T030 |
| SC-004 | T041 |
| SC-005 | T045, T050 |
| SC-006 | T089 |
| SC-007 | T087 |
| SC-008 | T077, T089 |

### Historias de Usuario

| Historia | Prioridad | Tareas |
|---|---|---|
| US1 - Gestionar proveedores | P1 | T011-T019 |
| US2 - Crear y aprobar solicitudes | P1 | T020-T026 |
| US3 - Emitir órdenes de compra | P1 | T027-T034 |
| US4 - Registrar recepciones | P1 | T035-T042 |
| US5 - Panel de pendientes y alertas | P1 | T043-T050 |
| US6 - Cotizaciones y comparativa side-by-side | P1 | T051-T056 |
| US7 - Registrar y conciliar facturas | P2 | T057-T065 |
| US8 - Catálogo de productos por proveedor | P2 | T066-T069 |
| US9 - Evaluación de desempeño de proveedores | P2 | T070-T073 |
| US10 - Exportación de reportes en CSV | P3 | T074-T077 |
| US11 - Registrar devoluciones y notas de crédito | P2 | T078-T084 |
