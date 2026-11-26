# Plan de Implementación: Módulo Adquisiciones y Compras

**Rama**: `002-modulo-adquisiciones-compras` | **Fecha**: 2026-10-27 | **Actualizado**: 2026-11-24 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-adquisiciones-compras/spec.md` y modelo de datos en [data-model.md](data-model.md)

## Resumen

Construir el módulo Adquisiciones y Compras **sobre el módulo base ERP del curso** (`specs/001-erp-base-module`), sin reemplazar su código central: `src/storage.js` y sus pruebas permanecen sin cambios funcionales (solo se aplicó formateo con Prettier). La interfaz final es **exclusiva del módulo**: `index.html` solo expone `#view-compras`, `#compras-root` y el indicador de sesión del usuario y rol (FR-037); no se muestran las vistas genéricas de Entidades, Documentos ni Búsqueda del template, conforme a FR-032 y SC-014. **Actualización 2026-11-24**: el rol queda fijo durante la sesión para los cinco roles y no existe control para cambiarlo en vivo. Se aplicaron mejoras UI/UX (KPI, acciones rápidas legibles, pendientes/flujo, tablas, badges, íconos SVG laterales, encabezado `Resumen General`, modo oscuro e IBM Plex Sans) sin modificar `src/storage.js`. El estado canónico de las Fases 16–23 se registra en [`tasks.md`](tasks.md); `spec.md` y este plan contienen solo un resumen con referencia cruzada.

Los proveedores reutilizan el contrato de Entidad del módulo base desde `src/compras/proveedores.js` sin tocar `src/storage.js`. El resto de documentos del ciclo (solicitudes, cotizaciones, OC, recepciones, facturas, devoluciones, catálogo, evaluaciones y trazabilidad) viven en colecciones propias `erp_compras:*` gestionadas desde `src/compras/almacenamiento.js`, siguiendo el mismo contrato de almacenamiento del template (`specs/001-erp-base-module/contracts/entity-storage.md`).

`src/module-config.js` conserva `userConfig = null`. La constante `COMPRAS_CONFIG` queda como configuración opcional de referencia histórica, pero **no se activa**: el enfoque de integrar Proveedor y OC en las vistas genéricas del template quedó descartado porque FR-032 exige que toda la navegación y el contenido visible pertenezcan a Adquisiciones y Compras.

El trabajo se divide en iteraciones semanales; cada una termina con una versión que corre y con avance visible en el repositorio.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS (igual que el template)  
**Dependencias Principales**: Vite; sin framework de interfaz (igual que el template)  
**Almacenamiento**: `localStorage` del navegador; las colecciones nuevas usan el prefijo `erp_compras:`  
**Codificación de exportaciones**: los archivos CSV usan UTF-8 con BOM y separador `;` para abrirse correctamente en Excel en español  
**Pruebas**: Vitest con jsdom (ya configurado en `vitest.config.mjs`)  
**Plataforma Objetivo**: Navegadores modernos de escritorio  
**Tipo de Proyecto**: Aplicación web de una página, solo frontend  
**Objetivos de Rendimiento**: listas y búsquedas en menos de 2 segundos con hasta 500 registros por colección, medidos con `performance.now()` en `tests/integration/compras/rendimiento.test.js` (SC-006). Protocolo: cada caso replica 500 registros por colección, mide una ejecución con `performance.now()` alrededor de la operación y aprueba si el tiempo transcurrido es menor al umbral (2 000 ms para SC-006 y 1 000 ms para SC-008)

**Restricciones**: Sin backend, sin autenticación real, sin conexión con el SII; no modificar el comportamiento del módulo base salvo donde se justifica en "Seguimiento de Complejidad"  
**Escala/Alcance**: 19 entidades lógicas (ver `data-model.md`), 13 historias de usuario, 5 roles simulados

## Verificación de la Constitución

_Según `.specify/memory/constitution.md` v1.0.0._

- **I. Calidad del código**: la lógica de negocio (cálculos, validaciones y transiciones de estado) vive en funciones puras en `src/compras/reglas.js`, separada de la interfaz y del almacenamiento.
- **II. Pruebas primero**: cada regla de la sección 5 de `data-model.md` tiene prueba unitaria antes o junto con su implementación; cada historia P1 tiene al menos una prueba de integración de su flujo.
- **III. Experiencia de usuario consistente**: todas las pantallas nuevas usan el marco del template (barra superior, barra lateral, tokens de `styles.css`), mensajes de validación en español y estados vacíos; encabezado con la sección actual y acciones rápidas rotuladas con una descripción legible, nunca con la clave interna del permiso. La accesibilidad (SC-013) se verifica en `tests/integration/compras/vista.test.js`: etiqueta por campo en las diez vistas, foco por teclado, errores junto al campo y contraste ≥ 4,5:1.
- **IV. Rendimiento**: las colecciones se leen una vez por pantalla y se filtran en memoria; el objetivo de 500 registros se verifica con los datos semilla ampliados.
- **Estándares de calidad**: antes de la entrega se ejecutan `npm run lint` (ESLint) y `npm run format:check` (Prettier). El alcance real de `format:check`, definido en `.prettierignore`, cubre todo el código fuente y las pruebas (`src/**`, `tests/**`, `index.html` y la configuración `.mjs`); excluye dependencias, artefactos generados, `specs/`, `docs/` y archivos Markdown/JSON. T107 queda cerrada con este alcance ampliado.

Resultado: **conforme en calidad de código**. La deuda conocida y el estado detallado se registran en [`tasks.md`](tasks.md) como fuente canónica; no queda deuda funcional pendiente, solo la validación humana externa indicada abajo.

**Puerta de cierre (Constitución II)**: las tareas funcionales T127, T137 y T139 están cerradas y las pruebas de FR-033 y FR-035 pasan. Queda como validación humana externa el recorrido manual de los escenarios 1 a 8 de `quickstart.md`.

## Arquitectura del módulo (`src/compras/`)

La interfaz final no usa las vistas genéricas del template: toda la navegación ocurre dentro de `#view-compras` y `#compras-root`, con el rol simulado que se fija al ingresar (FR-037), según FR-032 y SC-014. `src/module-config.js` mantiene `userConfig = null` y su `COMPRAS_CONFIG` solo como referencia de la iteración descartada por configuración. La barra lateral se agrupa en Panel / **Adquisiciones** (Proveedores, Catálogo, Evaluaciones) / **Compras** (Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones) y cada rol ve solo las vistas que le asigna la matriz de visibilidad (FR-033, FR-034). El encabezado muestra la sección actual y no existe tarjeta "Sesión activa": el usuario y el rol se ven solo en el indicador de solo lectura de la barra superior, junto a **Cerrar sesión** (FR-036).

**Rol fijo por sesión (FR-037)**: el rol se fija en `iniciarSesion()` (`src/compras/autenticacion.js`) y no cambia hasta `cerrarSesion()`. `src/app.js` deja de escuchar el `change` del antiguo selector `#rol-activo` y muestra en su lugar el indicador del usuario y rol; `setRolActivo()` (`src/compras/almacenamiento.js`) no modifica el rol de una sesión iniciada. `jefe_compras` pasa a pedir nombre al ingresar, igual que `solicitante` y `comprador`, para distinguir a los dos usuarios `jefe_compras` de la semilla.

**Creación de solicitudes por los cinco roles**: `crear_solicitud` pasa a incluir a los cinco roles en `PERMISOS`; `src/compras/solicitudes.js` limita la edición al autor y la visibilidad de `solicitante` y `bodega` a sus propias solicitudes, y la aprobación sigue exigiendo un `jefe_compras` distinto del solicitante (regla 8).

| Concepto del MER          | Almacenamiento físico real                                                                         | Observación                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| PROVEEDOR                 | Entidad del módulo base (`erp_base_module:entities`) gestionada desde `src/compras/proveedores.js` | `src/storage.js` permanece sin cambios; la vista genérica de Entidades no se expone (FR-032) |
| ORDEN_COMPRA + DETALLE_OC | `erp_compras:ordenes`, con `lineas`                                                                | No se mapea al Documento del template: sus estados y reglas son propias                      |

Cada colección nueva implementa las mismas operaciones del contrato del template (`load…`, `save…`, `add…`, `update…`, `delete…`) sobre su propia clave de `localStorage`. Las tablas de detalle del MER se guardan como arreglo `lineas` dentro de su documento padre, conservando su identificador para que la recepción pueda apuntar a una línea específica de la OC.

| Entidad lógica (MER)                      | Almacenamiento físico                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SOLICITUD_COMPRA + DETALLE_SOLICITUD      | `erp_compras:solicitudes`, con `lineas`                                                                                                       |
| COTIZACION_PROVEEDOR + DETALLE_COTIZACION | `erp_compras:cotizaciones`, con `lineas`                                                                                                      |
| RECEPCION + DETALLE_RECEPCION             | `erp_compras:recepciones`, con `lineas`                                                                                                       |
| FACTURA_PROVEEDOR                         | `erp_compras:facturas`                                                                                                                        |
| DEVOLUCION + DETALLE_DEVOLUCION           | `erp_compras:devoluciones`, con `lineas`                                                                                                      |
| PROVEEDOR_PRODUCTO                        | `erp_compras:catalogo`                                                                                                                        |
| EVALUACION_PROVEEDOR                      | `erp_compras:evaluaciones`                                                                                                                    |
| CONTACTO_PROVEEDOR                        | No implementado en el MVP (modelado en `data-model.md`, fuera de alcance en `spec.md`)                                                       |
| USUARIO, CENTRO_COSTO, PRODUCTO           | `erp_compras:usuarios`, `erp_compras:centros_costo`, `erp_compras:productos` (datos semilla hasta conectar RR.HH., Contabilidad e Inventario) |
| HISTORIAL_TRAZABILIDAD                    | `erp_compras:trazabilidad` (eventos inmutables: quién, cuándo, qué acción; cambios bancarios con la representación autorizada por `visibilidad.js`) |

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-modulo-adquisiciones-compras/
├── spec.md          (historias de usuario y requisitos)
├── plan.md          (este archivo)
├── research.md      (Fase 0: decisiones técnicas y alternativas)
├── data-model.md    (Fase 1: MER, diccionario de datos, reglas)
├── quickstart.md    (Fase 1: guion de validación de extremo a extremo)
├── contracts/       (Fase 1: contratos de almacenamiento e interfaces)
│   ├── almacenamiento-compras.md
│   └── exportacion-e-integracion.md
├── tasks.md         (Fase 2: tareas de implementación)
└── checklists/
    └── requirements.md  (verificación de calidad de la especificación)
```

### Código Fuente (raíz del repositorio)

```text
src/
├── module-config.js        (configuración base sin activar: COMPRAS_PARAMETROS y COMPRAS_CONFIG de referencia)
├── ...                     (archivos del módulo base, sin cambios salvo lo justificado)
└── compras/
    ├── reglas.js           (cálculos de montos, validación de RUT, transiciones, conciliación, nota de plazo; re-exporta enmascararRut/enmascararCuenta desde visibilidad.js)
    ├── almacenamiento.js   (colecciones erp_compras:* con el contrato del template, PERMISOS por rol, datosUsuario() con rut_visible e instantáneas por modo)
    ├── visibilidad.js      (matriz VISIBILIDAD, GRUPOS, nivelVista(), vistasVisibles() y matriz sensible de RUT/cuentas, FR-004/FR-025/FR-033/FR-034)
    ├── proveedores.js      (alta/edición, vistaProveedor() con rut_visible/cuenta_visible, cambio bancario auditado)
    ├── catalogos-bancarios.js (catálogos cerrados de bancos y tipos de cuenta, normalización de alias y auto-relleno de CuentaRUT, FR-038/FR-039)
    ├── cookies.js          (preferencias locales de la interfaz)
    ├── solicitudes.js      (pantalla y flujo de solicitudes)
    ├── cotizaciones.js     (registro y comparación)
    ├── ordenes-compra.js   (emisión, compra directa y anulación de OC)
    ├── recepciones.js
    ├── facturas.js
    ├── devoluciones.js     (devoluciones y notas de crédito)
    ├── catalogo.js
    ├── evaluaciones.js
    ├── panel.js            (pendientes, indicadores y alertas por rol, FR-035)
    ├── autenticacion.js    (ingreso simulado: Modo Demo/Real, correo o RUT, nombre condicional y rol fijo por sesión)
    ├── gobernanza.js       (modo de datos, parámetros dinámicos, OTP y notificaciones internas, FR-042/FR-044/FR-046)
    ├── administracion.js   (padrón, suspensión y desbloqueo de excepciones con OTP, FR-043/FR-045)
    ├── auditoria.js        (Log de Auditoría Forense inmutable y hash encadenado, FR-045)
    ├── asistente.js        (asistente local restringido, sin API keys ni backend)
    ├── vista.js            (pantallas de compras, navegación agrupada por rol y cadena documental)
    ├── exportacion.js      (CSV con BOM y permisos por rol, incluido trazabilidad.csv)
    ├── trazabilidad.js     (historial de eventos y cadena documental)
    └── semilla.json        (datos ficticios)

tests/
├── unit/compras/           (reglas.test.js, exportacion.test.js, configuracion.test.js, visibilidad.test.js,
│                            visibilidad-sensible.test.js, catalogos-bancarios.test.js, usuarios.test.js,
│                            otp.test.js, asistente-amable.test.js, cookies.test.js, semilla-version.test.js:
│                            reglas de data-model.md, sección 5, matriz FR-033 y catálogos/RBAC sensible)
└── integration/compras/    (flujos por historia: proveedores, flujo-compras, casos-limite, catalogo-panel, vista,
                             autenticacion, portal-corporativo, permisos, asistente, almacenamiento, trazabilidad,
                             rendimiento, usuarios, auditoria-forense; helpers.js compartido)
```

**Decisión de Estructura**: todo lo propio del módulo vive en `src/compras/` para no mezclarlo con el módulo base; así se puede actualizar el template sin pisar el trabajo del grupo y otros módulos pueden leer las colecciones `erp_compras:*`.

## Iteraciones (avances semanales)

| Iteración                           | Fechas          | Historias                                                                | Resultado esperado                                                                                                                                                           |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Base corriendo                   | 28-oct al 1-nov | —                                                                        | El template se ejecuta con `npm run dev` y pasan sus pruebas (ver dependencia crítica)                                                                                       |
| 1. Versión integrada de prueba      | 2 al 8-nov      | US1, US3 simplificada, US5 básico                                        | Proveedores y OC operando en pantallas propias de `#view-compras`, sin vistas genéricas del template; el enfoque por configuración se descartó por FR-032; panel con conteos |
| 2. Ciclo operativo                  | 9 al 15-nov     | US2, US4, US3 completa                                                   | Solicitud → OC → recepción; la OC se valida contra la solicitud aprobada, con líneas e IVA calculado                                                                         |
| 3. Adquisiciones y cierre del ciclo | 16 al 22-nov    | US6, US7, US8                                                            | Cotizaciones, conciliación de facturas, catálogo; demo del ciclo completo                                                                                                    |
| 4. Calidad                          | 23 al 26-nov    | US9, US10, US11, trazabilidad transversal (FR-027 a FR-030), indicadores | Evaluación, devoluciones/notas de crédito, CSV, historial de auditoría y cadena documental, README final; congelamiento del repositorio el 26-nov                            |
| 5. UI/UX y ajustes de sesión        | 24-nov          | Refuerzo parcial US5/US12, FR-036, FR-037, ajustes sesión/rol            | Mejoras UI/UX (KPI, acciones rápidas legibles, pendientes/flujo, tablas, badges, íconos SVG, encabezado `Resumen General`), modo oscuro, IBM Plex Sans y navegación lateral responsiva; rol fijo para los cinco roles y `crear_solicitud` para los cinco roles. Fases 17–23 según el estado canónico: T127 y T137/T139 cerradas. |

Cada historia se asigna a un responsable en un Issue de GitHub con la etiqueta de su iteración; los acuerdos de cada semana se registran en un Issue de seguimiento.

## Dependencia crítica

**Resuelta.** La carpeta `src/` (módulo base) se restauró desde el historial (`git checkout 501e9c6 -- src index.html`) y hoy está versionada en `HEAD` junto con `src/compras/`. Las pruebas del template (`tests/unit/storage.test.js`, entre otras) vuelven a encontrar sus dependencias.

## Estado de las Fases 16–23 (2026-11-25)

El registro detallado del estado de las Fases 16–23 y de la deuda conocida está en [`tasks.md`](tasks.md) como **fuente canónica**; aquí solo se mantiene este resumen con referencia cruzada. Las fases 16 a 23 están **cerradas con nota**: navegación agrupada, modo solo lectura, filtros por rol, panel FR-035, matriz RBAC de datos sensibles (Fase 21), catálogos bancarios (Fase 22) y gobernanza de identidades (Fase 23) quedan implementados y verificados. La verificación automatizada registró **27 archivos aprobados y 10 omitidos; 320 pruebas aprobadas y 56 omitidas**, con `npm run lint`, `npm run format:check` y `npm run build` sin errores. El recorrido manual de los escenarios 1 a 8 de `quickstart.md` queda únicamente como validación humana externa.

## Plan de Pruebas

- **Unitarias** (`tests/unit/compras/`): cálculo de neto, IVA y total con redondeo; validación de RUT; transiciones permitidas y prohibidas de cada estado; regla de 3 cotizaciones; tope de recepción por línea; conciliación con y sin discrepancia; nota de plazo según días de atraso; plazo de pago máximo sin acuerdo; matriz sensible de RUT de empleados, RUT tributario de proveedores y cuentas para los cinco roles (`visibilidad-sensible.test.js`, SC-009).
- **Integración** (`tests/integration/compras/`): un flujo por historia P1 y P2 siguiendo sus escenarios de aceptación de `spec.md`, y una prueba de auditoría de punta a punta (SC-012) en `trazabilidad.test.js`.
- **Auditoría SC-003** (`tests/integration/compras/flujo-compras.test.js`): cobertura del 100 % de las OC sobre el umbral con tres cotizaciones vigentes o justificación de proveedor único.
- **Accesibilidad** (`tests/integration/compras/vista.test.js`): etiquetas asociadas en las diez vistas, foco y operación por teclado, errores junto al campo con `role="alert"` y revisión automatizada de contraste (WCAG 2.1 AA).
- **Permisos y navegación por rol** (`tests/integration/compras/permisos.test.js`, nuevo): las 55 combinaciones de rol y superficie de la matriz (SC-015); `admin_ti` sin ninguna de las cinco operaciones de compra y la regla 8 sin excepciones (SC-016); acciones rápidas sin identificadores internos y encabezado con la sección (SC-017); creación de solicitudes con los cinco roles y aprobación de la solicitud de un `jefe_compras` por otro `jefe_compras` (FR-005, FR-006).
- **Rol fijo por sesión** (`tests/integration/compras/autenticacion.test.js`): con la sesión iniciada, `setRolActivo()` no cambia el rol, la barra superior muestra el indicador de solo lectura en lugar del selector y el cambio de rol solo ocurre tras cerrar sesión e ingresar de nuevo (FR-037). Las pruebas que hoy cambian de rol en vivo pasan a iniciar una sesión por rol.
- **Manual**: guion de la demo de 5 minutos del criterio SC-002, medición cronometrada de SC-001 con 3 productos semilla y escenarios de validación por historia, documentados en [quickstart.md](quickstart.md).

## Datos Semilla

Todos ficticios: 4 centros de costo, **7 usuarios** (`u-solicitante-1`, `u-solicitante-2`, `u-comprador-1`, `u-jefe-1`, `u-jefe-2`, `u-bodega-1` y `u-admin-1`; el segundo `jefe_compras` aprueba las solicitudes que crea el primero), 12 proveedores (al menos uno de cada tamaño, uno bloqueado y uno con cuenta bancaria cambiada hace menos de 30 días), 20 productos, 10 solicitudes, 7 cotizaciones, 8 OC, 5 recepciones, 7 facturas, 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones, con estados suficientes para que cada pantalla y alerta tenga algo que mostrar. Los siete usuarios tienen nombre propio chileno, correo único, `activo: true` y RUT válido con Módulo 11 (`validarRut()` en `reglas.js`); el RUT completo se exhibe en la columna **RUT** del padrón de `admin_ti`.

## Escalabilidad y Desarrollo Futuro

- **Backend**: `localStorage` limita el almacenamiento a un navegador y a pocos MB. El MER está normalizado para migrarse sin cambios conceptuales a una base de datos relacional con una API.
- **Autenticación**: los roles simulados deben pasar a usuarios reales con autenticación real y un rol fijo por usuario; hoy el rol es fijo por sesión, pero la clave genérica `Compras2026` permite ingresar con cualquier rol (data-model §6).
- **Rol gerente**: un rol aprobador por sobre `jefe_compras` para aprobar sus solicitudes, en lugar de un segundo `jefe_compras` (ver `research.md`).
- **Auditoría en servidor**: el historial de trazabilidad (FR-027 a FR-030) y el Log de Auditoría Forense (FR-045) ya forman parte del MVP sobre `localStorage`; a futuro deben migrar a un registro en servidor con firma criptográfica y retención que no pueda alterarse desde el navegador.
- **OTP y notificaciones reales**: el código y la notificación interna son simulados y la ayuda visual solo existe en Modo Demo; en producción deben emitirse por correo/SMS con hashes irreversibles y expiración controlada por servidor.
- **SII**: recibir automáticamente los documentos tributarios electrónicos en lugar de ingresar facturas a mano.
- **Integración**: solicitudes automáticas de reposición desde Inventario y control de presupuesto por centro de costo desde Contabilidad.
- **Multiempresa**: agregar un identificador de empresa a cada colección.


## Análisis de arquitectura de navegación (2026-11-24)

- **Estado implementado (spec FR-034)**: barra lateral agrupada en Panel / Adquisiciones / Compras, con visibilidad por matriz FR-033 (`visibilidad.js`, Fase 16 cerrada), íconos SVG decorativos por vista y encabezado de sección; la vista Panel muestra `ADQUISICIONES Y COMPRAS` / `Resumen General`. No existe una fila duplicada de pestañas horizontales. Trazabilidad se consulta desde la cadena documental, no como vista de la barra lateral.
- **Decisión aplicada**: la navegación agrupada y el modo solo lectura están integrados con `vistasVisibles()` y `nivelVista()`; T127 (filtro en servicios) y T137/T139 (panel por los cinco roles) quedan cerrados.
- **Impacto de la deuda resuelta**: `ordenes-compra.js`/`recepciones.js` aplican ahora el filtro del `solicitante` en origen y el panel cumple la tabla completa de FR-035 para los cinco roles. SC-015/SC-016 están cubiertos por `permisos.test.js` y `visibilidad.test.js`.
- **Actualizaciones aplicadas**: `tasks.md` es la fuente canónica del estado de las Fases 16–23 y de la deuda conocida; `spec.md`, `plan.md`, `quickstart.md` y el `README.md` del módulo referencian ese estado. El árbol de código ya incluye `visibilidad.js`, `asistente.js` y los módulos y tests de las Fases 21–23.

## Refinamiento UX y estado de sesión (2026-11-24)

- **Alcance**: `index.html`, `src/app.js`, `src/compras/vista.js`, `src/compras/panel.js`, `src/styles.css`, pruebas focalizadas de vista/autenticación. Sin cambios en `src/storage.js`.
- **Modo oscuro**: `data-theme` en `:root`, toggle accesible, persistencia `erp_compras:tema`, inicialización por `prefers-color-scheme`.
- **Tipografía**: IBM Plex Sans (400/500/600/700), jerarquía para KPI/títulos/cuerpo.
- **Componentes**: KPI con iconos/acento semántico; acciones rápidas con etiqueta+descripción+icono y hover `translateY(-2px)`; pendientes por rol como tarjetas clicables; flujo con barras CSS; tablas con scroll horizontal, encabezado sticky y hover; badges con punto semántico; tabs con scroll móvil.
- **Accesibilidad/responsive**: mantener contraste 4.5:1, foco visible, teclado/ARIA, y evitar overflow horizontal de página.
- **Sesión/rol**: `src/app.js` muestra indicador compacto de sesión; no existe control "Vista de rol"; `src/compras/almacenamiento.js` impide el cambio de rol en una sesión iniciada para los cinco roles.
- **Permisos base**: `crear_solicitud` incluye los cinco roles; la semilla actualiza los nombres de los dos `jefe_compras`.
- **Verificación**: `npm run lint`, `npm run format:check` y `npm run build` OK con el alcance ampliado de `.prettierignore`; `npm test -- --run` registra 27 archivos aprobados y 10 omitidos, 320 pruebas aprobadas y 56 omitidas. El recorrido manual por rol de los escenarios 1 a 8 de `quickstart.md` queda como validación humana externa en navegador.
- **Cierre verificado**: navegación agrupada, modo lectura, filtros por rol, encabezado por sección, panel FR-035 y pruebas SC-015/SC-016/SC-017 completados y verificados (T125–T139); el cumplimiento de la matriz de visibilidad queda declarado.

## Gobernanza de identidades y datos (Fase 23, 2026-11-25)

- **Alcance**: `index.html`, `src/app.js`, `src/styles.css` y los módulos `gobernanza.js`, `auditoria.js` y `administracion.js` bajo `src/compras/`. Sin cambios en `src/storage.js`, `tests/unit/storage.test.js` ni `eslint.config.mjs`.
- **Arquitectura**: `gobernanza.js` es la única fuente del modo de datos, los parámetros dinámicos, las solicitudes OTP y las notificaciones internas; usa el prefijo `erp_compras:` y respaldo en memoria. `auditoria.js` mantiene un log append-only con hash encadenado, separado de `trazabilidad.js`. `administracion.js` concentra las operaciones sensibles y exige token OTP vigente antes de escribir.
- **Modo Demo / Modo Real**: `almacenamiento.js` captura y restaura una instantánea por modo; el cambio cierra la sesión y evita mezclar datos transaccionales. El directorio solo se materializa en Modo Demo y revela correo, clave de simulación, rol y centro de costo.
- **Identidad y permisos**: `autenticacion.js` acepta correo corporativo o RUT con Módulo 11 y filtra cuentas `activo === false`. `PERMISOS` incorpora `gestionar_usuarios`, `suspender_usuario`, `consultar_auditoria_forense`, `configurar_parametros` y `desbloquear_excepciones`, todos restringidos a `admin_ti`.
- **Parámetros**: `COMPRAS_PARAMETROS` y `UMBRAL_COTIZACIONES` conservan sus valores iniciales para compatibilidad; las reglas y sus consumidores invocan `umbralCotizaciones()` / `toleranciaConciliacion()` para resolver los valores vigentes.
- **Verificación**: 27 archivos aprobados y 10 omitidos, 320 pruebas aprobadas y 56 omitidas; `lint`, `format:check` y `build` sin errores. Cobertura específica en `usuarios.test.js` (unitario e integración), `otp.test.js`, `auditoria-forense.test.js` y `autenticacion.test.js`.

## Seguimiento de Complejidad

| Desviación del módulo base                               | Por qué es necesaria                                                                                                       | Alternativa más simple descartada                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Colecciones adicionales fuera de Entidad/Documento       | El ciclo de compras tiene 6 documentos encadenados; el template solo modela uno                                            | Forzar todo como Documento con un campo "tipo" mezclaría estados y reglas incompatibles |
| Bloquear la eliminación en cascada de proveedores con OC | El template borra los documentos de una entidad eliminada; en compras eso destruiría la trazabilidad de órdenes y facturas | Advertir y borrar igual: inaceptable para auditoría                                     |
| Líneas de detalle dentro de la OC                        | El template no tiene partidas; su propio data-model las señala como punto de extensión                                     | Una OC por producto: no refleja cómo compra una empresa                                 |
## Arquitectura actual y restricciones (MVP)

- Interfaz: GitHub Dark (#0D1117, #161B22, #2F81F7), barra lateral con íconos SVG lineales, Asistente IA local con guardrails RBAC y dominio ERP.
- Login: conmutador único Modo Demo / Modo Real sin saltos de layout; Modo Demo carga 12 colecciones de semilla.json y directorio de acceso rápido con 7 usuarios; Modo Real exige correo+contraseña y colecciones transaccionales vacías con catálogos base.
- RBAC estricto por rol (solicitante, comprador, jefe_compras, bodega, admin_ti) según matriz FR-033.
- No modificar src/storage.js ni eslint.config.mjs.
- Prohibido renderizar vistas o botones genéricos del template base (Documentos, Entidades, Búsqueda, Panel genérico).

## Funciones puras de visibilidad sensible

src/compras/visibilidad.js expone la matriz `VISIBILIDAD`/`GRUPOS`, `nivelVista()`, `vistasVisibles()` y las funciones puras de la matriz sensible: `puedeVerRutEmpleado`, `enmascararRut`, `rutEmpleadoVisible`, `puedeVerRutProveedor`, `enmascararRutProveedor`, `formatearRutVisible`, `puedeVerDatosBancarios`, `enmascararCuentaPorRol`, `sanitizarRutsEnTexto` y `enmascararDatosEnTexto`, además de `RUT_OCULTO` y `CUENTA_NO_DISPONIBLE`. Juntas implementan la matriz RBAC de la sección de privacidad del spec en tablas, modales, búsquedas, trazabilidad, CSV y asistente. `reglas.js` y `module-config.js` delegan en este módulo, sin criterios duplicados. La descripción canónica de las tareas T156–T160 está en [`tasks.md`](tasks.md) (Fase 21); no se reproducen aquí.
