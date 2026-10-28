# Matriz de Trazabilidad - Módulo Adquisiciones y Compras (Versión Integrada)

**Proyecto:** ERP Grupo 06  
**Módulo:** 002 - Módulo Adquisiciones y Compras  
**Fecha:** 2026-10-27  
**Referencias:** [spec.md](../../specs/002-modulo-adquisiciones-compras/spec.md) | [data-model.md](../../specs/002-modulo-adquisiciones-compras/data-model.md)


## 1. Trazabilidad HU -> Escenario de Aceptación -> Caso de Prueba

| HU | Escenario Aceptación (Spec) | Caso de Prueba | Descripción | Tipo | Prioridad |
|---|---|---|---|---|---|
| **HU-01 Gestionar Proveedores** | 1. Crear proveedor con datos válidos → estado `potencial` | CP-COM-001-01 | Crear proveedor válido con RUT, razón social, giro, región | Funcional | P1 |
|  | 2. RUT inválido o ya registrado → impide y explica | CP-COM-001-02 | Validación de RUT (formato/DV) y unicidad | Validación | P1 |
|  | 3. Condición pago > 30 sin `acuerdo_plazo_mayor` → impide | CP-COM-001-03 | Cumplimiento Ley 21.131 | Regla de Negocio | P1 |
|  | 4. Eliminar proveedor con OC → impide y ofrece bloquear | CP-COM-001-04 | Integridad referencial | Integridad | P1 |
|  | 5. Rol distinto a `admin` → datos bancarios enmascarados y no editables | CP-COM-001-05 | Datos sensibles / permisos | Seguridad | P1 |
| **HU-02 Solicitudes de Compra** | 1. Enviar solicitud con productos → `enviada`, correlativo `SC-AAAA-NNNN`, monto estimado | CP-COM-002-01 | Creación y envío de solicitud | Funcional | P1 |
|  | 2. Jefe de compras aprueba → `aprobada`, registra aprobador y fecha | CP-COM-002-02 | Aprobación | Flujo | P1 |
|  | 3. Rechazar sin motivo → exige motivo | CP-COM-002-03 | Validación obligatoria | Validación | P1 |
|  | 4. Jefe de compras aprueba su propia solicitud → impide | CP-COM-002-04 | Segregación de funciones | Segregación | P1 |
|  | 5. Solicitud sin productos → impide envío | CP-COM-002-05 | Validación | Validación | P1 |
| **HU-03 Órdenes de Compra** | 1. Compra directa bajo umbral → `emitida`, IVA 19%, solicitud pasa a `adjudicada` | CP-COM-003-01 | Emisión bajo umbral | Funcional | P1 |
|  | 2. Sobre umbral sin cotizaciones → impide | CP-COM-003-02 | Umbral cotizaciones | Regla de Negocio | P1 |
|  | 3. Proveedor `potencial`/`bloqueado` → impide | CP-COM-003-03 | Estado proveedor | Validación | P1 |
|  | 4. Cotización ya convertida → impide segunda OC | CP-COM-003-04 | Unicidad cotización-OC | Integridad | P1 |
|  | 5. Anular OC sin recepciones → `anulada`, solicitud vuelve a estado previo | CP-COM-003-05 | Anulación | Flujo | P1 |
| **HU-04 Recepciones** | 1. Recepción parcial/total → actualiza estado OC y pendientes | CP-COM-004-01 | Recepción parcial/total | Funcional | P1 |
|  | 2. Aceptar más de lo pendiente → impide | CP-COM-004-02 | Control de cantidades | Validación | P1 |
|  | 3. Rechazo sin motivo → exige motivo | CP-COM-004-03 | Validación obligatoria | Validación | P1 |
|  | 4. Quien emitió OC registra recepción → impide | CP-COM-004-04 | Segregación de funciones | Segregación | P1 |
| **HU-05 Panel de Compras** | 1. Acciones rápidas presentes | CP-COM-005-01 | UI Panel | Funcional | P1 |
|  | 2. Facturas por vencer ≤5 días → alertas destacadas | CP-COM-005-02 | Alertas plazo legal | Alertas | P1 |
|  | 3. Contadores se actualizan al volver al panel | CP-COM-005-03 | Sincronización UI | Integración UI | P1 |
| **HU-06 Cotizaciones** | 1. Primera cotización → solicitud pasa a `en_cotizacion` | CP-COM-006-01 | Cambio estado solicitud | Flujo | P2 |
|  | 2. Comparador muestra totales, plazo, condición pago y evaluación | CP-COM-006-02 | Comparación | Funcional | P2 |
|  | 3. >= umbral con < 3 cotizaciones sin justificación → impide seleccionar | CP-COM-006-03 | Umbral y justificación | Regla de Negocio | P2 |
|  | 4. Descartar cotización → exige motivo | CP-COM-006-04 | Trazabilidad | Validación | P2 |
|  | 5. Cotización vencida → aparece `vencida` y no seleccionable | CP-COM-006-05 | Validez | Regla | P2 |
| **HU-07 Facturas y Conciliación** | 1. Neto coincide dentro de tolerancia → `conciliada`, calcula vencimiento | CP-COM-007-01 | Conciliación 3 vías | Conciliación | P2 |
|  | 2. Excede tolerancia → `con_discrepancia`, muestra diferencia | CP-COM-007-02 | Discrepancia | Conciliación | P2 |
|  | 3. Factura con discrepancia → no permite aprobar para pago | CP-COM-007-03 | Control aprobación | Regla de Negocio | P2 |
|  | 4. Folio duplicado (proveedor + tipo + folio) → impide | CP-COM-007-04 | Unicidad | Integridad | P2 |
|  | 5. Cambio de cuenta < 30 días → advertencia fraude | CP-COM-007-05 | Alerta de riesgo | Riesgo/Fraude | P2 |
| **HU-08 Catálogo Proveedor-Producto** | 1. Par duplicado → actualiza en lugar de duplicar | CP-COM-008-01 | Unicidad (proveedor,producto) | Integridad | P2 |
|  | 2. Precio > 90 días sin actualizar → marcado desactualizado | CP-COM-008-02 | Calidad de datos | Alerta | P2 |
| **HU-09 Evaluación Proveedores** | 1. Nota plazo calculada por atraso, calidad/servicio ingresadas | CP-COM-009-01 | Cálculo automático | Cálculo | P3 |
|  | 2. OC ya evaluada → impide segunda evaluación | CP-COM-009-02 | Unicidad | Integridad | P3 |
| **HU-10 Exportar Reportes** | 1. CSV con filas filtradas, montos CLP sin decimales | CP-COM-010-01 | Exportación | Reportes | P3 |


## 2. Trazabilidad Requisitos Funcionales (FR) -> Casos de Prueba

| Requisito | Descripción | Casos de Prueba Relacionados | Estado Verificación |
|---|---|---|---|
| **FR-001** | Crear, editar, buscar, cambiar estado proveedores + validar RUT (formato/DV) y unicidad | CP-COM-001-01, CP-COM-001-02 | Pendiente ejecución |
| **FR-002** | Impedir condición pago > 30 sin acuerdo plazo mayor (Ley 21.131) | CP-COM-001-03 | Pendiente ejecución |
| **FR-003** | Impedir eliminar proveedores con OC; ofrecer bloquear | CP-COM-001-04 | Pendiente ejecución |
| **FR-004** | Enmascarar datos sensibles y registrar fecha cambio cuenta bancaria | CP-COM-001-05, CP-COM-007-05 | Pendiente ejecución |
| **FR-005** | Solicitudes con líneas, numeración correlativa `SC-AAAA-NNNN` | CP-COM-002-01 | Pendiente ejecución |
| **FR-006** | Impedir auto-aprobación y exigir motivo al rechazar | CP-COM-002-03, CP-COM-002-04 | Pendiente ejecución |
| **FR-007** | Cotizaciones solo para solicitudes aprobadas, una por proveedor y solicitud | CP-COM-006-01 | Pendiente ejecución |
| **FR-008** | Exigir >=3 cotizaciones o justificación proveedor único si monto >= umbral | CP-COM-003-02, CP-COM-006-03 | Pendiente ejecución |
| **FR-009** | Exigir motivo al descartar y marcar vencidas por fecha validez | CP-COM-006-04, CP-COM-006-05 | Pendiente ejecución |
| **FR-010** | Emitir OC solo con solicitud aprobada y proveedor aprobado; copiar desde cotización seleccionada | CP-COM-003-01, CP-COM-003-03, CP-COM-006-01 | Pendiente ejecución |
| **FR-011** | Impedir >1 OC no anulada por solicitud y >1 OC por cotización | CP-COM-003-04, CP-COM-003-05 | Pendiente ejecución |
| **FR-012** | Calcular subtotales, neto, IVA 19%, total en CLP enteros | CP-COM-003-01, CP-COM-007-01 | Pendiente ejecución |
| **FR-013** | Recepciones parciales, no aceptar más de lo pendiente, actualizar estado OC | CP-COM-004-01, CP-COM-004-02 | Pendiente ejecución |
| **FR-014** | Impedir que quien emitió OC registre su recepción | CP-COM-004-04 | Pendiente ejecución |
| **FR-015** | Facturas/notas de crédito solo contra OC con recepciones, folio único por proveedor/tipo | CP-COM-007-01, CP-COM-007-04, CP-COM-LIM-02 | Pendiente ejecución |
| **FR-016** | Conciliar contra valor recibido pendiente, clasificar `conciliada`/`con_discrepancia`, aplicar tolerancia | CP-COM-007-01, CP-COM-007-02 | Pendiente ejecución |
| **FR-017** | Calcular fecha vencimiento desde fecha recepción + alertar ≤5 días sin aprobar | CP-COM-005-02, CP-COM-007-01 | Pendiente ejecución |
| **FR-018** | Panel con acciones rápidas, pendientes por rol, alertas, indicadores | CP-COM-005-01, CP-COM-005-02, CP-COM-005-03 | Pendiente ejecución |
| **FR-019** | Una evaluación por OC recibida, nota plazo calculada | CP-COM-009-01, CP-COM-009-02 | Pendiente ejecución |
| **FR-020** | Datos semilla completamente ficticios | Verificación general | Pendiente ejecución |
| **FR-021/FR-022** | Parámetros configurables `UMBRAL_COTIZACIONES` y `TOLERANCIA_CONCILIACION` | Verificación con datos de prueba | Pendiente ejecución |


## 2.1 Trazabilidad Requisitos de Integración (IR) -> Casos de Prueba

| Requisito | Descripción | Casos de Prueba Relacionados | Estado Verificación |
|---|---|---|---|
| **IR-001** | PRODUCTO compartido con Inventario; Compras solo lo lee | CP-COM-INT-04, datos semilla | Pendiente ejecución |
| **IR-002** | Cantidades aceptadas en recepción quedan disponibles para Inventario | CP-COM-004-01, CP-COM-INT-02 | Pendiente ejecución |
| **IR-003** | Facturas `aprobada_pago` quedan disponibles para Contabilidad como cuentas por pagar | CP-COM-007-01, CP-COM-INT-03 | Pendiente ejecución |


## 3. Criterios de Éxito (SC) Trazados

| Criterio | Descripción | Validación Mediante |
|---|---|---|
| **SC-001** | Crear y enviar solicitud de 3 productos en < 2 minutos | CP-COM-002-01 (medición durante ejecución) |
| **SC-002** | Ciclo completo demo en < 5 minutos | CP-COM-INT-01 (medición durante ejecución) |
| **SC-003** | 100% OC sobre umbral con >=3 cotizaciones o justificación registrada | CP-COM-003-02, CP-COM-006-03 |
| **SC-004** | Ninguna recepción permite aceptar más unidades que las compradas | CP-COM-004-02, CP-COM-LIM-03 |
| **SC-005** | 100% facturas que vencen ≤5 días sin aprobación aparecen en panel | CP-COM-005-02 |
| **SC-006** | Listados/búsquedas ágiles con hasta 500 registros | Verificación general con datos semilla (rendimiento) |
| **SC-007** | Reglas cálculo/estado sección 5 data-model.md con pruebas unitarias que pasan | Revisión con suite `tests/unit/` (existente) + validación funcional |


## 4. Cobertura por Prioridad

| Prioridad | N° Casos | Casos |
|---|---|---|
| **P1** | 25 | HU-01 (5), HU-02 (5), HU-03 (5), HU-04 (4), HU-05 (3) |
| **P2** | 17 | HU-06 (5), HU-07 (5), HU-08 (2), Integración (5) |
| **P3** | 3 | HU-09 (2), HU-10 (1) |
| **Límites** | 5 | Casos límite (CP-COM-LIM-01 a 05) |
| **TOTAL** | **50** | Cobertura completa HU1-HU10 + Integración + Casos límite |


## 5. Seguimiento de Ejecución

| Estado | Cantidad | % |
|---|---|---|
| **No Ejecutado** | 50 | 100% |
| **En Ejecución** | 0 | 0% |
| **PASSED** | 0 | 0% |
| **FAILED** | 0 | 0% |
| **BLOCKED** | 0 | 0% |

**Responsable QA:** Por asignar  
**Fecha Objetivo Ejecución:** Por definir  
**Ambiente:** Local / Navegador con localStorage habilitado  
**Ciclo:** Pruebas Integradas - Módulo Compras v1.0
