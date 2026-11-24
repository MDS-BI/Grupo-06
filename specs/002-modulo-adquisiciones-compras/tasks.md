# Tasks: Módulo Adquisiciones y Compras

**Entrada**: [spec.md](spec.md) (fuente de historias y requisitos), [plan.md](plan.md) y [data-model.md](data-model.md)

**Prerrequisitos**: plan.md, spec.md y data-model.md aprobados; módulo base `001-erp-base-module` operativo.

**Pruebas**: obligatorias según la constitución del proyecto y el plan. Cada regla de la sección 5 de `data-model.md` debe tener prueba unitaria, y cada historia de usuario debe tener al menos una prueba de integración de su flujo.

**Organización**: las tareas siguen el orden y la numeración de las historias de `spec.md`: **US1, US2, US3, US4, US5, US6, US7, US8, US9, US10, US11 y US12**. Cada historia tiene su propia fase y no se mezclan responsabilidades entre ellas.

> **Alineación con spec.md**: las cotizaciones se separan en **US6** (registro y comparativa side-by-side), la emisión de OC queda en **US3**, el catálogo en **US8**, la evaluación de proveedores en **US9** y la exportación CSV en **US10**. Todas fueron creadas y ordenadas en `spec.md`; ya no existen tareas de "soporte" sin historia.
>
> **Roles**: se usan los roles definidos en `spec.md`: `solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`. Desde el 2026-11-23, `admin_ti` es administrador del sistema y no opera el ciclo de compras; la visibilidad de cada vista sigue la matriz de FR-033 (fases 16 a 19).
>
> **Extensión necesaria para US11**: para cumplir el documento de devolución con correlativo `DEV-AAAA-NNNN` se agrega `src/compras/devoluciones.js` y la colección `erp_compras:devoluciones`, detallada en `plan.md`, según los escenarios de US11. Las notas de crédito se registran como `FACTURA_PROVEEDOR` con `tipo_documento = nota_credito`, según `data-model.md`.
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
- [x] T002 Crear la estructura del módulo en `src/compras/`: `reglas.js`, `almacenamiento.js`, `proveedores.js`, `solicitudes.js`, `cotizaciones.js`, `ordenes-compra.js`, `recepciones.js`, `facturas.js`, `devoluciones.js`, `catalogo.js`, `evaluaciones.js`, `panel.js`, `vista.js`, `trazabilidad.js`, `exportacion.js` y `semilla.json`, según el árbol de `plan.md`.
- [x] T003 [P] Crear la estructura de pruebas en `tests/unit/compras/` y `tests/integration/compras/`.

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: infraestructura común que debe existir antes de cualquier historia.

- [x] T004 Verificar que `src/module-config.js` conserva `userConfig = null` y que `COMPRAS_PARAMETROS`/`COMPRAS_CONFIG` quedan solo como referencia histórica, sin activar el enfoque de Entidad/Documento del template descartado por FR-032; documentar la decisión en `plan.md`.
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
- [x] T017 [US1] Enmascarar el RUT de personas naturales y el número de cuenta bancaria para roles distintos de `admin_ti` y `jefe_compras`; `admin_ti` y `jefe_compras` ven los datos sin enmascarar, pero solo `admin_ti` puede editarlos, actualizando `fecha_cambio_cuenta` al modificarlos. [FR-004]
- [x] T018 [US1] Agregar pruebas unitarias de RUT, condición de pago, enmascaramiento y eliminación/bloqueo en `tests/unit/compras/reglas.test.js` y `tests/integration/compras/proveedores.test.js`.
- [x] T019 [US1] Agregar prueba de integración del flujo completo de US1 en `tests/integration/compras/proveedores.test.js`.
- [x] T093 [US1] [FR-025] Verificar como regresión que `jefe_compras` ve el RUT de personas naturales y el número de cuenta sin enmascarar y que la edición bancaria sigue siendo exclusiva de `admin_ti`, sin duplicar la implementación de T017; comprobarlo en `tests/unit/compras/reglas.test.js` y `tests/integration/compras/proveedores.test.js`.
- [x] T094 [US1] [FR-025] En `src/compras/reglas.js`, enmascarar cuentas de 4 dígitos o menos conservando solo los últimos 2 dígitos; agregar los casos en `tests/unit/compras/reglas.test.js`.
- [x] T095 [US1] [FR-025] Mostrar "No registrado" cuando el proveedor no tiene número de cuenta, sin máscara ni valor ficticio, en `src/compras/proveedores.js` y `src/compras/vista.js`; cubrirlo en `tests/integration/compras/proveedores.test.js` y `tests/integration/compras/vista.test.js`.
- [x] T096 [US1] [SC-009] Agregar pruebas de no exposición de RUT y cuenta en listados, ficha, panel, comparativa y CSV para roles sin permiso, y de visibilidad sin máscara para `admin_ti` y `jefe_compras`, en `tests/integration/compras/proveedores.test.js`, `tests/integration/compras/catalogo-panel.test.js`, `tests/integration/compras/casos-limite.test.js` y `tests/unit/compras/reglas.test.js`.

**Punto de control**: gestión de proveedores funcional.

---

## Fase 4: Historia de Usuario 2 - Crear y aprobar solicitudes de compra (P1)

**Objetivo**: crear solicitudes con líneas, enviarlas y aprobarlas o rechazarlas con segregación de funciones.

**Prueba Independiente**: un solicitante crea una solicitud de dos productos y la envía; el jefe de compras la aprueba y queda `aprobada` con número `SC-AAAA-NNNN`; no puede aprobar su propia solicitud.

- [x] T020 [US2] Crear los esquemas de `SOLICITUD_COMPRA` y sus `lineas` de detalle en `src/compras/almacenamiento.js`, conforme a `data-model.md`. [FR-005]
- [x] T021 [US2] Implementar la creación y edición de solicitudes con al menos un producto activo, justificación, fecha requerida, centro de costo, prioridad y cálculo de `monto_estimado`. [FR-005]
- [x] T022 [US2] Implementar la numeración correlativa `SC-AAAA-NNNN` y las transiciones `borrador → enviada → aprobada | rechazada`, `aprobada → en_cotizacion → adjudicada` y `anulada` antes de `adjudicada`. [FR-005]
- [x] T023 [US2] Impedir enviar solicitudes sin productos y restringir al `solicitante` a ver y crear solo sus propias solicitudes. [FR-005, FR-018]
- [x] T024 [US2] Implementar aprobación y rechazo solo por `jefe_compras` o `admin_ti` distinto del solicitante; el rechazo exige motivo y se registra el aprobador con su fecha. [FR-006] **Reemplazada por T135 (rediseño 2026-11-23).**
- [x] T025 [US2] Agregar pruebas de transiciones, autoaprobación bloqueada, rechazo sin motivo y solicitud vacía en `tests/integration/compras/flujo-compras.test.js`.
- [x] T026 [US2] Agregar prueba de integración del flujo completo de US2 en `tests/integration/compras/flujo-compras.test.js`.

**Punto de control**: solicitudes de compra funcionales.

---

## Fase 5: Historia de Usuario 3 - Emitir órdenes de compra (P1)

**Objetivo**: transformar una solicitud aprobada en una OC, desde una cotización seleccionada o como compra directa bajo el umbral, con numeración, cálculos y anulación auditada.

**Prueba Independiente**: con una solicitud aprobada bajo el umbral, el comprador emite una OC `OC-AAAA-NNNN` con neto, IVA y total, y la solicitud pasa a `adjudicada`; sobre el umbral sin cotización seleccionada, el sistema exige cotizaciones.

- [x] T027 [US3] Crear el esquema de `ORDEN_COMPRA` y sus `lineas` en `src/compras/almacenamiento.js`, conforme a `data-model.md`. [FR-010]
- [x] T028 [US3] Implementar en `src/compras/ordenes-compra.js` la creación de OC desde una cotización `seleccionada`: mismo proveedor, copia de líneas y precios, solicitud `adjudicada` y proveedor en estado `aprobado`. Requiere US6 (T051-T056) para la emisión desde cotización; la compra directa de T029 puede ejecutarse antes. [FR-010]
- [x] T029 [US3] Permitir la compra directa sin cotización solo si `monto_estimado < UMBRAL_COTIZACIONES` y el proveedor está `aprobado`; sobre el umbral, impedirla y exigir cotizaciones. [FR-010]
- [x] T030 [US3] Impedir más de una OC no anulada por solicitud y más de una OC por cotización. [FR-011]
- [x] T031 [US3] Implementar la numeración `OC-AAAA-NNNN` y el cálculo de subtotales, neto, IVA 19 % y total en CLP enteros. [FR-012]
- [x] T032 [US3] Implementar la anulación de una OC solo si no tiene recepciones, dejando registro de auditoría; la solicitud vuelve a `en_cotizacion` si tiene cotizaciones o a `aprobada` si no las tiene, y puede emitirse una nueva OC. [FR-011]
- [x] T033 [US3] Agregar pruebas de duplicidad de OC, compra directa bajo umbral, proveedor bloqueado y cálculos de montos en `tests/integration/compras/casos-limite.test.js` y `tests/unit/compras/reglas.test.js`.
- [x] T034 [US3] Agregar prueba de integración del flujo completo de US3 en `tests/integration/compras/casos-limite.test.js`.

**Punto de control**: órdenes de compra funcionales.

---

## Fase 6: Historia de Usuario 4 - Registrar recepciones (Bodega) (P1)

**Objetivo**: registrar recepciones parciales o totales por línea, sin exceder lo pendiente y con separación entre compra y bodega.

**Prueba Independiente**: sobre una OC de 10 unidades se registran 6 aceptadas y la OC queda `recibida_parcial`; luego 4 más la dejan `recibida_total`; aceptar 5 con 4 pendientes se impide.

- [x] T035 [US4] Crear los esquemas de `RECEPCION` y `DETALLE_RECEPCION` en `src/compras/almacenamiento.js`, referenciando la línea de OC recibida. [FR-013]
- [x] T036 [US4] Implementar el registro de recepciones en `src/compras/recepciones.js` para OC en estado `emitida` o `recibida_parcial`, con cantidades aceptadas por línea que no superen lo pendiente. [FR-013]
- [x] T037 [US4] Exigir motivo cuando haya unidades rechazadas; si llega más de lo pedido, aceptar solo lo pendiente y registrar el excedente como rechazado con motivo `no_corresponde`. [FR-013]
- [x] T038 [US4] Impedir que el comprador que emitió la OC registre su recepción y restringir la operación al rol `bodega` (o `admin_ti` para auditoría), manteniendo la segregación de funciones. [FR-014] **Reemplazada por T136 (rediseño 2026-11-23).**
- [x] T039 [US4] Actualizar automáticamente el estado de la OC a `recibida_parcial` o `recibida_total` según la suma de cantidades aceptadas por línea. [FR-013]
- [x] T040 [US4] Dejar disponibles las cantidades aceptadas de cada recepción para que Inventario actualice el stock, usando `id_producto`. [IR-002]
- [x] T041 [US4] Agregar pruebas de tope por línea, motivo de rechazo, segregación y actualización de estado en `tests/integration/compras/casos-limite.test.js`.
- [x] T042 [US4] Agregar prueba de integración del flujo completo de US4 en `tests/integration/compras/flujo-compras.test.js` y `tests/integration/compras/casos-limite.test.js`.
- [x] T097 [US4] [FR-026] Registrar unidades dañadas al recibir como rechazadas con motivo `danado`, sin contarlas como recibidas ni incluirlas en el valor a facturar y dejando la cantidad pendiente en la OC para reposición, en `src/compras/recepciones.js`; agregar pruebas en `tests/integration/compras/casos-limite.test.js`.
- [x] T098 [US4] [SC-011] Agregar pruebas de entrega totalmente dañada y de exclusión del valor a facturar en `tests/integration/compras/casos-limite.test.js` y `tests/integration/compras/flujo-compras.test.js`.

**Punto de control**: recepciones funcionales.

---

## Fase 7: Historia de Usuario 5 - Panel de pendientes y alertas por rol (P1)

**Objetivo**: mostrar al ingresar solo los pendientes que corresponden al rol, las alertas de vencimiento y los indicadores del período.

**Prueba Independiente**: un jefe de compras con dos solicitudes enviadas y una factura que vence en 3 días abre el panel, ve esos tres pendientes con acceso directo y, al aprobar una solicitud, el contador baja sin recargar la página.

- [x] T043 [US5] Crear el componente de panel en `src/compras/panel.js` e integrarlo en la navegación principal de la aplicación. [FR-018]
- [x] T044 [US5] Mostrar pendientes por rol con contador y acceso directo: solicitudes por aprobar, OC sin recepción, recepciones por registrar y facturas por conciliar. El `solicitante` solo ve sus propias solicitudes y no los pendientes de otros usuarios. [FR-018] **Reemplazada por T137 (rediseño 2026-11-23).**
- [x] T045 [US5] Mostrar una alerta destacada para facturas no aprobadas que vencen en 5 días o menos, con proveedor, folio y días restantes. [FR-017]
- [x] T046 [US5] Listar como pendientes de seguimiento las OC emitidas sin recepción registrada por más de 7 días, visibles para `bodega` y `comprador`. [FR-018] **Reemplazada por T137 (rediseño 2026-11-23).**
- [x] T047 [US5] Calcular y mostrar los indicadores del período seleccionado (mes actual): monto comprometido en OC no anuladas, órdenes abiertas y facturas aprobadas para pago. [FR-018]
- [x] T048 [US5] Implementar el estado vacío del panel cuando no hay pendientes y actualizar los contadores sin recargar la página tras una acción. [FR-018]
- [x] T049 [US5] Agregar acciones rápidas por rol para crear solicitud, OC, recepción o registrar factura según corresponda. [FR-018] **Reemplazada por T138 (rediseño 2026-11-23).**
- [x] T050 [US5] Agregar prueba de integración de US5 que cubra los seis escenarios y SC-005 en `tests/integration/compras/catalogo-panel.test.js` y `tests/integration/compras/vista.test.js`.

**Punto de control**: panel de compras funcional.

---

## Fase 8: Historia de Usuario 6 - Cotizaciones y comparativa side-by-side (P1)

**Objetivo**: registrar cotizaciones por proveedor, compararlas lado a lado y seleccionar una de forma justificada, aplicando el umbral y el vencimiento.

**Prueba Independiente**: sobre una solicitud aprobada, registrar tres cotizaciones de proveedores distintos, verlas comparadas lado a lado y seleccionar una, dejando las demás descartadas con motivo.

- [x] T051 [US6] Crear el esquema de `COTIZACION_PROVEEDOR` con sus `lineas` y la restricción de una cotización por solicitud y proveedor; permitir el registro solo para solicitudes `aprobada` o `en_cotizacion`, moviendo la solicitud a `en_cotizacion` con la primera cotización. [FR-007]
- [x] T052 [US6] Implementar el registro y actualización de cotizaciones en `src/compras/cotizaciones.js` y la vista de comparación side-by-side con precio, plazo, condición de pago y evaluación promedio del proveedor. [FR-007]
- [x] T053 [US6] Marcar cotizaciones como `vencidas` al superar `fecha_validez` sin selección, exigir `motivo_descarte` al descartar y permitir una sola cotización `seleccionada` por solicitud. [FR-009]
- [x] T054 [US6] Exigir al menos 3 cotizaciones o una `justificacion_proveedor_unico` no vacía para seleccionar una cotización cuando `monto_estimado` sea igual o superior a `UMBRAL_COTIZACIONES`. [FR-008]
- [x] T055 [US6] Agregar pruebas de cotización duplicada, vencida, descarte sin motivo, umbral y única seleccionada en `tests/integration/compras/flujo-compras.test.js`.
- [x] T056 [US6] Agregar prueba de integración del flujo completo de US6 en `tests/integration/compras/flujo-compras.test.js`.

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
- [x] T064 [US7] Agregar pruebas de conciliación con y sin discrepancia, tolerancia, nota de crédito, folio duplicado y bloqueo de aprobación en `tests/integration/compras/casos-limite.test.js` y `tests/unit/compras/reglas.test.js`.
- [x] T065 [US7] Agregar prueba de integración del flujo completo de US7 en `tests/integration/compras/casos-limite.test.js` y `tests/integration/compras/flujo-compras.test.js`.

**Punto de control**: conciliación de facturas funcional.

---

## Fase 10: Historia de Usuario 8 - Catálogo de productos por proveedor (P2)

**Objetivo**: mantener el catálogo de productos ofrecidos por cada proveedor, con precio de referencia, plazo y control de desactualización.

**Prueba Independiente**: agregar un producto al catálogo de un proveedor con precio y plazo, buscarlo, actualizar el precio y ver marcada como desactualizada una referencia con más de 90 días.

- [x] T066 [US8] Crear el esquema de `PROVEEDOR_PRODUCTO` en `src/compras/almacenamiento.js`: relación única proveedor/producto, precio de referencia, plazo de entrega y fecha de actualización. [FR-023]
- [x] T067 [US8] Implementar en `src/compras/catalogo.js` el alta, edición, búsqueda y baja del catálogo, impidiendo duplicar el par proveedor-producto y ocultando productos desactivados para nuevas líneas. [FR-023]
- [x] T068 [US8] Marcar como desactualizados los precios con más de 90 días y sugerir el menor precio de referencia vigente al crear líneas de solicitud. [FR-023]
- [x] T069 [US8] Agregar pruebas de catálogo en `tests/integration/compras/catalogo-panel.test.js`.

**Punto de control**: catálogo proveedor-producto funcional.

---

## Fase 11: Historia de Usuario 9 - Evaluación de desempeño de proveedores (P2)

**Objetivo**: evaluar el desempeño de cada proveedor por orden recibida y exponer el promedio en la ficha y en la comparativa de cotizaciones.

**Prueba Independiente**: sobre una OC recibida con 6 días de atraso, registrar una evaluación, obtener `nota_plazo = 3` y ver el promedio en la ficha del proveedor.

- [x] T070 [US9] Crear el esquema de `EVALUACION_PROVEEDOR` en `src/compras/almacenamiento.js`, con puntajes, comentario y relación a la OC y al proveedor. [FR-019]
- [x] T071 [US9] Implementar en `src/compras/evaluaciones.js` el registro de una única evaluación por OC en estado `recibida_total` o `cerrada`. [FR-019]
- [x] T072 [US9] Calcular `nota_plazo` por días de atraso (0 días → 5; 1-3 → 4; 4-7 → 3; 8-14 → 2; más de 14 → 1) y mostrar el promedio en la comparación de cotizaciones y en la ficha del proveedor. [FR-019]
- [x] T073 [US9] Agregar pruebas de evaluación en `tests/integration/compras/flujo-compras.test.js`.

**Punto de control**: evaluación de proveedores funcional.

---

## Fase 12: Historia de Usuario 10 - Exportación de reportes en CSV (P3)

**Objetivo**: exportar los listados y reportes visibles a CSV, respetando filtros, permisos del rol y escapado correcto.

**Prueba Independiente**: un jefe de compras exporta el listado de órdenes del período y obtiene un CSV con encabezados y una fila por OC, respetando los filtros y el rol activo.

- [x] T074 [US10] Implementar en `src/compras/exportacion.js` el generador CSV sin dependencias externas, con encabezados, escapado de comas, comillas y saltos de línea. [FR-024]
- [x] T075 [US10] Agregar acciones de exportación a los listados de proveedores, solicitudes, OC, recepciones y facturas, respetando el filtro vigente. [FR-024]
- [x] T076 [US10] Restringir la exportación según rol (el `solicitante` solo exporta sus solicitudes) y manejar listados vacíos sin error. [FR-024]
- [x] T077 [US10] Agregar pruebas unitarias y de integración de exportación CSV en `tests/unit/compras/exportacion.test.js` y `tests/integration/compras/casos-limite.test.js`. [SC-008]
- [x] T099 [US10] [SC-010] Agregar prueba con datos acentuados que verifique que el CSV con BOM UTF-8 y separador `;` se abre sin caracteres corruptos en `tests/unit/compras/exportacion.test.js`.

**Punto de control**: exportación CSV funcional.

---

## Fase 13: Historia de Usuario 11 - Registrar devoluciones y notas de crédito (P2)

**Objetivo**: descontar del saldo recibido y facturado lo que no cumple, con documentos trazables y segregación de funciones.

**Prueba Independiente**: sobre una OC `recibida_total` facturada por 100.000 CLP neto, una devolución de 20.000 CLP por defectuosos baja el saldo pendiente a 80.000 CLP y una factura posterior por ese monto queda `conciliada`.

- [x] T078 [US11] Crear el esquema de `DEVOLUCION` y su detalle en `src/compras/devoluciones.js` y `erp_compras:devoluciones`, con correlativo `DEV-AAAA-NNNN`, relación a la OC y a la línea de OC. [FR-031]
- [x] T079 [US11] Implementar el registro de devoluciones con línea, cantidad y motivo; descontar la cantidad del saldo recibido y no permitir devolver más de lo aceptado. [FR-031]
- [x] T080 [US11] Implementar notas de crédito contra una factura ya registrada: deben asociarse a OC y factura, no pueden superar el monto facturado y su folio es único por proveedor y tipo de documento. [FR-031, FR-015]
- [x] T081 [US11] Cuando la devolución o nota de crédito reduzca el saldo pendiente a cero, cerrar la OC y dar por saldada la factura sin pasarla a `aprobada_pago` por el monto descontado. [FR-031]
- [x] T082 [US11] Si quien registró la recepción intenta registrar la devolución, exigir la aprobación de un `jefe_compras` o `admin_ti` distinto. [FR-031, FR-014] **Reemplazada por T141 (rediseño 2026-11-23).**
- [x] T083 [US11] Agregar pruebas de devoluciones, notas de crédito, topes, duplicidad, cierre de OC y segregación en `tests/integration/compras/flujo-compras.test.js` y `tests/integration/compras/casos-limite.test.js`. [FR-031]
- [x] T084 [US11] Agregar prueba de integración del flujo completo de US11 en `tests/integration/compras/flujo-compras.test.js`. [FR-031]
- [x] T100 [US11] [FR-026] Registrar devoluciones con motivo `defectuoso` cuando el daño se detecta después de aceptar, descontando el saldo recibido y facturado, en `src/compras/devoluciones.js`; agregar pruebas en `tests/integration/compras/flujo-compras.test.js`. Verificado en `tests/integration/compras/casos-limite.test.js` (cierre de OC con saldo pendiente y motivo `defectuoso`).
- [ ] T101 [US11] [SC-011] Cubrir el daño detectado con la factura ya aprobada para pago y el cierre de la OC con saldo pendiente cuando el proveedor no repone, en `tests/integration/compras/casos-limite.test.js`. **Pendiente**: falta la transición `recibida_parcial → cerrada` en `src/compras/reglas.js` (ver `data-model.md`, sección 10, pendiente 3).
- [ ] T110 [US11] [FR-026] [SC-011] Calcular `credito_a_favor` cuando una devolución con motivo `defectuoso` descuenta una factura ya `aprobada_pago`, y mostrarlo en la factura y en la cadena documental, en `src/compras/devoluciones.js`, `src/compras/facturas.js` y `src/compras/vista.js`; agregar la prueba en `tests/integration/compras/casos-limite.test.js`.

**Punto de control**: devoluciones y notas de crédito funcionales; ciclo de P2 cerrado.

---

## Fase 13A: Trazabilidad Transversal

**Objetivo**: registrar quién, cuándo y qué acción en cada cambio de estado, navegar la cadena documental completa y conservar los documentos con historial mediante anulación con motivo.

**Prueba Independiente**: desde una devolución se navega a la factura, recepción, OC, cotización y solicitud; cada cambio de estado muestra usuario, fecha y acción, y un documento con historial no puede eliminarse.

- [x] T102 [FR-027] Implementar en `src/compras/trazabilidad.js` el registro de quién, cuándo y qué acción para cada cambio de estado de solicitud, cotización, OC, recepción, factura y devolución, integrándolo en `src/compras/solicitudes.js`, `src/compras/cotizaciones.js`, `src/compras/ordenes-compra.js`, `src/compras/recepciones.js`, `src/compras/facturas.js` y `src/compras/devoluciones.js`.
- [x] T103 [FR-028] Implementar en `src/compras/trazabilidad.js` y `src/compras/vista.js` la navegación desde cualquier documento a la cadena completa solicitud, cotización, OC, recepción, factura y devolución.
- [ ] T104 [FR-029] Impedir la eliminación de documentos con historial y permitir solo su anulación con motivo en `src/compras/almacenamiento.js`, `src/compras/ordenes-compra.js`, `src/compras/facturas.js` y `src/compras/devoluciones.js`. **Deuda conocida**: el bloqueo de eliminación y la anulación de OC están probados; falta extender `motivo_anulacion` a facturas y devoluciones (ver T118).
- [x] T105 [FR-030] Registrar cada cambio de datos bancarios con el valor enmascarado, nunca el completo, en `src/compras/proveedores.js` y `src/compras/trazabilidad.js`.
- [x] T106 [SC-012] Agregar pruebas de auditoría de punta a punta en `tests/integration/compras/trazabilidad.test.js` que verifiquen quién, cuándo y qué acción en cada cambio de estado, la navegación de la cadena completa y la conservación de documentos anulados.
- [ ] T109 [FR-029] Implementar la anulación con `motivo_anulacion` obligatorio de solicitudes, cotizaciones y recepciones en `src/compras/solicitudes.js` (ya guarda `motivo_anulacion`: verificar y completar), `src/compras/cotizaciones.js` y `src/compras/recepciones.js`, registrando el evento en `src/compras/trazabilidad.js`; una recepción anulada no cuenta para las cantidades recibidas ni para el valor recibido (`data-model.md`, reglas 5, 6 y 11). Agregar pruebas en `tests/integration/compras/trazabilidad.test.js` y `tests/unit/compras/reglas.test.js`. **Deuda conocida**: solo la solicitud guarda hoy `motivo_anulacion`; cotizaciones usan `motivo_descarte` y recepciones no tienen anulación. Se completa con T118 para cerrar FR-029 y el pendiente 2 de `data-model.md` §10.

**Punto de control**: trazabilidad completa y documentos no eliminables.

---

## Fase 14: Pulido y Aspectos Transversales

**Propósito**: integración final, parámetros, rendimiento, casos límite y documentación.

- [x] T085 Integrar todas las pantallas en la navegación y aplicar controles de interfaz basados en rol en todo el módulo, respetando las restricciones de `spec.md`.
- [x] T086 Parametrizar `UMBRAL_COTIZACIONES` y `TOLERANCIA_CONCILIACION` en configuración con los valores acordados: 1.000.000 CLP neto y 1 % del neto. [FR-021, FR-022]
- [x] T087 Ejecutar y completar las pruebas unitarias de todas las reglas de la sección 5 de `data-model.md`. [SC-007]
- [x] T088 Ejecutar las pruebas de integración de los flujos P1 (US1 a US6) y P2 (US7 a US9 y US11), además de la exportación de US10.
- [x] T089 Ejecutar `tests/integration/compras/rendimiento.test.js` con 500 registros por colección, midiendo una ejecución con `performance.now()` y comparando con los umbrales de SC-001 (solicitud de 3 productos en menos de 2 minutos), SC-006 (listas y búsquedas en menos de 2 000 ms) y SC-008 (exportación CSV en menos de 1 000 ms), según el protocolo de `plan.md`. [SC-001, SC-006, SC-008]
- [x] T090 Ejecutar la demostración de extremo a extremo de SC-002 en menos de 5 minutos: solicitud, 3 cotizaciones, OC, recepción y factura conciliada. [SC-002]
- [x] T091 Validar los casos límite de `spec.md`: anulación de OC con cotización seleccionada, nota de crédito, sobreentrega, producto desactivado con solicitudes abiertas, proveedor bloqueado con OC abiertas y `localStorage` lleno o deshabilitado.
- [x] T092 Actualizar el README con instrucciones de ejecución, roles, datos semilla y alcance del módulo de compras.
- [x] T107 Ejecutar `npm run lint` (ESLint) y `npm run format:check` (Prettier) sin errores ni advertencias, con `format:check` pasando en el alcance real de `.prettierignore` (núcleo base `src/storage.js` y `tests/unit/storage.test.js`), antes del congelamiento del 26-nov (constitución, Estándares de Calidad).
- [x] T108 [SC-013] Verificar la accesibilidad de las diez pantallas del módulo (panel, proveedores, solicitudes, cotizaciones, OC, recepciones, facturas, devoluciones, catálogo y evaluaciones): asociar etiqueta a cada campo en `src/compras/vista.js`, mostrar los errores de validación junto al campo con `role="alert"` y `aria-describedby` (el banner `role="alert"` queda reservado a errores globales), comprobar foco, operación por teclado, encabezados con `scope="col"` y navegación de pestañas, y ajustar `--muted` y el color de las insignias de advertencia en `src/styles.css` para alcanzar 4,5:1; automatizar todo en `tests/integration/compras/vista.test.js`.
- [x] T111 [US5] Limpiar `index.html` del contenido de demostración del módulo base: retirar las vistas `view-dashboard`, `view-entities`, `view-documents` y `view-search`, sus botones de navegación y los rótulos "Módulo Base ERP", conservando `#config-errors`, `#app`, `#view-compras`, `#compras-root` y el script `src/main.js`. Verificar que la aplicación arranque sin errores y que en la interfaz solo quede la navegación y el panel del módulo de Adquisiciones y Compras. [FR-018]
- [x] T112 [US5] Verificar los datos simulados en la interfaz: confirmar que `src/compras/semilla.json` incluya ejemplos ficticios que cubran los estados que consume el panel (solicitudes `enviadas`, OC sin recepción, recepciones pendientes y facturas que vencen en 5 días o menos), asegurar que el cargador de T007 los disponga al abrir `index.html` y comprobar en pantalla los contadores, alertas y accesos directos de US5; revalidar los pendientes de facturas una vez cerrada US7 (Fase 9). Respetar FR-020, el enmascaramiento de FR-025 y no usar datos reales. [FR-018, FR-020, SC-005]
- [x] T113 Completar el artefacto de Fase 0 en `specs/002-modulo-adquisiciones-compras/research.md`, con las decisiones técnicas del módulo (pila, extensión en dos niveles, persistencia, reglas puras, roles simulados, trazabilidad, CSV, pruebas e integración), su justificación y las alternativas consideradas, sin clarificaciones pendientes.
- [x] T114 Completar los artefactos de Fase 1 en `specs/002-modulo-adquisiciones-compras/contracts/almacenamiento-compras.md` y `specs/002-modulo-adquisiciones-compras/contracts/exportacion-e-integracion.md`, documentando claves, operaciones, formato CSV, permisos por rol y puntos de integración con el módulo base y los módulos vecinos. Actualizar el árbol de documentación de `plan.md`.
- [x] T115 Completar `specs/002-modulo-adquisiciones-compras/quickstart.md` con requisitos, comandos, escenarios de validación por historia (SC-002, SC-005, SC-009, SC-010), reinicio de datos y referencias a `spec.md`, `data-model.md` y los contratos; reflejar los artefactos nuevos en `README.md`.
- [x] T116 Auditar `spec.md` de la feature 002: confirmar que US1-US11 comparten el mismo formato (**Como/necesito/para**, **Por qué esta prioridad**, **Prueba Independiente**, **Escenarios de Aceptación** con pasos **Dado/Cuando/Entonces**), explicitar en Clarifications el umbral de 1.000.000 CLP neto, la tolerancia del 1 %, la visibilidad bancaria de `admin_ti` y `jefe_compras`, el CSV UTF-8 con BOM y `;`, y el flujo de dañados y devoluciones (FR-025 a FR-030); agregar FR-032, su escenario en US5 y SC-014 para prohibir las vistas genéricas del template base. [FR-032, SC-014]

---

## Fase 15: Cierre de pendientes del modelo de datos

**Objetivo**: resolver las cuatro diferencias registradas en `data-model.md`, sección 10, y cerrar la cobertura de FR-029 con tareas explícitas y trazabilidad. Las decisiones 1 y 4 (T117 y T119) quedan cerradas en esta iteración; continúan abiertas las decisiones 2 y 3 (T101 y T118).

- [x] T117 [FR-015] Unificar el estado inicial de la factura entre código y modelo según `data-model.md` §10, pendiente 1. Decisión aplicada: `registrada` en código y modelo. `src/compras/reglas.js`, `src/compras/facturas.js` y las pruebas ya usaban ese valor; se actualizan `data-model.md` §3.11/regla 6 y §10.
- [ ] T118 [FR-029] Alinear los estados de devolución con `data-model.md` §10, pendiente 2: incorporar `anulada` con `motivo_anulacion` y registrarlo en `src/compras/trazabilidad.js`. Extender la anulación con motivo a facturas y devoluciones, además de solicitudes, cotizaciones y recepciones, para cerrar T104 y T109. **Deuda conocida**: hoy solo OC y solicitudes guardan `motivo_anulacion`; el resto usa `descartar`/`rechazar`.
- [x] T119 [FR-010] Resolver `data-model.md` §10, pendiente 4. Decisión aplicada: eliminar `borrador` del modelo de OC y mantener `emitida` como estado inicial, en línea con la spec US3, `src/compras/reglas.js` y `src/module-config.js`. Sincronizados `plan.md` y `data-model.md` §3.9/regla 4 y §10.
- [x] T120 [SC-003] Auditoría en `tests/integration/compras/flujo-compras.test.js`: se generan casos sobre el umbral con tres cotizaciones vigentes y con `justificacion_proveedor_unico`, se recorren todas las OC no anuladas y se comprueba que el 100 % de las que superan `UMBRAL_COTIZACIONES` cumple alguna de las dos vías. Trazabilidad SC-003 actualizada.

**Punto de control**: las decisiones 1 y 4 de `data-model.md` §10 quedan cerradas; las decisiones 2 y 3 siguen registradas como deuda conocida y FR-029 mantiene cobertura explícita mediante T118. SC-003 queda cubierta por la auditoría de T120.

---

## Fase 16: Fundacional del rediseño de permisos (Prerrequisito Bloqueante)

**Propósito**: alinear permisos y visibilidad con FR-004, FR-006, FR-014 y FR-033 antes de tocar la interfaz. Bloquea las fases 17 a 19.

- [x] T121 Actualizar `PERMISOS` en `src/compras/almacenamiento.js` según la tabla de `contracts/exportacion-e-integracion.md`: quitar a `admin_ti` de todas las operaciones de compra; `crear_solicitud` para los cinco roles (`solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`; hoy falta `bodega`), con edición solo del autor según T150; `aprobar_solicitud`, `aprobar_pago` y `aprobar_devolucion` solo para `jefe_compras`; `gestionar_proveedores`, `gestionar_cotizaciones`, `emitir_oc`, `registrar_factura`, `conciliar_factura` y `gestionar_catalogo` solo para `comprador`; `evaluar_proveedor` para `comprador` y `jefe_compras`; `registrar_recepcion` y `registrar_devolucion` solo para `bodega`; agregar `desbloquear_proveedor` y `exportar_trazabilidad` (`admin_ti`) y `consultar_trazabilidad` (`jefe_compras`, `admin_ti`). [FR-004, FR-005, FR-006, FR-033]
- [x] T122 [P] Crear `src/compras/visibilidad.js` con la matriz `VISIBILIDAD` (vista × rol → `'opera'`, `'lectura'` o `null`) para las 9 vistas operativas y la trazabilidad (10 filas en total), tal como la define la Matriz de visibilidad por rol de `spec.md` (en Solicitudes, los cinco roles tienen `'opera'`, incluido `bodega`; el alcance "solo propias" o "ajenas en lectura" lo aplica T150); la agrupación `GRUPOS` (Panel / Adquisiciones: Proveedores, Catálogo, Evaluaciones / Compras: Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones); y las funciones `nivelVista(vista, usuario)` y `vistasVisibles(usuario)`. El Panel es visible para los cinco roles. [FR-033, FR-034]
- [x] T123 [P] Agregar pruebas unitarias de `PERMISOS` y de las 50 combinaciones rol × vista de `VISIBILIDAD` en `tests/unit/compras/visibilidad.test.js`. [SC-015]
- [x] T124 Ajustar las pruebas existentes de `tests/integration/compras/*.test.js` y `tests/integration/compras/helpers.js` que usan a `admin_ti` o a `jefe_compras` como operadores (emitir OC, gestionar proveedores, recibir, aprobar devoluciones; crear solicitudes sigue permitido a ambos) para que usen el rol que corresponde según la matriz, sin debilitar lo que verifican. [SC-016]

**Punto de control**: permisos y matriz centralizados y probados; la suite vuelve a pasar con los nuevos roles.

---

## Fase 17: Historia de Usuario 12 - Navegación y visibilidad por rol (P1)

**Objetivo**: que cada rol vea en la navegación y en cada vista solo lo que puede operar o consultar, con la barra lateral agrupada y la sección actual en el encabezado.

**Prueba Independiente**: se recorre la aplicación con los cinco roles y, vista por vista, la barra lateral, las acciones disponibles y los registros visibles coinciden con la matriz de FR-033.

- [~] T125 [US12] Parcial 2026-11-24: pesta?as con scroll m?vil y teclado/ARIA conservados; pendiente navegaci?n agrupada Panel/Adquisiciones/Compras por `vistasVisibles()` (Fase 16). Reemplazar la lista plana `TABS` de `src/compras/vista.js` por navegación agrupada: la barra lateral (`.side-nav` de `index.html`) muestra las secciones Panel, Adquisiciones y Compras según `vistasVisibles()` en lugar del ítem único `#nav-compras`; las pestañas de cada sección muestran solo sus vistas visibles; un grupo sin vistas se oculta; al ingresar, la aplicación abre el Panel del rol (el rol no cambia en vivo, T146–T147). Conservar la navegación por teclado y los atributos ARIA existentes. [FR-034, SC-013]
- [ ] T126 [US12] Aplicar el modo solo lectura en cada función `render*` de `src/compras/vista.js`: con `nivelVista() === 'lectura'` se ocultan los formularios y los botones de crear, editar, aprobar, rechazar, descartar y anular; se mantienen **Exportar CSV** y **Cadena**. [FR-033]
- [ ] T127 [US12] Filtrar para el `solicitante` las OC y recepciones originadas en sus propias solicitudes en `src/compras/ordenes-compra.js`, `src/compras/recepciones.js`, `src/compras/vista.js` y `src/compras/exportacion.js` (el CSV aplica el mismo filtro). [FR-033, FR-024]
- [ ] T128 [US12] Bloquear el acceso a vistas que el rol no ve desde `irA()`, `data-ir` y `data-traza-ir` en `src/compras/vista.js`: mostrar el aviso "Tu rol no tiene acceso a esta vista" sin cambiar de vista; en la cadena documental, los nodos de vistas no visibles se muestran sin enlace. [FR-033]
- [ ] T129 [US12] En `renderTrazaCadena()` de `src/compras/vista.js`, mostrar el historial de eventos solo si `puede('consultar_trazabilidad')`; agregar el botón **Exportar historial** visible solo con `exportar_trazabilidad`, implementado con `exportarTrazabilidad()` en `src/compras/exportacion.js` (archivo `trazabilidad.csv`, datos bancarios enmascarados). [FR-033, FR-025, FR-030]
- [~] T130 [US12] Parcial 2026-11-24: sin tarjeta "Sesi?n activa" y con indicador en barra superior; pendiente encabezado "Grupo > Vista" por Fase 16. Eliminar el bloque `compras-session` ("Sesión activa") de `src/compras/vista.js` y reemplazar el título fijo por un encabezado con la sección actual en formato "Grupo › Vista"; eliminar de `src/styles.css` las reglas que queden sin uso. [FR-036]
- [ ] T131 [US12] Agregar pruebas de integración en `tests/integration/compras/permisos.test.js` (nuevo): barra lateral por rol, botones según la matriz, filtro de OC y recepciones del solicitante, acceso denegado a vistas no visibles, historial de eventos por rol, encabezado con la sección y ausencia de "Sesión activa". [SC-015, SC-017]
- [ ] T132 [US12] Adaptar las pruebas de accesibilidad de `tests/integration/compras/vista.test.js` a la nueva navegación por secciones y pestañas (foco, teclado y roles ARIA). [SC-013]

**Punto de control**: navegación y visibilidad por rol funcionales; US12 verificable de forma independiente.

---

## Fase 18: Ajustes de permisos por historia

**Propósito**: aplicar el rediseño a las reglas de cada historia afectada.

- [ ] T133 [US1] Crear `desbloquearProveedor(id, usuario)` en `src/compras/proveedores.js`: exige `desbloquear_proveedor`, pasa de `bloqueado` a `aprobado` y registra el evento `desbloqueo` en `src/compras/trazabilidad.js`; `cambiarEstadoProveedor()` sigue sin permitir salir de `bloqueado`. Agregar el botón **Desbloquear** en la ficha de `src/compras/vista.js` y la prueba en `tests/integration/compras/proveedores.test.js`. [FR-004]
- [~] T134 [US1] Parcial 2026-11-24: función `actualizarDatosBancarios()` y pruebas listas; pendiente la edición bancaria en la ficha (depende de T126). Crear `actualizarDatosBancarios(id, datos, usuario)` en `src/compras/proveedores.js`, que exige solo `editar_datos_bancarios` (porque `admin_ti` ya no tiene `gestionar_proveedores`), actualiza `fecha_cambio_cuenta` y registra el cambio enmascarado. En la ficha de `src/compras/vista.js`, `admin_ti` solo edita banco, tipo y número de cuenta. Agregar las pruebas en `tests/integration/compras/proveedores.test.js`. [FR-004, FR-030]
- [x] T135 [US2] En `src/compras/solicitudes.js`, permitir aprobar y rechazar solo a `jefe_compras` distinto del solicitante y quitar a `admin_ti` de `anularSolicitud()` (línea 252). Agregar las pruebas en `tests/integration/compras/flujo-compras.test.js`. [FR-006]
- [x] T136 [US4] Eliminar la excepción `&& usuario.rol !== 'admin_ti'` de `src/compras/recepciones.js:50`, de modo que el emisor de la OC no pueda registrar su recepción con ningún rol; agregar la prueba en `tests/integration/compras/casos-limite.test.js`. [FR-014, SC-016]
- [~] T137 [US5] Parcial 2026-11-24: panel por rol y "Mis solicitudes" implementados en base; pendiente validar cobertura exacta FR-035 y dependencias Fase 16. Reescribir las condiciones por rol de `construirPanel()` en `src/compras/panel.js` según la tabla de FR-035: los cinco roles, el pendiente "Mis solicitudes" con el estado de las solicitudes propias del usuario de la sesión (nunca las de otros usuarios); además, `comprador`, solicitudes aprobadas sin cotizar, OC sin recepción y facturas con discrepancia, con el indicador de facturas con discrepancia; `jefe_compras`, solicitudes de otros usuarios por aprobar, facturas conciliadas por aprobar pago y devoluciones `pendiente_aprobacion`, con gasto del período y facturas en riesgo de pago tardío; `bodega`, OC esperando entrega y recepciones parciales, con la tasa de rechazo; `admin_ti`, cambios bancarios de los últimos 30 días y alertas de fraude. Los indicadores se calculan según `data-model.md` §8; las alertas de vencimiento solo para roles que ven Facturas; el seguimiento de OC con más de 7 días solo para `bodega` y `comprador`. [FR-035, FR-017, FR-018]
- [x] T138 [US5] Acciones r?pidas con etiqueta/descripci?n legibles implementadas en `panel.js`/`vista.js`; pendiente revalidar estado vac?o por matriz Fase 16. Definir las acciones rápidas por rol en `src/compras/panel.js` con `etiqueta` y `descripcion` legibles (p. ej., "Crear solicitud de compra") y mostrar en `src/compras/vista.js:465` la descripción en lugar de `a.clave`; la acción "Crear solicitud de compra" aparece para los cinco roles; el estado vacío solo invita a acciones que el rol puede ejecutar (para `bodega` y `admin_ti`, solo a crear una solicitud de compra). Depende de T125. [FR-036, FR-018]
- [ ] T139 [US5] Agregar pruebas del panel para los cinco roles (pendientes, incluido "Mis solicitudes" solo con las propias, indicadores y alertas de FR-035) y de acciones rápidas sin identificadores internos en `tests/integration/compras/catalogo-panel.test.js`. [FR-035, SC-017]
- [ ] T140 [US7] Agregar pruebas en `tests/integration/compras/casos-limite.test.js` que verifiquen que el `comprador` no puede aprobar pagos y que `admin_ti` ve las facturas en solo lectura. [FR-033]
- [x] T141 [US11] En `src/compras/devoluciones.js` (líneas 153, 156 y 209), aceptar solo a `jefe_compras` como aprobador y actualizar los mensajes de error; agregar las pruebas en `tests/integration/compras/flujo-compras.test.js`. [FR-031]

**Punto de control**: las reglas de cada historia respetan la matriz y la regla 8 sin excepciones.

---

## Fase 19: Cierre del rediseño

**Propósito**: datos de demostración, documentación y verificación final del rediseño.

- [ ] T142 Revisar `src/compras/semilla.json` para que los paneles de `admin_ti` y `jefe_compras` tengan contenido: al menos un proveedor con cambio bancario hace menos de 30 días y una factura no aprobada, y una devolución `pendiente_aprobacion`, con datos ficticios. [FR-020, FR-035]
- [ ] T143 Actualizar la documentación: roles en `README.md`; en `specs/002-modulo-adquisiciones-compras/plan.md`, verificar al cerrar las Fases 16 a 20 que la tabla de Deuda conocida esté sincronizada con `tasks.md` (filas T121-T144 y T146-T155, con su estado) y agregar `visibilidad.js` al árbol de código; en `specs/002-modulo-adquisiciones-compras/contracts/exportacion-e-integracion.md`, agregar `trazabilidad.csv` a los nombres de archivo.
- [ ] T144 Ejecutar `npx vitest run` y `npm run lint` sin errores ni advertencias, y recorrer con los cinco roles, cerrando sesión e ingresando con cada uno, los escenarios 1 a 4 de `specs/002-modulo-adquisiciones-compras/quickstart.md`. [SC-015, SC-016, SC-017]
- [x] T145 [US12] [FR-037] Documentar y verificar la pantalla de ingreso simulada ya implementada en `src/compras/autenticacion.js` (selector de rol, nombre condicional para `solicitante`/`comprador`, clave genérica `Compras2026`, botón **Cerrar sesión**), con pruebas en `tests/integration/compras/autenticacion.test.js`. **El nombre condicional y el selector Rol Activo los modifican T146–T148 (2026-11-23).**

**Punto de control**: rediseño de permisos y navegación por rol cerrado.

---

## Fase 20: Solicitudes para los cinco roles y rol fijo por sesión (2026-11-23)

**Propósito**: aplicar las decisiones 12 y 13 de `research.md`: los cinco roles crean solicitudes, la de un `jefe_compras` la aprueba otro `jefe_compras`, y el rol queda fijo durante la sesión (FR-005, FR-006, FR-034, FR-035, FR-036, FR-037).

**Prueba Independiente**: con la sesión iniciada no existe forma de cambiar de rol; tras cerrar sesión e ingresar con otro rol, la barra superior, la barra lateral y el panel corresponden a ese rol. Un `jefe_compras` crea una solicitud que solo otro `jefe_compras` puede aprobar.

- [x] T146 [US12] En `src/compras/almacenamiento.js`, hacer que `setRolActivo(rol)` no cambie el rol de una sesión iniciada: si `estaAutenticado()` es verdadero, devuelve la sesión vigente sin escribir en `erp_compras:sesion`. La sesión solo se escribe desde `iniciarSesion()` de `src/compras/autenticacion.js` (y `setSesion()` queda para ese uso y para preparar pruebas). [FR-037]
- [x] T147 [US12] Reemplazar en `index.html` el selector `#rol-activo` (líneas 102-103) por un indicador de solo lectura con el usuario y el rol de la sesión, junto a `#btn-logout`. En `src/app.js`, eliminar el listener `change` de `cablearEventos()` (líneas 226-232) y la importación de `setRolActivo`; mostrar el indicador al iniciar sesión, limpiarlo al cerrar sesión y abrir el Panel del rol al ingresar. Ajustar en `src/styles.css` las reglas de `.rol-select` que queden sin uso y dar estilo al indicador, conservando contraste y nombre accesible. [FR-036, FR-037, FR-034]
- [x] T148 [US12] `jefe_compras` incluido en `ROLES_CON_NOMBRE`; ingreso con nombre validado; indicador/sesi?n y etiquetas muestran nombre de `jefe_compras` cuando corresponde. [FR-037, FR-006]
- [x] T149 [P] Implementado: `u-jefe-1` Marcela Rojas y `u-jefe-2` Jorge Mu?oz en semilla. En `src/compras/semilla.json`, agregar el nombre ficticio `Marcela Rojas` a `u-jefe-1` y un segundo usuario `u-jefe-2` (`Jorge Muñoz`, rol `jefe_compras`, centro de costo `cc-003`, correo ficticio `@example.com`). Agregar al menos una solicitud `enviada` creada por `u-jefe-1`, para que `u-jefe-2` pueda aprobarla en la demostración. Todos los datos son ficticios. [FR-006, FR-020]
- [~] T150 [US2] Parcial 2026-11-24: `crear_solicitud` habilitada para cinco roles y UI actualizada; pendiente endurecer autor?a/filtros/exportaci?n y alcance FR-033 (depende Fase 16). En `src/compras/solicitudes.js`, limitar `actualizarSolicitud()` y `enviarSolicitud()` al autor de la solicitud; en `listarSolicitudes()` y `puedeVerSolicitud()`, mostrar a `solicitante` y `bodega` solo sus propias solicitudes y a `comprador`, `jefe_compras` y `admin_ti` también las ajenas; mantener en `aprobarSolicitud()` (que también rechaza con `{ aprobar: false, motivo }`) la exigencia de un `jefe_compras` distinto del solicitante. En `src/compras/vista.js`, mostrar el formulario de nueva solicitud a los cinco roles y las solicitudes ajenas en solo lectura; `exportarSolicitudes()` de `src/compras/exportacion.js` aplica el mismo filtro. Depende de T121 y T149. [FR-005, FR-006, FR-033, FR-024]
- [ ] T151 [US2] Agregar pruebas en `tests/integration/compras/flujo-compras.test.js`: los cinco roles crean y envían una solicitud; `bodega` y `solicitante` ven solo las propias; ningún usuario edita una solicitud ajena; una solicitud de `u-jefe-1` la aprueba `u-jefe-2` y `u-jefe-1` no puede aprobarla (regla 8). Depende de T150. [FR-005, FR-006, SC-016]
- [x] T152 [US12] Ajustar las pruebas que usan `setRolActivo()` o cambian de rol en vivo, sin debilitar lo que verifican: agregar a `tests/integration/compras/helpers.js` un helper que inicie sesión por rol (con nombre para `solicitante`, `comprador` y `jefe_compras`); en `tests/integration/compras/vista.test.js`, reemplazar el uso del selector `#rol-activo` (líneas 43, 55-65, 83-108, 112, 149 y 200) por cierre de sesión e ingreso con el otro rol, y convertir "cambia el rol activo y vuelve a renderizar" en una prueba del indicador de solo lectura; en `tests/integration/compras/autenticacion.test.js`, actualizar "pide nombre solo a solicitante y comprador" y "ingresa sin nombre para jefatura y muestra solo el rol" (líneas 65-118) para que `jefe_compras` pida nombre y la sesión se compruebe en el indicador. Depende de T146–T149. [FR-037, SC-015]
- [ ] T153 [US12] Agregar pruebas en `tests/integration/compras/autenticacion.test.js`: con la sesión iniciada, `setRolActivo()` no cambia el rol ni `getUsuarioActivo()`; no existe `#rol-activo` en la barra superior; el indicador muestra el usuario y el rol; tras cerrar sesión e ingresar con otro rol, la barra lateral y el panel corresponden al nuevo rol. Depende de T146–T148. [FR-037, FR-034, FR-036]
- [ ] T154 Actualizar `README.md` (líneas 30, 31, 38 y 129): acceso con nombre para `solicitante`, `comprador` y `jefe_compras`, indicador de solo lectura en lugar del selector **Rol Activo**, rol fijo durante la sesión y creación de solicitudes por los cinco roles; al cerrar la fase, marcar como cerrada la fila T146-T155 de Deuda conocida en `specs/002-modulo-adquisiciones-compras/plan.md`. [FR-037]
- [ ] T155 Ejecutar `npx vitest run` y `npm run lint` sin errores ni advertencias y recorrer los escenarios 1 y 3 de `specs/002-modulo-adquisiciones-compras/quickstart.md` cerrando sesión entre roles. [FR-005, FR-006, FR-037, SC-015, SC-016]

**Punto de control**: el rol no cambia dentro de una sesión, los cinco roles crean solicitudes y la regla 8 se cumple también para las solicitudes de `jefe_compras`.

---

## Deuda conocida

El estado de estas tareas se registra aquí y se replica en `plan.md` para que el congelamiento no esconda trabajo pendiente. T107, T108, T117, T119 y T120 figuran como cerradas; el resto permanece abierto.

| Tarea | Estado  | Justificación de la deuda                                                                                                                                                                                                                    | Referencia                          |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| T101  | Abierta | La prueba de cierre con saldo pendiente pasa, pero `cerrarSiSaldada()` muta el estado directamente; falta declarar `recibida_parcial → cerrada` en `TRANSICIONES`.                                                                           | `data-model.md` §10, pendiente 3    |
| T104  | Abierta | Bloqueo de eliminación y anulación de OC verificados; falta `motivo_anulacion` en facturas y devoluciones.                                                                                                                                   | FR-029, T118                        |
| T107  | Cerrada | Se formatearon `src/storage.js` y `tests/unit/storage.test.js`, se eliminaron las 6 advertencias y `format:check` pasa en el alcance de `.prettierignore`. Lint y `format:check` pasan sin errores ni advertencias. | Constitución, Estándares de Calidad |
| T108  | Cerrada | Accesibilidad revisada: encabezado del panel asociado, pestañas navegables con teclado, etiquetas y tablas accesibles, errores de validación junto al campo con `role="alert"`/`aria-describedby` y banner para errores globales, y contraste 4,5:1; cubierto por `vista.test.js`. | SC-013 |
| T109  | Abierta | Solo la solicitud guarda `motivo_anulacion`; faltan cotizaciones y recepciones.                                                                                                                                                              | FR-029, T118                        |
| T110  | Abierta | `credito_a_favor` no está implementado ni mostrado en factura/cadena documental.                                                                                                                                                             | FR-026, SC-011                      |
| T117  | Cerrada | Decisión aplicada: `registrada` como estado inicial de factura en código y modelo; `data-model.md` sincronizado en §3.11/regla 6 y §10.                                                                                                    | FR-015                              |
| T118  | Abierta | Pendiente 2 de `data-model.md` §10: estados de devolución y anulación con motivo incompletos.                                                                                                                                                | FR-029                              |
| T119  | Cerrada | Decisión aplicada: se elimina `borrador` del modelo de OC y se conserva `emitida` como estado inicial; `data-model.md` y `plan.md` sincronizados.                                                                                          | FR-010                              |
| T120  | Cerrada | Auditoría global de SC-003 en `flujo-compras.test.js`: se verifican las dos vías de cumplimiento (tres cotizaciones vigentes o justificación de proveedor único) sobre todas las OC no anuladas.                                            | SC-003                              |

---

## Dependencias y Orden de Ejecución

### Dependencias de Fases

- **Configuración (Fase 1)**: sin dependencias; T001 es bloqueante.
- **Fundacional (Fase 2)**: depende de Fase 1 y bloquea todas las historias.
- **US1 (Fase 3)**: depende de Fundacional.
- **US2 (Fase 4)**: depende de Fundacional; no depende de US1.
- **US3 (Fase 5)**: depende de US1 (proveedor aprobado) y US2 (solicitud aprobada); la emisión desde cotización (T028) requiere US6 (T051-T056) y se ejecuta después de la Fase 8, mientras la compra directa (T029) puede ejecutarse en la Fase 5.
- **US4 (Fase 6)**: depende de US3.
- **US5 (Fase 7)**: depende de US2, US3, US4 y US7 para mostrar todos sus pendientes; durante la Fase 7 se usa datos semilla y T112 revalida los pendientes de facturas una vez cerrada US7 (Fase 9).
- **US6 (Fase 8)**: depende de US1 y US2; habilita la emisión de OC desde cotización en T028 (US3).
- **US7 (Fase 9)**: depende de US4.
- **US8 (Fase 10)**: depende de US1 y de los productos maestros; puede iniciarse tras Fundacional.
- **US9 (Fase 11)**: depende de US4 y sus evaluaciones se consumen en US6 y US1.
- **US10 (Fase 12)**: depende de los listados de US1, US2, US3, US4, US5 y US7.
- **US11 (Fase 13)**: depende de US7 y de la recepción de US4.
- **Trazabilidad (Fase 13A)**: depende de US1 a US11 y se ejecuta antes del pulido.
- **Pulido (Fase 14)**: al finalizar todas las historias.
- **Pendientes de modelo (Fase 15)**: depende de US3, US7 y US11; cierra las decisiones de `data-model.md` §10 y la cobertura de FR-029.
- **Fundacional del rediseño (Fase 16)**: depende de las fases 1 a 15 y bloquea las fases 17, 18 y 19. T122 y T123 pueden ejecutarse en paralelo con T121; T124 va después de T121.
- **US12 (Fase 17)** y **Ajustes por historia (Fase 18)**: dependen de la Fase 16 y pueden avanzar en paralelo, salvo T138, que depende de T125, y T133 y T134, cuyos botones requieren T126.
- **Cierre del rediseño (Fase 19)**: al finalizar las fases 17 y 18.
- **Solicitudes para los cinco roles y rol fijo (Fase 20)**: T146–T149 pueden empezar tras la Fase 16 (T149 en paralelo); T150 depende de T121 y T149; T151 de T150; T152 y T153 de T146–T148 (T152 también de T149); T154 y T155 cierran la fase. Conviene ejecutar T147 antes o junto con T125 y T130, porque las tres tocan la barra superior y la navegación.

### Dependencias Críticas

- La plantilla base debe tener `src/` operativo y sus pruebas deben pasar antes de T002.
- Una solicitud sin aprobación no puede generar OC; una OC sin recepciones no puede recibir facturas; una factura con discrepancia no puede aprobarse para pago.
- Una cotización no puede registrarse sin solicitud aprobada ni convertirse en OC sin estar seleccionada.
- La segregación de funciones debe respetarse en solicitudes, OC, recepciones y devoluciones, sin excepciones por rol (T136); la solicitud de un `jefe_compras` la aprueba otro `jefe_compras` (T150, T151).
- El rol no cambia dentro de una sesión (T146, T147): ninguna prueba ni pantalla debe depender de cambiar de rol en vivo (T152).

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

### Rediseño de permisos (2026-11-23)

1. Fase 16: T121–T124 (permisos, matriz y pruebas ajustadas).
2. T136: quitar la excepción de `admin_ti` en la recepción, que es el riesgo de segregación más alto.
3. US12 (Fase 17): navegación agrupada, solo lectura, acceso denegado, historial y encabezado.
4. Resto de la Fase 18: proveedores, solicitudes, panel, facturas y devoluciones.
5. Fase 19: semilla, documentación y verificación con los cinco roles.

Ejemplo de paralelismo: tras T121, ejecutar en paralelo T122/T123 (matriz y sus pruebas) y T136 (recepciones); tras la Fase 16, T125–T132 (US12) en paralelo con T133–T137 y T139–T141.

### Solicitudes para los cinco roles y rol fijo (2026-11-23)

1. T146–T148: rol fijo en almacenamiento, indicador en la barra superior y nombre para `jefe_compras`.
2. T149: segundo `jefe_compras` en la semilla (en paralelo con el paso 1).
3. T150–T151: creación, edición y visibilidad de solicitudes por autor, con sus pruebas.
4. T152–T153: pruebas sin cambio de rol en vivo y pruebas del rol fijo.
5. T154–T155: documentación y verificación final.

---

## Trazabilidad con Requisitos

### Requisitos Funcionales

| Requisito | Tareas                                         |
| --------- | ---------------------------------------------- |
| FR-001    | T011, T012, T013, T014, T015                   |
| FR-002    | T014                                           |
| FR-003    | T016                                           |
| FR-004    | T017, T062, T093, T121, T133, T134             |
| FR-005    | T020, T021, T022, T023, T121, T150, T151, T155 |
| FR-006    | T024 (sup. por T135), T121, T135, T148, T149, T150, T151, T155 |
| FR-007    | T051, T052                                     |
| FR-008    | T054                                           |
| FR-009    | T053                                           |
| FR-010    | T015, T028, T029, T119                         |
| FR-011    | T030, T032                                     |
| FR-012    | T005, T031                                     |
| FR-013    | T036, T037, T039                               |
| FR-014    | T038 (sup. por T136), T082 (sup. por T141), T136 |
| FR-015    | T057, T058, T061, T080, T117                   |
| FR-016    | T059                                           |
| FR-017    | T045, T060, T137                               |
| FR-018    | T043, T044 (sup. por T137), T046 (sup. por T137), T047, T048, T049 (sup. por T138), T111, T112, T137, T138 |
| FR-019    | T072                                           |
| FR-020    | T008, T112, T142, T149                         |
| FR-021    | T086                                           |
| FR-022    | T086                                           |
| FR-023    | T066, T067, T068                               |
| FR-024    | T074, T075, T076, T127, T150                   |
| FR-025    | T017, T093, T094, T095, T096, T129             |
| FR-026    | T097, T098, T100, T101, T110                   |
| FR-027    | T102, T106                                     |
| FR-028    | T103, T106                                     |
| FR-029    | T104, T106, T109, T118                         |
| FR-030    | T105, T106, T129, T134                         |
| FR-031    | T078, T079, T080, T081, T082 (sup. por T141), T083, T084, T141 |
| FR-032    | T085, T111, T116                               |
| FR-033    | T121, T122, T126, T127, T128, T129, T140, T150 |
| FR-034    | T122, T125, T147, T153                         |
| FR-035    | T137, T139, T142                               |
| FR-036    | T130, T138, T147, T153                         |
| FR-037    | T145 (modificada por T146–T148), T146, T147, T148, T152, T153, T154, T155 |

### Requisitos de Integración

| Requisito | Tareas |
| --------- | ------ |
| IR-001    | T009   |
| IR-002    | T040   |
| IR-003    | T063   |

### Criterios de Éxito

| Criterio | Tareas           |
| -------- | ---------------- |
| SC-001   | T089             |
| SC-002   | T090             |
| SC-003   | T054, T120       |
| SC-004   | T041             |
| SC-005   | T045, T050, T112 |
| SC-006   | T089             |
| SC-007   | T087             |
| SC-008   | T077, T089       |
| SC-009   | T096             |
| SC-010   | T077, T099       |
| SC-011   | T098, T101, T110 |
| SC-012   | T106             |
| SC-013   | T108, T125, T132 |
| SC-014   | T111, T116       |
| SC-015   | T123, T131, T144, T152, T155 |
| SC-016   | T124, T136, T144, T151, T155 |
| SC-017   | T131, T139, T144 |

### Historias de Usuario

| Historia                                         | Prioridad   | Tareas                     |
| ------------------------------------------------ | ----------- | -------------------------- |
| US1 - Gestionar proveedores                      | P1          | T011-T019, T093-T096       |
| US2 - Crear y aprobar solicitudes                | P1          | T020-T026, T150-T151       |
| US3 - Emitir órdenes de compra                   | P1          | T027-T034                  |
| US4 - Registrar recepciones                      | P1          | T035-T042, T097-T098       |
| US5 - Panel de pendientes y alertas              | P1          | T043-T050, T111-T112, T116 |
| US6 - Cotizaciones y comparativa side-by-side    | P1          | T051-T056                  |
| US7 - Registrar y conciliar facturas             | P2          | T057-T065                  |
| US8 - Catálogo de productos por proveedor        | P2          | T066-T069                  |
| US9 - Evaluación de desempeño de proveedores     | P2          | T070-T073                  |
| US10 - Exportación de reportes en CSV            | P3          | T074-T077, T099            |
| US11 - Registrar devoluciones y notas de crédito | P2          | T078-T084, T100-T101, T110 |
| Trazabilidad transversal                         | Transversal | T102-T106, T109            |
| Pendientes de modelo (`data-model.md` §10)       | Transversal | T101, T117-T119            |
| US12 - Navegación y visibilidad por rol          | P1          | T125-T132, T145, T146-T148, T152-T153 |
| Rediseño de permisos (fundacional, ajustes y cierre) | Transversal | T121-T124, T133-T144   |
| Solicitudes para los cinco roles y rol fijo (Fase 20) | Transversal | T146-T155         |
