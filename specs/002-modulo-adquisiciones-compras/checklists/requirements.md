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
- [x] La sección Clarifications explicita la matriz unificada: RUT personal completo solo para `admin_ti` y parcial en auditoría para `jefe_compras`, RUT tributario completo para `comprador`, `jefe_compras` y `admin_ti` (solo recepciones para `bodega`), cuenta completa para `jefe_compras` y `admin_ti` y `****XXXX` para `comprador`, con edición exclusiva de `admin_ti` (FR-004, SC-009).
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

## Catálogos bancarios, CuentaRUT y semilla enriquecida (2026-11-25)

- [x] FR-038 enumera los doce bancos chilenos y los cinco tipos de cuenta, exige listas desplegables y determina la normalización de alias y el rechazo de valores fuera del catálogo.
- [x] FR-039 define el auto-relleno de CuentaRUT desde el cuerpo numérico del RUT del proveedor, el banco fijo `BancoEstado`, el aviso editable y la restricción de banco.
- [x] FR-040 fija las siete columnas del listado, el buscador amplio y sincronizado, y el mínimo de ocho proveedores sintéticos con RUT Módulo 11 y datos completos (semilla-base de 12).
- [x] FR-041 mantiene el botón **Cargar catálogo base de proveedores/insumos** para completar catálogos maestros sin borrar datos del usuario: agrega proveedores por `entity_id` ausente, carga los catálogos solo si están vacíos y conserva íntegramente los registros ya editados por el usuario.
- [x] US1 incorpora escenarios verificables para catálogos, auto-relleno, listado y carga base; SC-018 y SC-019 miden el cumplimiento.
- [x] `data-model.md` v1.5 documenta los nuevos atributos de PROVEEDOR, los catálogos de §3.3.1, la regla de CuentaRUT y la semilla de 12 proveedores en §9.3.
- [x] Las pruebas unitarias de catálogos y las pruebas de integración de proveedores y vista cubren banco, tipo de cuenta, auto-relleno, columnas, semilla y botón de carga base.

## Fidelidad de interfaz UI-01/UI-02 (2026-11-25)

- [x] UI-01 está explicitada en `spec.md`, `plan.md` y `tasks.md`: tipografía global `Plus Jakarta Sans` (400/500/600/700), paleta GitHub Dark `#0D1117/#161B22/#2F81F7` con Modo Claro `#F6F8FA/#FFFFFF/#0969DA`, fondo `public/login-bg.avif` en escala de grises, tarjeta central elevada, botón de tema circular `40x40px` fijo (`top:20px; right:20px`) con íconos SVG sol/luna sincronizados, campo dual correo/RUT y Mostrar/Ocultar clave sin subrayado.
- [x] UI-01 no expone selector visual de modo: el portal inicia con la semilla completa de 8 usuarios (`semilla.json` v3) y ofrece **Activar modo presentación** para desplegar el Directorio Interno de acceso rápido en un clic; al desactivar la presentación el directorio se oculta.
- [x] UI-02 está explicitada en `spec.md`, `plan.md` y `tasks.md`: única barra lateral `Compras` agrupada en `Panel / Adquisiciones / Compras` filtrada por `visibilidad.js`; KPI superiores con contadores numéricos explícitos sin `undefined`/`NaN`; `Pendientes por rol` con códigos completos (`SC-2026-0001`, `OC-2026-0001`, `FAC-1002`, `DEV-2026-0001`), badges con tilde y acciones/enlaces inferiores alineados al fondo de cada tarjeta.
- [x] Trazabilidad documental: FR-047/SC-024 cubren UI-01 y FR-048/SC-025 cubren UI-02; Fase 24/T174–T179 en `tasks.md` registra la alineación y el análisis.

## Precisión documental para la reconstrucción (2026-11-26)

- [x] `spec.md`, `plan.md` y `tasks.md` explican que `public/login-bg.avif` está respaldado en `specs/002-modulo-adquisiciones-compras/assets/login-bg.avif`, que se copia a `public/` si no existe al reconstruir y que se mantiene el degradado oscuro CSS de respaldo.
- [x] El modal de consentimiento fija `Preferencias de interfaz (tema y navegación)` y `Datos locales de demostración` en fila horizontal con `display: flex; align-items: center; gap: 10px; justify-content: flex-start; text-align: left`; el checkbox usa `width: auto; margin: 0; flex-shrink: 0`, queda a la izquierda del `<label>` y nunca se centra ni usa `width: 100%`.
- [x] Los botones `Aceptar` y `Solo esenciales` están alineados horizontalmente al pie del modal con separación adecuada.
- [x] UI-02 describe una única barra lateral izquierda con encabezado `Compras` y grupos `PANEL`, `ADQUISICIONES` y `COMPRAS` filtrados por `visibilidad.js`, sin botón superior azul duplicado `Compras` sobre `PANEL`.
- [x] La vista `Panel` usa el título/breadcrumb exacto `Panel › Resumen General` y la combinación `Panel › Panel` queda prohibida.
- [x] Los KPI se calculan por rol activo según `visibilidad.js`; `solicitante` ve solo sus solicitudes y las OC y recepciones asociadas, sin KPI ni conteos de `Facturas` ni de `Aprobadas para pago`.
- [x] Los KPI principales forman una fila horizontal compacta de hasta 4 tarjetas según el rol, con altura compacta, acento sutil superior/lateral, tipografía numérica clara e íconos SVG distintos por métrica; `Pendientes por rol` y `Alertas` quedan visibles sin scroll excesivo.
- [x] Las tablas exigen `padding` mínimo de `12px 14px` por celda y separación clara entre columnas, con `white-space: nowrap` en `CÓDIGO` (`PRV-001`) y `RUT` (`12.345.678-5`).
- [x] La columna `CUENTA` de `Proveedores` incluye banco y tipo de cuenta junto al número; `Catálogo` muestra estado activo/inactivo en estado/vigencia y `ACCIONES` solo contiene botones/enlaces según permisos del rol.
- [x] `data-model.md` y `spec.md` definen una sola semilla consolidada de 12 proveedores `PRV-001` a `PRV-012` con `razonSocial`, `nombreFantasia`, `giro`, `rut` válido Módulo 11, banco + tipo de cuenta + número, `estado` y `calificacion` completos, y prohíben la coexistencia o mezcla con `PROV-001` a `PROV-007`.
- [x] `tasks.md` registra las precisiones como Fase 25/T180–T183 y actualiza la trazabilidad de FR-023, FR-040, FR-047, FR-048, SC-024 y SC-025; `plan.md` concentra las decisiones en la sección de fidelidad.

## Auditoría de preparabilidad para reconstrucción (2026-11-26)

- [x] `plan.md` y `contracts/` listan las rutas exactas y las exportaciones que `src/app.js`, `src/main.js` y `src/module-config.js` importan de `src/compras/` y del núcleo base, incluido el alias `puedeVerDatosBancariosVisible`.
- [x] Los enlaces relativos al contrato `001-erp-base-module/contracts/entity-storage.md` apuntan a `specs/001-erp-base-module/contracts/entity-storage.md` desde `plan.md` y desde `contracts/`.
- [x] `plan.md`, `tasks.md` y `contracts/` prohíben modificar `src/storage.js`, `tests/unit/storage.test.js` y `eslint.config.mjs`, y distinguen la API real de `src/storage.js` de las operaciones `erp_compras:*` de `src/compras/almacenamiento.js`.
- [x] Las especificaciones no exigen paquetes ausentes de `package.json`: cero dependencias de ejecución, solo las `devDependencies` declaradas, CSV propio, fechas nativas y tipografía Google Fonts con respaldo `system-ui`.
- [x] `quickstart.md` y `plan.md` verifican `npx vitest run`, `npm run lint` y `npm run build`, y explican que `/speckit.implement` copia `assets/login-bg.avif` a `public/login-bg.avif` solo si no existe, conservando el degradado CSS de respaldo.

## Notas

- La codificación y el separador de las exportaciones CSV están explicitados en la sección Clarifications (UTF-8 con BOM y `;`) y se mantienen delegados a `plan.md` como fuente técnica detallada en FR-024, US10 y SC-010.
- La narrativa canónica acordada usa **necesito** en lugar de _quiero_; las historias mantienen el patrón Como / necesito / Para.
- La especificación está lista para `/speckit.clarify` o `/speckit.plan`.
