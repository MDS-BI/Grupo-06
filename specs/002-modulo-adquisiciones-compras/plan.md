# Plan de Implementación: Módulo Adquisiciones y Compras

**Rama**: `002-modulo-adquisiciones-compras` | **Fecha**: 2026-10-27 | **Actualizado**: 2026-11-24 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-adquisiciones-compras/spec.md` y modelo de datos en [data-model.md](data-model.md)

## Resumen

Construir el módulo Adquisiciones y Compras **sobre el módulo base ERP del curso** (`specs/001-erp-base-module`), sin reemplazar su código central: `src/storage.js` y sus pruebas permanecen sin cambios funcionales (solo se aplicó formateo con Prettier). La interfaz final es **exclusiva del módulo**: `index.html` solo expone `#view-compras`, `#compras-root` y el indicador de sesión del usuario y rol (FR-037); no se muestran las vistas genéricas de Entidades, Documentos ni Búsqueda del template, conforme a FR-032 y SC-014. **Actualización 2026-11-24**: el rol queda fijo durante la sesión para los cinco roles y no existe control para cambiarlo en vivo. Se aplicaron mejoras UI/UX (KPI, acciones rápidas legibles, pendientes/flujo, tablas, badges, modo oscuro e IBM Plex Sans) sin modificar `src/storage.js`.

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
**Escala/Alcance**: 19 entidades lógicas (ver `data-model.md`), 12 historias de usuario, 5 roles simulados

## Verificación de la Constitución

_Según `.specify/memory/constitution.md` v1.0.0._

- **I. Calidad del código**: la lógica de negocio (cálculos, validaciones y transiciones de estado) vive en funciones puras en `src/compras/reglas.js`, separada de la interfaz y del almacenamiento.
- **II. Pruebas primero**: cada regla de la sección 5 de `data-model.md` tiene prueba unitaria antes o junto con su implementación; cada historia P1 tiene al menos una prueba de integración de su flujo.
- **III. Experiencia de usuario consistente**: todas las pantallas nuevas usan el marco del template (barra superior, barra lateral, tokens de `styles.css`), mensajes de validación en español y estados vacíos; encabezado con la sección actual y acciones rápidas rotuladas con una descripción legible, nunca con la clave interna del permiso. La accesibilidad (SC-013) se verifica en `tests/integration/compras/vista.test.js`: etiqueta por campo en las diez vistas, foco por teclado, errores junto al campo y contraste ≥ 4,5:1.
- **IV. Rendimiento**: las colecciones se leen una vez por pantalla y se filtran en memoria; el objetivo de 500 registros se verifica con los datos semilla ampliados.
- **Estándares de calidad**: antes de la entrega se ejecutan `npm run lint` (ESLint) y `npm run format:check` (Prettier). Ambos comandos pasan sin errores ni advertencias; T107 está cerrada. El alcance real de `format:check` es el que define `.prettierignore`: núcleo base (`src/storage.js` y `tests/unit/storage.test.js`); el resto de `src/**`, `tests/**`, `specs/**` y Markdown queda excluido.

Resultado: **conforme con deuda documentada**. Los incumplimientos materiales quedan registrados en la sección «Deuda conocida» y en `tasks.md`; `format:check` está en verde dentro del alcance configurado en `.prettierignore`.

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
| HISTORIAL_TRAZABILIDAD                    | `erp_compras:trazabilidad` (eventos inmutables: quién, cuándo, qué acción; cambios bancarios con valor enmascarado)                           |

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
    ├── reglas.js           (cálculos de montos, validación de RUT, transiciones, conciliación, nota de plazo)
    ├── almacenamiento.js   (colecciones erp_compras:* con el contrato del template y PERMISOS por rol)
    ├── solicitudes.js      (pantalla y flujo de solicitudes)
    ├── cotizaciones.js     (registro y comparación)
    ├── ordenes-compra.js   (emisión, compra directa y anulación de OC)
    ├── recepciones.js
    ├── facturas.js
    ├── devoluciones.js     (devoluciones y notas de crédito)
    ├── proveedores.js      (alta/edición, visibilidad de datos sensibles, cambio bancario auditado)
    ├── autenticacion.js    (pantalla de ingreso simulada: selector de rol, nombre condicional, clave genérica; fija el rol de la sesión)
    ├── vista.js            (pantallas de compras, navegación agrupada por rol y cadena documental)
    ├── exportacion.js      (CSV con BOM y permisos por rol)
    ├── trazabilidad.js     (historial de eventos y cadena documental)
    ├── catalogo.js
    ├── evaluaciones.js
    ├── panel.js            (pendientes, indicadores y alertas por rol, FR-035)
    └── semilla.json        (datos ficticios)

tests/
├── unit/compras/           (reglas.test.js, exportacion.test.js, configuracion.test.js: reglas de data-model.md, sección 5)
└── integration/compras/    (flujos por historia: proveedores, flujo-compras, casos-limite, catalogo-panel, vista,
                             almacenamiento, trazabilidad y rendimiento; helpers.js compartido)
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
| 5. UI/UX y ajustes de sesión        | 24-nov          | Refuerzo parcial US5/US12, FR-036, FR-037, ajustes sesión/rol            | Mejoras UI/UX (KPI, acciones rápidas legibles, pendientes/flujo, tablas, badges), modo oscuro, IBM Plex Sans, tabs responsivas; rol fijo para los cinco roles; `crear_solicitud` para cinco roles en permisos base. Fase 16 completada el 24-nov. |

Cada historia se asigna a un responsable en un Issue de GitHub con la etiqueta de su iteración; los acuerdos de cada semana se registran en un Issue de seguimiento.

## Dependencia crítica

**Resuelta.** La carpeta `src/` (módulo base) se restauró desde el historial (`git checkout 501e9c6 -- src index.html`) y hoy está versionada en `HEAD` junto con `src/compras/`. Las pruebas del template (`tests/unit/storage.test.js`, entre otras) vuelven a encontrar sus dependencias.

## Deuda conocida

Las siguientes tareas se documentan también en `tasks.md`: T101, T104, T109, T110 y T118 siguen abiertas; T107, T108, T117, T119 y T120 ya están cerradas. El núcleo base (`src/storage.js` y `tests/unit/storage.test.js`) fue formateado con Prettier y es el único código cubierto por `format:check` según `.prettierignore`.

| Tarea | Estado  | Justificación                                                                                                                                                                                                                                                                                                                                       | Referencia                          |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| T101  | Abierta | La prueba de cierre con saldo pendiente pasa, pero `cerrarSiSaldada()` muta el estado directamente; falta declarar `recibida_parcial → cerrada` en `TRANSICIONES`.                                                                                                                                                                                  | `data-model.md` §10, pendiente 3    |
| T104  | Abierta | Bloqueo de eliminación y anulación de OC verificados; falta `motivo_anulacion` en facturas y devoluciones.                                                                                                                                                                                                                                          | FR-029, T118                        |
| T107  | Cerrada | Se formatearon `src/storage.js` y `tests/unit/storage.test.js`; `npm run format:check` pasa sin diferencias en el alcance de `.prettierignore` y `npm run lint` sin errores ni advertencias.                                                                                                                                                                               | Constitución, Estándares de Calidad |
| T108  | Cerrada | Accesibilidad revisada: encabezado del panel asociado, pestañas navegables con teclado, etiquetas y tablas accesibles, errores de validación junto al campo con `role="alert"`/`aria-describedby` y banner para errores globales, y contraste 4,5:1. | SC-013 |
| T109  | Abierta | Solo la solicitud guarda `motivo_anulacion`; faltan cotizaciones y recepciones.                                                                                                                                                                                                                                                                     | FR-029, T118                        |
| T110  | Abierta | `credito_a_favor` no está implementado ni mostrado en factura/cadena documental.                                                                                                                                                                                                                                                                    | FR-026, SC-011                      |
| T117  | Cerrada | Decisión aplicada: `registrada` como estado inicial de factura en código y modelo; `data-model.md` sincronizado en §3.11/regla 6 y §10.                                                                                                                                                                                                      | FR-015                              |
| T118  | Abierta | Pendiente 2 de `data-model.md` §10: estados de devolución y anulación con motivo incompletos.                                                                                                                                                                                                                                                       | FR-029                              |
| T119  | Cerrada | Decisión aplicada: se elimina `borrador` del modelo de OC y se conserva `emitida` como estado inicial; `data-model.md` y `plan.md` sincronizados.                                                                                                                                                                                                | FR-010                              |
| T120  | Cerrada | Auditoría global de SC-003 en `flujo-compras.test.js`: se validan las dos vías de cumplimiento sobre todas las OC no anuladas.                                                                                                                                                                                                                | SC-003                              |
| T121-T144 | En curso | Fase 16 cerrada (T121-T124): `admin_ti` ya no opera compras, `PERMISOS` y `VISIBILIDAD` centralizados y suite ajustada. Pendientes navegación por rol, modo lectura y ajustes T125-T144. | FR-033 a FR-036, SC-015 a SC-017 |
| T146-T155 | En curso | Rol fijo por sesión, indicador sin selector **Rol Activo** y creación de solicitudes por los cinco roles implementados (T121, T146, T147); pendientes T148-T155. | FR-005, FR-006, FR-034, FR-037 |

## Plan de Pruebas

- **Unitarias** (`tests/unit/compras/`): cálculo de neto, IVA y total con redondeo; validación de RUT; transiciones permitidas y prohibidas de cada estado; regla de 3 cotizaciones; tope de recepción por línea; conciliación con y sin discrepancia; nota de plazo según días de atraso; plazo de pago máximo sin acuerdo.
- **Integración** (`tests/integration/compras/`): un flujo por historia P1 y P2 siguiendo sus escenarios de aceptación de `spec.md`, y una prueba de auditoría de punta a punta (SC-012) en `trazabilidad.test.js`.
- **Auditoría SC-003** (`tests/integration/compras/flujo-compras.test.js`): cobertura del 100 % de las OC sobre el umbral con tres cotizaciones vigentes o justificación de proveedor único.
- **Accesibilidad** (`tests/integration/compras/vista.test.js`): etiquetas asociadas en las diez vistas, foco y operación por teclado, errores junto al campo con `role="alert"` y revisión automatizada de contraste (WCAG 2.1 AA).
- **Permisos y navegación por rol** (`tests/integration/compras/permisos.test.js`, nuevo): las 50 combinaciones de rol y vista de la matriz (SC-015); `admin_ti` sin ninguna de las cinco operaciones de compra y la regla 8 sin excepciones (SC-016); acciones rápidas sin identificadores internos y encabezado con la sección (SC-017); creación de solicitudes con los cinco roles y aprobación de la solicitud de un `jefe_compras` por otro `jefe_compras` (FR-005, FR-006).
- **Rol fijo por sesión** (`tests/integration/compras/autenticacion.test.js`): con la sesión iniciada, `setRolActivo()` no cambia el rol, la barra superior muestra el indicador de solo lectura en lugar del selector y el cambio de rol solo ocurre tras cerrar sesión e ingresar de nuevo (FR-037). Las pruebas que hoy cambian de rol en vivo pasan a iniciar una sesión por rol.
- **Manual**: guion de la demo de 5 minutos del criterio SC-002 y escenarios de validación por historia, documentados en [quickstart.md](quickstart.md).

## Datos Semilla

Todos ficticios: 4 centros de costo, 7 usuarios (uno por rol, un segundo solicitante y un segundo `jefe_compras` para aprobar las solicitudes que crea el primero; los dos `jefe_compras` tienen nombre ficticio porque ese rol lo pide al ingresar), 8 proveedores (al menos uno de cada tamaño, uno bloqueado y uno con cuenta bancaria cambiada hace menos de 30 días), 20 productos, y solicitudes, cotizaciones, OC, recepciones y facturas en todos los estados para que cada pantalla y alerta tenga algo que mostrar.

## Escalabilidad y Desarrollo Futuro

- **Backend**: `localStorage` limita el almacenamiento a un navegador y a pocos MB. El MER está normalizado para migrarse sin cambios conceptuales a una base de datos relacional con una API.
- **Autenticación**: los roles simulados deben pasar a usuarios reales con autenticación real y un rol fijo por usuario; hoy el rol es fijo por sesión, pero la clave genérica `Compras2026` permite ingresar con cualquier rol (data-model §6).
- **Rol gerente**: un rol aprobador por sobre `jefe_compras` para aprobar sus solicitudes, en lugar de un segundo `jefe_compras` (ver `research.md`).
- **Auditoría en servidor**: el historial de trazabilidad (FR-027 a FR-030) ya forma parte del MVP sobre `localStorage`; a futuro debe migrar a un registro en servidor que no pueda alterarse desde el navegador.
- **SII**: recibir automáticamente los documentos tributarios electrónicos en lugar de ingresar facturas a mano.
- **Integración**: solicitudes automáticas de reposición desde Inventario y control de presupuesto por centro de costo desde Contabilidad.
- **Multiempresa**: agregar un identificador de empresa a cada colección.


## An?lisis de arquitectura de navegaci?n (2026-11-24)

- **Estado actual (implementado)**: navegaci?n de dos niveles ligera: barra lateral con una sola secci?n "Compras" (`index.html`) + pesta?as internas `TABS` en `#compras-root` (`src/compras/vista.js`) para las 10 vistas. Incluye scroll m?vil, teclado/ARIA y persistencia de tab por estado de vista.
- **Estado objetivo (spec FR-034)**: barra lateral agrupada en Panel / Adquisiciones / Compras, con visibilidad por matriz FR-033 (`visibilidad.js`, Fase 16) y encabezado "Grupo > Vista".
- **Decisi?n**: **no cambiar la arquitectura ahora**. Mantener pesta?as actuales hasta ejecutar Fase 16, porque el cambio estructural depende de `VISIBILIDAD`, filtros por rol, permisos y ajuste masivo de pruebas.
- **Impacto si se cambia antes de Fase 16**: alto riesgo de regresi?n en `vista.test.js`, accesibilidad, deep-links `data-ir`, y cobertura SC-015/SC-016 sin matriz implementada.
- **Actualizaciones necesarias**: spec/plan/tasks/research/quickstart/README documentan la arquitectura actual y el objetivo diferido; no se modifica c?digo de Fase 16.

## Refinamiento UX (2026-11-24)

- **Alcance**: `index.html`, `src/app.js`, `src/compras/vista.js`, `src/compras/panel.js`, `src/styles.css`, pruebas focalizadas de vista/autenticaci?n. Sin cambios en `src/storage.js`.
- **Modo oscuro**: `data-theme` en `:root`, toggle accesible, persistencia `erp_compras:tema`, inicializaci?n por `prefers-color-scheme`.
- **Tipograf?a**: IBM Plex Sans (400/500/600/700), jerarqu?a para KPI/t?tulos/cuerpo.
- **Componentes**: KPI con iconos/acento sem?ntico; acciones r?pidas con etiqueta+descripci?n+icono y hover `translateY(-2px)`; pendientes por rol como tarjetas clicables; flujo con barras CSS; tablas con scroll horizontal, encabezado sticky y hover; badges con punto sem?ntico; tabs con scroll m?vil.
- **Accesibilidad/responsive**: mantener contraste 4.5:1, foco visible, teclado/ARIA, y evitar overflow horizontal de p?gina.
- **Validaci?n**: `npm run lint` OK; `npx vitest run tests/integration/compras/vista.test.js tests/integration/compras/autenticacion.test.js` 17/17 OK. Suite completa y recorrido manual por rol pendientes.

## Seguimiento de Complejidad

| Desviación del módulo base                               | Por qué es necesaria                                                                                                       | Alternativa más simple descartada                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Colecciones adicionales fuera de Entidad/Documento       | El ciclo de compras tiene 6 documentos encadenados; el template solo modela uno                                            | Forzar todo como Documento con un campo "tipo" mezclaría estados y reglas incompatibles |
| Bloquear la eliminación en cascada de proveedores con OC | El template borra los documentos de una entidad eliminada; en compras eso destruiría la trazabilidad de órdenes y facturas | Advertir y borrar igual: inaceptable para auditoría                                     |
| Líneas de detalle dentro de la OC                        | El template no tiene partidas; su propio data-model las señala como punto de extensión                                     | Una OC por producto: no refleja cómo compra una empresa                                 |

## Actualización 2026-11-24

- **UI/UX**: se mejoró `src/compras/vista.js` y `src/styles.css` (KPI con iconos/acento, acciones rápidas con descripción e icono, pendientes como tarjetas clicables, flujo con barras CSS, tablas responsivas, badges semánticos, tabs con scroll móvil, modo oscuro y IBM Plex Sans en `index.html`).
- **Sesión/rol**: `src/app.js` muestra indicador compacto de sesión; no existe control "Vista de rol"; `src/compras/almacenamiento.js` impide el cambio de rol en una sesión iniciada para los cinco roles.
- **Permisos base**: `crear_solicitud` incluye los cinco roles; semilla actualiza nombres de `jefe_compras`.
- **Verificación**: `npm run lint` OK; `npx vitest run tests/integration/compras/vista.test.js tests/integration/compras/autenticacion.test.js` 17/17 OK.
- **Pendiente crítico**: cerrar Fase 16 (FR-033/FR-034/SC-015-SC-017) antes de declarar cumplimiento de matriz de visibilidad por rol; revalidar suite completa `tests/integration/compras`.
