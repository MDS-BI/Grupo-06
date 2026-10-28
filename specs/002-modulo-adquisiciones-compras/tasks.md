# Tasks: Módulo Adquisiciones y Compras

**Entrada**: Documentos de diseño desde `/specs/002-modulo-adquisiciones-compras/`

**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para historias de usuario), data-model.md (obligatorio)

**Pruebas**: Las pruebas son OPCIONALES - enfocarse en la implementación según el plan. Pruebas unitarias para reglas y pruebas de integración para flujos P1 según se indica.

**Organización**: Las tareas están agrupadas por historia de usuario para permitir la implementación y prueba independiente de cada historia.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos diferentes, sin dependencias)
- **[Historia]**: A qué historia de usuario pertenece esta tarea (ej. US1, US2, US3)
- Incluir rutas de archivo exactas en las descripciones

## Convenciones de Rutas

- **Proyecto único**: `src/`, `tests/` en la raíz del repositorio (extiende 001-erp-base-module)

---

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Preparar la estructura del módulo y verificar la dependencia de la plantilla base

- [ ] T001 Crear la estructura del módulo compras en src/compras/ (reglas.js, almacenamiento.js, solicitudes.js, cotizaciones.js, recepciones.js, facturas.js, catalogo.js, evaluaciones.js, panel.js)
- [ ] T002 [P] Crear la estructura de pruebas en tests/unit/compras/ y tests/integration/compras/
- [ ] T003 Crear semilla.json con datos ficticios en src/compras/semilla.json
- [ ] T004 Verificar que la estructura de la plantilla base exista (directorio src/ del módulo 001) - BLOQUEANTE según nota de dependencia del plan

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Infraestructura central para el módulo de compras que DEBE estar completa antes de CUALQUIER historia de usuario

**⚠️ CRÍTICO**: No se puede iniciar el trabajo en ninguna historia de usuario hasta completar esta fase

- [ ] T005 Configurar module-config.js para Compras (Proveedor como Entidad, Orden de Compra como Documento con mapeos y ciclo de vida)
- [ ] T006 [P] Implementar reglas de negocio en src/compras/reglas.js (validación de RUT, cálculos de montos con IVA 19%, transiciones, conciliación, alertas de vencimiento)
- [ ] T007 [P] Implementar capa de almacenamiento para colecciones de compras en src/compras/almacenamiento.js (prefijo erp_compras:* siguiendo el contrato base)
- [ ] T008 [P] Agregar cargador de datos semilla en src/compras/almacenamiento.js
- [ ] T009 Crear selector de usuario/rol (autenticación simulada) en src/app.js o componente de compras

**Punto de control**: Base lista - la implementación de historias de usuario ya puede comenzar

---

## Fase 3: Historia de Usuario 1 - Gestionar proveedores (Prioridad: P1) 🎯 MVP

**Objetivo**: Crear, editar, buscar, bloquear proveedores con validación de RUT, reglas de condiciones de pago, enmascaramiento de datos bancarios

**Prueba Independiente**: Crear proveedor con RUT válido, encontrarlo, cambiar estado a aprobado y luego a bloqueado; RUT/condiciones de pago inválidos bloqueados

### Implementación para Historia de Usuario 1

- [ ] T010 [US1] Extender almacenamiento para proveedores (usando Entidad base, con campos personalizados vía configuración)
- [ ] T011 [US1] Agregar validación de RUT (formato y dígito verificador) en src/compras/reglas.js
- [ ] T012 [US1] Implementar UI de lista/búsqueda de proveedores aprovechando la gestión de entidades base
- [ ] T013 [US1] Agregar formulario de proveedor con validación (RUT, giro, región, condiciones de pago máx 30 días sin acuerdo)
- [ ] T014 [US1] Implementar reglas de bloqueo/eliminación de proveedores (no se puede eliminar con OC, se debe bloquear; enmascarar datos bancarios por rol)
- [ ] T015 [US1] Agregar pruebas unitarias para validación de RUT en tests/unit/compras/reglas.test.js

**Punto de control**: Gestión de proveedores funcional

---

## Fase 4: Historia de Usuario 2 - Crear y aprobar solicitudes de compra (Prioridad: P1)

**Objetivo**: Crear solicitudes de compra con líneas, enviar para aprobación, aprobar/rechazar con reglas

**Prueba Independiente**: Solicitante crea y envía solicitud con 2 productos; jefe_compras aprueba; número SC generado, estado aprobada

### Implementación para Historia de Usuario 2

- [ ] T016 [P] [US2] Crear esquema SOLICITUD_COMPRA y DETALLE_SOLICITUD en src/compras/almacenamiento.js
- [ ] T017 [US2] Implementar creación de solicitudes con ítems de línea y cálculo de totales en src/compras/solicitudes.js
- [ ] T018 [US2] Agregar numeración SC-AAAA-NNNN
- [ ] T019 [US2] Implementar flujo de aprobación/rechazo (auto-aprobación bloqueada, rechazo requiere motivo)
- [ ] T020 [US2] Agregar pruebas unitarias para transiciones de estado de solicitudes en tests/unit/compras/

**Punto de control**: Solicitudes de compra funcionales

---

## Fase 5: Historia de Usuario 3 - Emitir órdenes de compra (Prioridad: P1)

**Objetivo**: Emitir OC desde solicitud aprobada o compra directa bajo umbral; copiar desde cotización si existe

**Prueba Independiente**: Desde solicitud aprobada bajo umbral, emitir OC sin cotización; OC-AAAA-NNNN generada con IVA 19%, solicitud pasa a adjudicada

### Implementación para Historia de Usuario 3

- [ ] T021 [US3] Implementar creación de OC desde solicitud en src/compras/ (usando Documento base según corresponda)
- [ ] T022 [US3] Agregar numeración de OC OC-AAAA-NNNN
- [ ] T023 [US3] Calcular neto/IVA/total (19%) en src/compras/reglas.js
- [ ] T024 [US3] Aplicar reglas: solo proveedor aprobado, umbral requiere cotizaciones si se supera, sin OC duplicada por solicitud/cotización
- [ ] T025 [US3] Implementar anulación de OC (si no tiene recepciones) devolviendo la solicitud al estado anterior
- [ ] T026 [US3] Agregar pruebas unitarias para cálculos y reglas de OC

**Punto de control**: Órdenes de compra funcionales

---

## Fase 6: Historia de Usuario 4 - Registrar recepciones (Prioridad: P1)

**Objetivo**: Registrar recepciones parciales/totales, no se puede exceder lo pendiente, receptor distinto del emisor

**Prueba Independiente**: OC con 10 unidades - recibir 6 aceptadas, OC pasa a recibida_parcial; recibir 4, pasa a recibida_total

### Implementación para Historia de Usuario 4

- [ ] T027 [P] [US4] Crear esquema RECEPCION y DETALLE_RECEPCION en src/compras/almacenamiento.js
- [ ] T028 [US4] Implementar registro de recepciones en src/compras/recepciones.js
- [ ] T029 [US4] Validar: no se puede aceptar más de lo pendiente, rechazo requiere motivo, emisor no puede recibir
- [ ] T030 [US4] Actualizar estado de OC automáticamente basado en recepciones
- [ ] T031 [US4] Agregar pruebas unitarias para validación de recepciones

**Punto de control**: Recepciones funcionales

---

## Fase 7: Historia de Usuario 5 - Panel de compras (Prioridad: P1)

**Objetivo**: Panel con acciones rápidas, pendientes por rol, alertas (facturas que vencen en 5 días)

**Prueba Independiente**: El panel muestra solicitudes por aprobar, OC por recibir, facturas próximas a vencer, gasto del mes

### Implementación para Historia de Usuario 5

- [ ] T032 [US5] Crear componente de panel de compras en src/compras/panel.js
- [ ] T033 [US5] Mostrar contadores de pendientes por rol
- [ ] T034 [US5] Mostrar alertas para facturas que vencen en <= 5 días
- [ ] T035 [US5] Agregar acciones rápidas para nueva solicitud/OC/recepción/factura
- [ ] T036 [US5] Integrar panel en la navegación principal de la aplicación

**Punto de control**: Panel de compras funcional

---

## Fase 8: Historia de Usuario 6 - Registrar y comparar cotizaciones (Prioridad: P2)

**Objetivo**: Registrar cotizaciones de múltiples proveedores, comparar lado a lado, seleccionar con justificación si es necesario

**Prueba Independiente**: Para solicitud sobre umbral registrar 3 cotizaciones; seleccionar una, descartar otras con motivo

### Implementación para Historia de Usuario 6

- [ ] T037 [P] [US6] Crear esquema COTIZACION_PROVEEDOR en src/compras/almacenamiento.js
- [ ] T038 [US6] Implementar registro de cotizaciones en src/compras/cotizaciones.js
- [ ] T039 [US6] Construir vista de comparación (precio, entrega, condiciones de pago, evaluación de proveedor)
- [ ] T040 [US6] Aplicar reglas: >=3 cotizaciones o justificación si supera umbral, descarte requiere motivo, cotizaciones vencidas bloqueadas
- [ ] T041 [US6] Agregar pruebas unitarias para reglas de cotizaciones

**Punto de control**: Cotizaciones funcionales

---

## Fase 9: Historia de Usuario 7 - Registrar y conciliar facturas de proveedor (Prioridad: P2)

**Objetivo**: Registrar factura/nota de crédito contra OC con recepciones, conciliación a tres bandas, flujo de aprobación

**Prueba Independiente**: OC con 6 unidades a 10000 CLP neto - factura por 60000 coincide (conciliada); factura por 80000 genera discrepancia

### Implementación para Historia de Usuario 7

- [ ] T042 [P] [US7] Crear esquema FACTURA_PROVEEDOR en src/compras/almacenamiento.js
- [ ] T043 [US7] Implementar registro de facturas en src/compras/facturas.js
- [ ] T044 [US7] Lógica de conciliación a tres bandas en src/compras/reglas.js (comparar contra valor recibido menos facturas previas, tolerancia)
- [ ] T045 [US7] Calcular fecha de vencimiento desde fecha de recepción, alertas para vencimientos próximos
- [ ] T046 [US7] Prevenir aprobación si hay discrepancia, prevenir factura duplicada por proveedor/folio
- [ ] T047 [US7] Agregar pruebas unitarias para conciliación

**Punto de control**: Conciliación de facturas funcional

---

## Fase 10: Historia de Usuario 8 - Catálogo de productos por proveedor (Prioridad: P2)

**Objetivo**: Asociar productos a proveedores con precio de referencia y tiempo de entrega

**Prueba Independiente**: Asociar producto a dos proveedores con distintos precios; sugerir el menor en la solicitud

### Implementación para Historia de Usuario 8

- [ ] T048 [P] [US8] Crear esquema PROVEEDOR_PRODUCTO en src/compras/almacenamiento.js
- [ ] T049 [US8] Implementar gestión de catálogo en src/compras/catalogo.js
- [ ] T050 [US8] Marcar precios con más de 90 días como desactualizados
- [ ] T051 [US8] Sugerir precio de referencia más bajo al crear líneas de solicitud

**Punto de control**: Catálogo de proveedores funcional

---

## Fase 11: Historia de Usuario 9 - Evaluar proveedores (Prioridad: P3)

**Objetivo**: Evaluar proveedor tras OC recibida/cerrada, calcular nota de plazo automáticamente

**Prueba Independiente**: OC recibida_total entregada 2 días tarde - evaluación otorga nota de plazo 4

### Implementación para Historia de Usuario 9

- [ ] T052 [P] [US9] Crear esquema EVALUACION_PROVEEDOR en src/compras/almacenamiento.js
- [ ] T053 [US9] Implementar evaluación en src/compras/evaluaciones.js
- [ ] T054 [US9] Calcular nota_plazo basado en retraso de entrega (0 días→5, 1-3→4, 4-7→3, 8-14→2, >14→1)
- [ ] T055 [US9] Solo una evaluación por OC

**Punto de control**: Evaluación de proveedores funcional

---

## Fase 12: Historia de Usuario 10 - Exportar reportes (Prioridad: P3)

**Objetivo**: Exportar listas filtradas a CSV

**Prueba Independiente**: Exportar lista filtrada de OC a CSV con montos en CLP

### Implementación para Historia de Usuario 10

- [ ] T056 [US10] Agregar funcionalidad de exportación a CSV
- [ ] T057 [US10] Exportar OC, facturas, gasto por centro de costo

**Punto de control**: Exportación de reportes funcional

---

## Fase 13: Pulido y Aspectos Transversales

**Propósito**: Integración, pruebas, carga de datos semilla, documentación

- [ ] T058 [P] Cargar datos semilla desde src/compras/semilla.json en la primera ejecución
- [ ] T059 [P] Agregar controles de interfaz basados en roles en toda la aplicación
- [ ] T060 [P] Implementar todas las alertas (facturas que vencen en 5 días, cotizaciones vencidas, actualización de precios requerida)
- [ ] T061 [P] Asegurar el cumplimiento estricto de la segregación de funciones en todos los componentes
- [ ] T062 Agregar pruebas de integración para flujos P1 (US1-US5)
- [ ] T063 Agregar pruebas de integración para flujos P2 (US6-US8)
- [ ] T064 Ejecutar todas las pruebas unitarias para reglas.js
- [ ] T065 Validar que el escenario de demostración (SC-002) funcione de extremo a extremo
- [ ] T066 Actualizar README con instrucciones del módulo de compras

---

## Dependencias y Orden de Ejecución

### Dependencias de Fases

- **Configuración (Fase 1)**: Sin dependencias - verificar primero que la plantilla base exista
- **Fundacional (Fase 2)**: Depende de Configuración - BLOQUEA todas las historias de usuario
- **Historias de Usuario**: Todas dependen de Fundacional
  - Historias P1 (US1-US5): Ciclo principal, realizar en orden
  - Historias P2 (US6-US8): Construyen sobre P1
  - Historias P3 (US9-US10): Deseables / Adicionales

### Dependencias Críticas

- La plantilla base (001) debe tener el directorio src/ y estar funcional
- La configuración del módulo debe mapear Proveedor/OC correctamente

---

## Estrategia de Implementación

### MVP Primero (Historias P1)

1. Configuración + verificar plantilla base
2. Fundacional (configuración, reglas, almacenamiento)
3. US1 (Proveedores)
4. US2 (Solicitudes)
5. US3 (OC)
6. US4 (Recepciones)
7. US5 (Panel)
8. **Demostración del ciclo de extremo a extremo**

### Entrega Incremental

Agregar historias P2 y posteriormente P3.