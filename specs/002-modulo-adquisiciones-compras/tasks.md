# Tasks: Módulo Adquisiciones y Compras

**Entrada**: [spec.md](spec.md) (fuente de historias y requisitos), [plan.md](plan.md) y [data-model.md](data-model.md)

**Prerrequisitos**: plan.md, spec.md y data-model.md aprobados; módulo base `001-erp-base-module` operativo.

**Pruebas**: obligatorias según la constitución del proyecto y el plan. Cada regla de la sección 5 de `data-model.md` debe tener prueba unitaria, y cada historia de usuario debe tener al menos una prueba de integración de su flujo.

**Organización**: las tareas se agrupan por las historias que existen realmente en `spec.md`: **US1, US2, US3, US4, US5, US7 y US11**. No se crean historias nuevas.

> **Alineación con spec.md**: la versión anterior de este archivo inventaba las historias US6, US8, US9 y US10, que no existen en la especificación. Se eliminan. Las cotizaciones se abordan dentro de US3 porque son prerrequisito de sus escenarios y de FR-007 a FR-009; el catálogo y la evaluación de proveedores se abordan como tareas de soporte trazadas a las entidades clave y a FR-019. La exportación CSV se elimina porque no está en el alcance ni en los requisitos de `spec.md`.
>
> **Roles**: se usan los roles definidos en `spec.md`: `solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`.
>
> **Extensión necesaria para US11**: para cumplir el documento de devolución con correlativo `DEV-AAAA-NNNN` se agrega `src/compras/devoluciones.js` y la colección `erp_compras:devoluciones`, no detallada en `plan.md` pero exigida por los escenarios de US11. Las notas de crédito se registran como `FACTURA_PROVEEDOR` con `tipo_documento = nota_credito`, según `data-model.md`.

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

- [ ] T001 Verificar que la plantilla base exista y funcione: `src/`, `src/module-config.js`, contrato de almacenamiento de `specs/001-erp-base-module/contracts/entity-storage.md` y Vitest configurado. BLOQUEANTE según `plan.md`.
- [ ] T002 Crear la estructura del módulo en `src/compras/`: `reglas.js`, `almacenamiento.js`, `solicitudes.js`, `cotizaciones.js`, `recepciones.js`, `facturas.js`, `devoluciones.js`, `catalogo.js`, `evaluaciones.js`, `panel.js` y `semilla.json`.
- [ ] T003 [P] Crear la estructura de pruebas en `tests/unit/compras/` y `tests/integration/compras/`.

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: infraestructura común que debe existir antes de cualquier historia.

- [ ] T004 Configurar `src/module-config.js` para Compras: Proveedor como Entidad y Orden de Compra como Documento, con mapeo de campos base, campos personalizados y ciclo de vida de OC definido en `plan.md`.
- [ ] T005 [P] Implementar en `src/compras/reglas.js` las funciones puras de validación de RUT, cálculo de montos con IVA 19 %, transiciones de estado, conciliación, vencimientos y nota de plazo. [FR-012]
- [ ] T006 [P] Implementar en `src/compras/almacenamiento.js` las colecciones `erp_compras:*` con el contrato del template (`load`, `save`, `add`, `update`, `delete`), arrays `lineas` para detalles y validadores de unicidad. Manejar `localStorage` lleno o deshabilitado sin perder lo que el usuario tenía en pantalla.
- [ ] T007 [P] Implementar el cargador de datos semilla en `src/compras/almacenamiento.js`, con carga en la primera ejecución y mensaje claro si falla.
- [ ] T008 Crear `src/compras/semilla.json` con datos completamente ficticios: 4 centros de costo, 6 usuarios (los 5 roles y un segundo solicitante), 8 proveedores (uno bloqueado, uno con cuenta cambiada hace menos de 30 días y uno persona natural), 20 productos y registros en todos los estados, incluidas cotizaciones, recepciones, facturas, notas de crédito, devoluciones y evaluaciones. [FR-020]
- [ ] T009 Cargar `PRODUCTO`, `USUARIO` y `CENTRO_COSTO` como datos maestros de solo lectura mientras Inventario, RR.HH. y Contabilidad no estén conectados. [IR-001]
- [ ] T010 Implementar el selector de usuario/rol simulado en `src/app.js` o componente de compras, con los roles `solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`, y un helper de autorización reutilizable.

**Punto de control**: base lista; las historias pueden comenzar.

---

## Fase 3: Historia de Usuario 1 - Gestionar proveedores (P1)

**Objetivo**: crear, editar, buscar, aprobar y bloquear proveedores con validación de RUT, condición de pago legal, bloqueo de eliminación y enmascaramiento de datos sensibles.

**Prueba Independiente**: crear un proveedor con RUT válido, encontrarlo, cambiar su estado a `aprobado` y luego a `bloqueado`; rechazar RUT inválido, RUT duplicado y condición de pago mayor a 30 días sin acuerdo.

- [ ] T011 [US1] Extender el almacenamiento de proveedores sobre la Entidad base con todos los campos de `data-model.md`: tipo de persona, giro, región, tamaño, estado, condición de pago, acuerdo de plazo mayor, datos bancarios y `fecha_cambio_cuenta`. [FR-001]
- [ ] T012 [US1] Implementar validación de RUT chileno (formato y dígito verificador) y unicidad, impidiendo guardar y sugiriendo el registro existente cuando corresponda. [FR-001]
- [ ] T013 [US1] Implementar la lista y búsqueda de proveedores sobre la gestión de entidades base. [FR-001]
- [ ] T014 [US1] Implementar el formulario de proveedor con campos obligatorios y la regla de que una condición de pago mayor a 30 días exige `acuerdo_plazo_mayor` (Ley 21.131). [FR-001, FR-002]
- [ ] T015 [US1] Implementar el cambio de estado `potencial → aprobado → bloqueado` y restringir la emisión de OC solo a proveedores `aprobado`. [FR-001, FR-010]
- [ ] T016 [US1] Impedir eliminar proveedores con órdenes de compra y ofrecer bloquearlos en su lugar. Las OC abiertas siguen su curso y no se permiten OC nuevas a un proveedor bloqueado. [FR-003]
- [ ] T017 [US1] Enmascarar el RUT de personas naturales y el número de cuenta bancaria para roles distintos de `admin_ti`; permitir editar datos bancarios solo a `admin_ti` y actualizar `fecha_cambio_cuenta` al modificarlos. [FR-004]
- [ ] T018 [US1] Agregar pruebas unitarias de RUT, condición de pago, enmascaramiento y eliminación/bloqueo en `tests/unit/compras/reglas.test.js`.
- [ ] T019 [US1] Agregar prueba de integración del flujo completo de US1 en `tests/integration/compras/us1-proveedores.test.js`.

**Punto de control**: gestión de proveedores funcional.

---

## Fase 4: Historia de Usuario 2 - Crear y aprobar solicitudes de compra (P1)

**Objetivo**: crear solicitudes con líneas, enviarlas y aprobarlas o rechazarlas con segregación de funciones.

**Prueba Independiente**: un solicitante crea una solicitud de dos productos y la envía; el jefe de compras la aprueba y queda `aprobada` con número `SC-AAAA-NNNN`; no puede aprobar su propia solicitud.

- [ ] T020 [US2] Crear los esquemas de `SOLICITUD_COMPRA` y sus `lineas` de detalle en `src/compras/almacenamiento.js`, conforme a `data-model.md`. [FR-005]
- [ ] T021 [US2] Implementar la creación y edición de solicitudes con al menos un producto activo, justificación, fecha requerida, centro de costo, prioridad y cálculo de `monto_estimado`. [FR-005]
- [ ] T022 [US2] Implementar la numeración correlativa `SC-AAAA-NNNN` y las transiciones `borrador → enviada → aprobada | rechazada`, `aprobada → en_cotizacion → adjudicada` y `anulada` antes de `adjudicada`. [FR-005]
- [ ] T023 [US2] Impedir enviar solicitudes sin productos y restringir al `solicitante` a ver y crear solo sus propias solicitudes. [FR-005, FR-018]
- [ ] T024 [US2] Implementar aprobación y rechazo solo por `jefe_compras` o `admin_ti` distinto del solicitante; el rechazo exige motivo y se registra el aprobador con su fecha. [FR-006]
- [ ] T025 [US2] Agregar pruebas unitarias de transiciones, autoaprobación bloqueada, rechazo sin motivo y solicitud vacía en `tests/unit/compras/solicitudes.test.js`.
- [ ] T026 [US2] Agregar prueba de integración del flujo completo de US2 en `tests/integration/compras/us2-solicitudes.test.js`.

**Punto de control**: solicitudes de compra funcionales.

---

## Fase 5: Historia de Usuario 3 - Emitir órdenes de compra (P1)

**Objetivo**: registrar y comparar cotizaciones cuando corresponda, y emitir OC desde una solicitud aprobada, con cotización seleccionada o como compra directa bajo el umbral.

**Prueba Independiente**: con una solicitud aprobada bajo el umbral, el comprador emite una OC `OC-AAAA-NNNN` con neto, IVA y total, y la solicitud pasa a `adjudicada`; sobre el umbral exige 3 cotizaciones o justificación de proveedor único.

- [ ] T027 [US3] Crear el esquema de `COTIZACION_PROVEEDOR` con sus `lineas`, restricción de una cotización por solicitud y proveedor, y registro solo para solicitudes `aprobada` o `en_cotizacion`; la primera cotización mueve la solicitud a `en_cotizacion`. [FR-007]
- [ ] T028 [US3] Implementar el registro y actualización de cotizaciones en `src/compras/cotizaciones.js` y la vista de comparación lado a lado con precio, plazo, condición de pago y evaluación promedio del proveedor. [FR-007]
- [ ] T029 [US3] Marcar cotizaciones como `vencidas` al superar `fecha_validez` sin selección, exigir `motivo_descarte` al descartar y permitir una sola cotización `seleccionada` por solicitud. [FR-009]
- [ ] T030 [US3] Exigir al menos 3 cotizaciones o una `justificacion_proveedor_unico` no vacía para seleccionar una cotización cuando `monto_estimado` sea igual o superior a `UMBRAL_COTIZACIONES`. [FR-008]
- [ ] T031 [US3] Implementar la creación de OC desde una cotización `seleccionada`: mismo proveedor, copia de líneas y precios, solicitud `adjudicada` y proveedor en estado `aprobado`. [FR-010]
- [ ] T032 [US3] Permitir la compra directa sin cotización solo si `monto_estimado < UMBRAL_COTIZACIONES` y el proveedor está `aprobado`; sobre el umbral, impedirla y exigir cotizaciones. [FR-010]
- [ ] T033 [US3] Impedir más de una OC no anulada por solicitud y más de una OC por cotización. [FR-011]
- [ ] T034 [US3] Implementar la numeración `OC-AAAA-NNNN` y el cálculo de subtotales, neto, IVA 19 % y total en CLP enteros. [FR-012]
- [ ] T035 [US3] Implementar la anulación de una OC solo si no tiene recepciones, dejando registro de auditoría; la solicitud vuelve a `en_cotizacion` si tiene cotizaciones o a `aprobada` si no las tiene, y puede emitirse una nueva OC. [FR-011]
- [ ] T036 [US3] Agregar pruebas unitarias de cotizaciones, umbral, cotización vencida, descarte, duplicidad de OC y cálculos de montos en `tests/unit/compras/cotizaciones.test.js` y `tests/unit/compras/reglas.test.js`.
- [ ] T037 [US3] Agregar prueba de integración del flujo completo de US3 en `tests/integration/compras/us3-ordenes-compra.test.js`.

**Punto de control**: cotizaciones y órdenes de compra funcionales.

---

## Fase 6: Historia de Usuario 4 - Registrar recepciones (P1)

**Objetivo**: registrar recepciones parciales o totales por línea, sin exceder lo pendiente y con separación entre compra y bodega.

**Prueba Independiente**: sobre una OC de 10 unidades se registran 6 aceptadas y la OC queda `recibida_parcial`; luego 4 más la dejan `recibida_total`; aceptar 5 con 4 pendientes se impide.

- [ ] T038 [US4] Crear los esquemas de `RECEPCION` y `DETALLE_RECEPCION` en `src/compras/almacenamiento.js`, referenciando la línea de OC recibida. [FR-013]
- [ ] T039 [US4] Implementar el registro de recepciones en `src/compras/recepciones.js` para OC en estado `emitida` o `recibida_parcial`, con cantidades aceptadas por línea que no superen lo pendiente. [FR-013]
- [ ] T040 [US4] Exigir motivo cuando haya unidades rechazadas; si llega más de lo pedido, aceptar solo lo pendiente y registrar el excedente como rechazado con motivo `no_corresponde`. [FR-013]
- [ ] T041 [US4] Impedir que el comprador que emitió la OC registre su recepción y restringir la operación al rol `bodega` (o `admin_ti` para auditoría), manteniendo la segregación de funciones. [FR-014]
- [ ] T042 [US4] Actualizar automáticamente el estado de la OC a `recibida_parcial` o `recibida_total` según la suma de cantidades aceptadas por línea. [FR-013]
- [ ] T043 [US4] Dejar disponibles las cantidades aceptadas de cada recepción para que Inventario actualice el stock, usando `id_producto`. [IR-002]
- [ ] T044 [US4] Agregar pruebas unitarias de tope por línea, motivo de rechazo, segregación y actualización de estado en `tests/unit/compras/recepciones.test.js`.
- [ ] T045 [US4] Agregar prueba de integración del flujo completo de US4 en `tests/integration/compras/us4-recepciones.test.js`.

**Punto de control**: recepciones funcionales.

---

## Fase 7: Historia de Usuario 5 - Panel de pendientes y alertas por rol (P1)

**Objetivo**: mostrar al ingresar solo los pendientes que corresponden al rol, las alertas de vencimiento y los indicadores del período.

**Prueba Independiente**: un jefe de compras con dos solicitudes enviadas y una factura que vence en 3 días abre el panel, ve esos tres pendientes con acceso directo y, al aprobar una solicitud, el contador baja sin recargar la página.

- [ ] T046 [US5] Crear el componente de panel en `src/compras/panel.js` e integrarlo en la navegación principal de la aplicación. [FR-018]
- [ ] T047 [US5] Mostrar pendientes por rol con contador y acceso directo: solicitudes por aprobar, OC sin recepción, recepciones por registrar y facturas por conciliar. El `solicitante` solo ve sus propias solicitudes y no los pendientes de otros usuarios. [FR-018]
- [ ] T048 [US5] Mostrar una alerta destacada para facturas no aprobadas que vencen en 5 días o menos, con proveedor, folio y días restantes. [FR-017]
- [ ] T049 [US5] Listar como pendientes de seguimiento las OC emitidas sin recepción registrada por más de 7 días, visibles para `bodega` y `comprador`. [FR-018]
- [ ] T050 [US5] Calcular y mostrar los indicadores del período seleccionado (mes actual): monto comprometido en OC no anuladas, órdenes abiertas y facturas aprobadas para pago. [FR-018]
- [ ] T051 [US5] Implementar el estado vacío del panel cuando no hay pendientes y actualizar los contadores sin recargar la página tras una acción. [FR-018]
- [ ] T052 [US5] Agregar acciones rápidas por rol para crear solicitud, OC, recepción o registrar factura según corresponda. [FR-018]
- [ ] T053 [US5] Agregar prueba de integración de US5 que cubra los seis escenarios y SC-005 en `tests/integration/compras/us5-panel.test.js`.

**Punto de control**: panel de compras funcional.

---

## Fase 8: Historia de Usuario 7 - Registrar y conciliar facturas (P2)

**Objetivo**: registrar facturas y notas de crédito contra OC con recepciones, conciliar a tres vías y aprobar para pago solo lo conciliado y dentro de plazo.

**Prueba Independiente**: sobre una OC recibida de 10.000 CLP neto, una factura por el mismo valor queda `conciliada`; una por 15.000 CLP queda `con_discrepancia` y no puede aprobarse para pago.

- [ ] T054 [US7] Crear el esquema `FACTURA_PROVEEDOR` en `src/compras/almacenamiento.js` con `tipo_documento`, folio único por proveedor y tipo de documento, y validación de que la OC tenga al menos una recepción. [FR-015]
- [ ] T055 [US7] Implementar el registro manual de facturas y notas de crédito en `src/compras/facturas.js`, con neto, IVA y total tal como vienen en el documento. [FR-015]
- [ ] T056 [US7] Implementar la conciliación a tres vías en `src/compras/reglas.js`: comparar el neto de la factura contra el valor recibido de la OC menos devoluciones y menos el neto de facturas anteriores no rechazadas; las notas de crédito restan. Clasificar como `conciliada` o `con_discrepancia` según `TOLERANCIA_CONCILIACION`. [FR-016]
- [ ] T057 [US7] Calcular `fecha_vencimiento` desde la fecha de recepción de la factura y la condición de pago de la OC, y alertar las facturas no aprobadas que vencen en 5 días o menos. [FR-017]
- [ ] T058 [US7] Impedir folios duplicados por proveedor y tipo de documento, impedir aprobar facturas `con_discrepancia` y permitir pasar a `aprobada_pago` solo una factura `conciliada`, con rol `jefe_compras`. [FR-015, FR-016]
- [ ] T059 [US7] Emitir una alerta de posible fraude al aprobar una factura de un proveedor cuya cuenta bancaria cambió hace menos de 30 días. [FR-004]
- [ ] T060 [US7] Dejar disponibles las facturas `aprobada_pago` para Contabilidad como cuentas por pagar. [IR-003]
- [ ] T061 [US7] Agregar pruebas unitarias de conciliación con y sin discrepancia, tolerancia, nota de crédito, folio duplicado y bloqueo de aprobación en `tests/unit/compras/facturas.test.js`.
- [ ] T062 [US7] Agregar prueba de integración del flujo completo de US7 en `tests/integration/compras/us7-facturas.test.js`.

**Punto de control**: conciliación de facturas funcional.

---

## Fase 9: Historia de Usuario 11 - Registrar devoluciones y notas de crédito (P2)

**Objetivo**: descontar del saldo recibido y facturado lo que no cumple, con documentos trazables y segregación de funciones.

**Prueba Independiente**: sobre una OC `recibida_total` facturada por 100.000 CLP neto, una devolución de 20.000 CLP por defectuosos baja el saldo pendiente a 80.000 CLP y una factura posterior por ese monto queda `conciliada`.

- [ ] T063 [US11] Crear el esquema de `DEVOLUCION` y su detalle en `src/compras/devoluciones.js` y `erp_compras:devoluciones`, con correlativo `DEV-AAAA-NNNN`, relación a la OC y a la línea de OC. [FR-015]
- [ ] T064 [US11] Implementar el registro de devoluciones con línea, cantidad y motivo; descontar la cantidad del saldo recibido y no permitir devolver más de lo aceptado. [FR-015]
- [ ] T065 [US11] Implementar notas de crédito contra una factura ya registrada: deben asociarse a OC y factura, no pueden superar el monto facturado y su folio es único por proveedor y tipo de documento. [FR-015]
- [ ] T066 [US11] Cuando la devolución o nota de crédito reduzca el saldo pendiente a cero, cerrar la OC y dar por saldada la factura sin pasarla a `aprobada_pago` por el monto descontado. [FR-016]
- [ ] T067 [US11] Si quien registró la recepción intenta registrar la devolución, exigir la aprobación de un `jefe_compras` o `admin_ti` distinto. [FR-014]
- [ ] T068 [US11] Agregar pruebas unitarias de devoluciones, notas de crédito, topes, duplicidad, cierre de OC y segregación en `tests/unit/compras/devoluciones.test.js`.
- [ ] T069 [US11] Agregar prueba de integración del flujo completo de US11 en `tests/integration/compras/us11-devoluciones.test.js`.

**Punto de control**: devoluciones y notas de crédito funcionales; ciclo de P2 cerrado.

---

## Fase 10: Soporte de Adquisiciones

**Propósito**: cubrir las entidades clave y requisitos que no tienen historia propia en `spec.md`, sin crear historias artificiales.

- [ ] T070 [SOPORTE] Implementar el catálogo proveedor-producto en `src/compras/catalogo.js`: relación única proveedor/producto, precio de referencia, plazo de entrega y fecha de actualización; marcar como desactualizados los precios con más de 90 días y sugerir el menor precio de referencia al crear líneas de solicitud. [Entidad PROVEEDOR_PRODUCTO]
- [ ] T071 [SOPORTE] Implementar la evaluación de proveedores en `src/compras/evaluaciones.js`: una sola evaluación por OC en estado `recibida_total` o `cerrada`, con `nota_plazo` calculada por días de atraso (0 días → 5; 1-3 → 4; 4-7 → 3; 8-14 → 2; más de 14 → 1) y promedio visible en la comparación de cotizaciones y en la ficha del proveedor. [FR-019]
- [ ] T072 [SOPORTE] Agregar pruebas unitarias de catálogo y evaluación en `tests/unit/compras/catalogo.test.js` y `tests/unit/compras/evaluaciones.test.js`.

**Punto de control**: adquisiciones y evaluación de proveedores funcionales.

---

## Fase 11: Pulido y Aspectos Transversales

**Propósito**: integración final, parámetros, rendimiento, casos límite y documentación.

- [ ] T073 Integrar todas las pantallas en la navegación y aplicar controles de interfaz basados en rol en todo el módulo, respetando las restricciones de `spec.md`.
- [ ] T074 Parametrizar `UMBRAL_COTIZACIONES` y `TOLERANCIA_CONCILIACION` en configuración y dejar registrados los valores acordados con el grupo (propuesta: 1.000.000 CLP neto y 1 % del neto). [FR-021, FR-022]
- [ ] T075 Ejecutar y completar las pruebas unitarias de todas las reglas de la sección 5 de `data-model.md`. [SC-007]
- [ ] T076 Ejecutar las pruebas de integración de los flujos P1 (US1 a US5) y P2 (US7 y US11).
- [ ] T077 Verificar rendimiento con hasta 500 registros por colección y los tiempos de SC-001 (solicitud de 3 productos en menos de 2 minutos) y SC-006. [SC-001, SC-006]
- [ ] T078 Ejecutar la demostración de extremo a extremo de SC-002 en menos de 5 minutos: solicitud, 3 cotizaciones, OC, recepción y factura conciliada. [SC-002]
- [ ] T079 Validar los casos límite de `spec.md`: anulación de OC con cotización seleccionada, nota de crédito, sobreentrega, producto desactivado con solicitudes abiertas, proveedor bloqueado con OC abiertas y `localStorage` lleno o deshabilitado.
- [ ] T080 Actualizar el README con instrucciones de ejecución, roles, datos semilla y alcance del módulo de compras.

---

## Dependencias y Orden de Ejecución

### Dependencias de Fases

- **Configuración (Fase 1)**: sin dependencias; T001 es bloqueante.
- **Fundacional (Fase 2)**: depende de Fase 1 y bloquea todas las historias.
- **US1 (Fase 3)**: depende de Fundacional.
- **US2 (Fase 4)**: depende de Fundacional; no depende de US1.
- **US3 (Fase 5)**: depende de US1 (proveedor aprobado) y US2 (solicitud aprobada).
- **US4 (Fase 6)**: depende de US3.
- **US5 (Fase 7)**: depende de US2, US3, US4 y US7 para mostrar todos sus pendientes; puede desarrollarse con datos semilla antes de US7.
- **US7 (Fase 8)**: depende de US4.
- **US11 (Fase 9)**: depende de US7 y de la recepción de US4.
- **Soporte (Fase 10)**: catálogo puede iniciarse tras Fundacional; evaluación requiere US4.
- **Pulido (Fase 11)**: al finalizar todas las historias.

### Dependencias Críticas

- La plantilla base debe tener `src/` operativo y sus pruebas deben pasar antes de T002.
- Una solicitud sin aprobación no puede generar OC; una OC sin recepciones no puede recibir facturas; una factura con discrepancia no puede aprobarse para pago.
- La segregación de funciones debe respetarse en solicitudes, OC, recepciones y devoluciones.

---

## Estrategia de Implementación

### MVP Primero (Historias P1)

1. Configuración y verificación de la plantilla base.
2. Fundacional: configuración, reglas, almacenamiento, semilla y roles.
3. US1 (Proveedores).
4. US2 (Solicitudes).
5. US3 (Cotizaciones y OC).
6. US4 (Recepciones).
7. US5 (Panel).
8. Demostración del ciclo de extremo a extremo.

### Entrega Incremental

Agregar primero US7 (facturas), luego US11 (devoluciones y notas de crédito) y finalmente el soporte de catálogo y evaluación, manteniendo siempre el ciclo completo funcionando.

---

## Trazabilidad con Requisitos

### Requisitos Funcionales

| Requisito | Tareas |
|---|---|
| FR-001 | T011, T012, T013, T014, T015 |
| FR-002 | T014 |
| FR-003 | T016 |
| FR-004 | T017, T059 |
| FR-005 | T020, T021, T022, T023 |
| FR-006 | T024 |
| FR-007 | T027, T028 |
| FR-008 | T030 |
| FR-009 | T029 |
| FR-010 | T015, T031, T032 |
| FR-011 | T033, T035 |
| FR-012 | T005, T034 |
| FR-013 | T039, T040, T042 |
| FR-014 | T041, T067 |
| FR-015 | T054, T055, T058, T063, T064, T065 |
| FR-016 | T056, T066 |
| FR-017 | T048, T057 |
| FR-018 | T046, T047, T049, T050, T051, T052 |
| FR-019 | T071 |
| FR-020 | T008 |
| FR-021 | T074 |
| FR-022 | T074 |

### Requisitos de Integración

| Requisito | Tareas |
|---|---|
| IR-001 | T009 |
| IR-002 | T043 |
| IR-003 | T060 |

### Criterios de Éxito

| Criterio | Tareas |
|---|---|
| SC-001 | T077 |
| SC-002 | T078 |
| SC-003 | T030, T033 |
| SC-004 | T044 |
| SC-005 | T048, T053 |
| SC-006 | T077 |
| SC-007 | T075 |

### Historias de Usuario

| Historia | Prioridad | Tareas |
|---|---|---|
| US1 - Gestionar proveedores | P1 | T011-T019 |
| US2 - Crear y aprobar solicitudes | P1 | T020-T026 |
| US3 - Emitir órdenes de compra | P1 | T027-T037 |
| US4 - Registrar recepciones | P1 | T038-T045 |
| US5 - Panel de pendientes y alertas | P1 | T046-T053 |
| US7 - Registrar y conciliar facturas | P2 | T054-T062 |
| US11 - Registrar devoluciones y notas de crédito | P2 | T063-T069 |
