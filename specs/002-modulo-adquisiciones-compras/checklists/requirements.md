# Lista de Verificación de Calidad de la Especificación: Módulo Adquisiciones y Compras

**Propósito**: Validar la completitud y calidad de la especificación antes de proceder a la planificación
**Creada**: 2026-11-15
**Funcionalidad**: [Enlace a spec.md](spec.md)

## Calidad del Contenido

- [x] Sin detalles de implementación (lenguajes, frameworks, APIs)
- [x] Enfocada en el valor para el usuario y las necesidades del negocio
- [x] Escrita para partes interesadas no técnicas
- [x] Todas las secciones obligatorias completadas

## Completitud de los Requisitos

- [x] No quedan marcadores [NEEDS CLARIFICATION]
- [x] Los requisitos son comprobables y sin ambigüedades
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito son agnósticos a la tecnología (sin detalles de implementación)
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos límite están identificados
- [x] El alcance está claramente delimitado
- [x] Dependencias y suposiciones identificadas

## Preparación de la Funcionalidad

- [x] Todos los requisitos funcionales tienen criterios de aceptación claros
- [x] Los escenarios de usuario cubren los flujos principales
- [x] La funcionalidad cumple los resultados medibles definidos en los Criterios de Éxito
- [x] No hay filtración de detalles de implementación en la especificación

## Auditoría de formato y clarificaciones (2026-11-19)

- [x] US1 a US11 usan exactamente la misma estructura: encabezado `Historia de Usuario N - Título (Prioridad: Pn)`, narrativa **Como / necesito / para**, **Por qué esta prioridad**, **Prueba Independiente** y **Escenarios de Aceptación** con pasos **Dado (Dada/Dadas) / cuando / entonces**.
- [x] La sección Clarifications explicita el umbral de 1.000.000 CLP neto para exigir tres cotizaciones o justificación de proveedor único (FR-008, FR-021).
- [x] La sección Clarifications explicita la tolerancia de conciliación del 1 % del neto (FR-022).
- [x] La sección Clarifications explicita que solo `admin_ti` y `jefe_compras` ven sin enmascarar RUT de personas naturales y cuenta bancaria, y que solo `admin_ti` edita (FR-004).
- [x] La sección Clarifications explicita el CSV en UTF-8 con BOM y separador `;` (FR-024).
- [x] La sección Clarifications explicita el flujo completo de dañados y devoluciones con su enmascaramiento, trazabilidad, cadena documental, anulación y cambios bancarios (FR-025 a FR-030).
- [x] Existe un requisito de interfaz explícito (FR-032) que prohíbe las vistas genéricas del template base, con escenario de aceptación en US5 y criterio medible SC-014.

## Rediseño de permisos y navegación por rol (2026-11-23)

- [x] La tabla de roles ya no describe a `admin_ti` como "Acceso total"; lo define como administrador del sistema, y FR-004 enumera lo que conserva y lo que pierde.
- [x] La segregación de funciones se aplica sin excepciones por rol (FR-014, US4 escenario 4, data-model regla 8) y tiene criterio medible (SC-016).
- [x] FR-033 incluye la matriz de visibilidad de 10 vistas × 5 roles con leyenda ✏️ / 👁️ / —; US12 la cubre con escenarios y SC-015 la mide.
- [x] FR-034 define la navegación Panel / Adquisiciones / Compras con escenarios en US5 (7) y US12 (1, 3).
- [x] FR-035 define los pendientes e indicadores del panel por rol según data-model §8, con escenario en US5 (8).
- [x] FR-036 cubre las mejoras de UI (descripción en las acciones rápidas, sin tarjeta "Sesión activa", sección en el encabezado), con escenarios en US12 (7, 8, 9) y SC-017.
- [x] Las historias US1, US2, US4, US7, US8, US9 y US11 se alinearon con la matriz (sin contradicciones de actor ni de aprobador).
- [x] data-model.md v1.3 documenta en §6 el riesgo asumido de conciliación por el comprador y el cambio en §9; las reglas 2, 8 y 10 y las secciones §3.9 y §3.13 se alinearon.
- [x] US12 usa la misma estructura canónica que US1 a US11.

## Creación de solicitudes por los cinco roles y rol fijo por sesión (2026-11-23)

- [x] FR-005 da `crear_solicitud` a los cinco roles, con edición solo del autor y visibilidad acotada a las propias para `solicitante` y `bodega`; la matriz de FR-033 (fila Solicitudes) y US2 (escenarios 7 y 8) lo reflejan.
- [x] FR-006 cubre el caso límite del `jefe_compras` solicitante: aprueba otro `jefe_compras` y la semilla incluye un segundo usuario de ese rol; US2 (escenario 9) y los casos límite de "Permisos y navegación" lo prueban.
- [x] FR-037 fija el rol durante la sesión, reemplaza el selector **Rol Activo** por un indicador de solo lectura junto a **Cerrar sesión**, impide que `setRolActivo()` cambie el rol de una sesión iniciada y pide nombre a `jefe_compras`; US12 (escenarios 9 y 10) lo cubre.
- [x] La aclaración original de FR-037 está marcada como reemplazada por las nuevas aclaraciones del 2026-11-23, sin borrar su texto.
- [x] FR-034 y FR-036 ya no describen cambios de rol en vivo; los casos límite de enmascaramiento y de navegación se reescribieron para el rol fijo.
- [x] FR-035 muestra "Mis solicitudes" en el panel de los cinco roles, con escenario en US5 (9); el estado vacío de `bodega` y `admin_ti` solo invita a crear una solicitud (US5, escenario 6).
- [x] data-model.md v1.3 documenta en §6 el riesgo asumido de que el comprador cotice y emita la OC de una solicitud propia y el riesgo del ingreso simulado con rol fijo; §9 tiene una sola fila v1.3 con todos los cambios.
- [x] `research.md` registra las decisiones 12 (todos crean solicitudes; alternativas descartadas: `admin_ti` aprueba como excepción y rol `gerente`) y 13 (rol fijo por sesión; alternativa descartada: selector de rol libre).
- [x] `tasks.md` ajusta T121 (`crear_solicitud` para los cinco roles), agrega la Fase 20 (T146–T155) y actualiza la matriz de trazabilidad; `plan.md` registra T146–T155 en Deuda conocida.

## Notas

- La codificación y el separador de las exportaciones CSV están explicitados en la sección Clarifications (UTF-8 con BOM y `;`) y se mantienen delegados a `plan.md` como fuente técnica detallada en FR-024, US10 y SC-010.
- La narrativa canónica acordada usa **necesito** en lugar de _quiero_; las once historias son uniformes en ese punto y corresponden al patrón Como / Quiero / Para.
- La especificación está lista para `/speckit.clarify` o `/speckit.plan`.
