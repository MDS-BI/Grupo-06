# Investigación: Módulo Adquisiciones y Compras

**Funcionalidad**: `002-modulo-adquisiciones-compras`  
**Fecha**: 19 de noviembre de 2026  
**Fase**: 0 del flujo `/speckit.plan` (decisiones técnicas previas al diseño)  
**Entradas**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), constitución del proyecto e [investigación del módulo base](../001-erp-base-module/research.md)

## Contexto y clarificaciones

El contexto técnico de `plan.md` llegó a esta fase sin preguntas abiertas: lenguaje, dependencias, almacenamiento, codificación de CSV, pruebas, plataforma, restricciones y escala ya están definidos. Las dudas que siguen pendientes son de modelo de datos y están listadas en el apartado 10 de `data-model.md`; no bloquean estas decisiones técnicas y se revisarán con el grupo.

| Tema del contexto técnico | Resolución ya acordada                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| Lenguaje e interfaz       | JavaScript ES2022, HTML y CSS, sin framework de interfaz                   |
| Herramientas              | Vite y Vitest con jsdom, ya configurados en la raíz                        |
| Persistencia              | `localStorage`, con prefijo `erp_compras:` para lo propio del módulo       |
| Exportaciones             | UTF-8 con BOM, separador `;`, filas con CRLF                               |
| Roles                     | Cinco roles simulados, sin autenticación real; acceso según la matriz de visibilidad (FR-033) y `admin_ti` como administrador del sistema |
| Parámetros de negocio     | Umbral de 1.000.000 CLP neto y tolerancia de conciliación del 1 % del neto |

A continuación se registran las decisiones que materializan ese contexto, con su justificación y las alternativas descartadas.

## Decisión 1: Mantener la pila del módulo base (Vite, HTML, CSS y JavaScript vanilla)

**Decisión**: construir el módulo con la misma pila de `001-erp-base-module`, sin introducir React, Vue ni otro framework de interfaz.

**Justificación**: el equipo ya tiene Vite, ESLint, Prettier y Vitest configurados; la aplicación es una página única con formularios, tablas y pestañas que no justifican una capa de componentes adicional. Mantener la pila reduce la curva de aprendizaje, preserva los tokens de `styles.css` y permite que las pruebas del template base sigan ejecutándose.

**Alternativas consideradas**:

- React o Vue: aportan enlazado de datos y componentes, pero agregan dependencias, configuración y una abstracción que el alcance no necesita.
- HTML estático sin Vite: simplificaría el arranque, pero perdería el servidor de desarrollo, el build y la integración con Vitest que ya funcionan.

## Decisión 2: Extender en dos niveles: configuración más colecciones propias

**Decisión**: usar `src/module-config.js` para montar Proveedor sobre la Entidad y Orden de Compra sobre el Documento, y crear colecciones propias en `src/compras/` para el resto del ciclo.

**Justificación**: el módulo base expone un dato maestro y un documento genéricos que se adaptan por configuración. Eso entrega rápido una versión integrada de prueba de US1 y US3. Las demás historias necesitan seis documentos encadenados, líneas de detalle y reglas incompatibles entre sí, por lo que no caben en un único tipo Documento sin perder claridad.

**Alternativas consideradas**:

- Modelar todo como Documento con un campo `tipo`: mezclaría estados y transiciones distintas en una sola colección y complicaría la trazabilidad.
- Reescribir el núcleo del template: destruiría la compatibilidad con el módulo base y con sus pruebas.

## Decisión 3: Persistencia local con semilla ficticia cargada en la primera visita

**Decisión**: guardar las colecciones en `localStorage` con el prefijo `erp_compras:`, conservar los proveedores en la Entidad base (`erp_base_module:entities`) y cargar `src/compras/semilla.json` automáticamente la primera vez. Si `localStorage` no está disponible o está lleno, la capa de almacenamiento conserva los datos en memoria y muestra un mensaje.

**Justificación**: no hay backend ni cuentas de usuario; la semilla permite demostrar las 11 historias sin pedir datos al usuario. Las fechas de la semilla se desplazan respecto de una fecha de referencia para que los vencimientos y alertas sigan siendo vigentes. El prefijo evita colisiones con otros módulos del ERP.

**Alternativas consideradas**:

- Backend con base de datos: añadiría servidor, despliegue y autenticación fuera del alcance académico.
- Datos de ejemplo escritos en el código: dificultaría mantener los estados necesarios para el panel y las alertas.

## Decisión 4: Reglas de negocio puras y parámetros centralizados

**Decisión**: concentrar cálculos, validaciones, transiciones, conciliación y enmascaramiento en funciones puras de `src/compras/reglas.js`, y mantener los parámetros de negocio y la visibilidad de datos sensibles en `COMPRAS_PARAMETROS` (`src/module-config.js`).

**Justificación**: separar la lógica de la interfaz permite probarla con Vitest sin montar el DOM, y evita que cada pantalla repita reglas con ligeras diferencias. La configuración ya era el punto de extensión del template, así que la regla de visibilidad bancaria (FR-004 y FR-025) vive junto al IVA, el umbral y la tolerancia.

**Alternativas consideradas**:

- Reglas dentro de cada pantalla: provocaría duplicación y contradicciones entre listados, formularios, CSV e historial.
- Un módulo de reglas por historia: fragmentaría cálculos compartidos como el IVA o el enmascaramiento.

## Decisión 5: Roles simulados con enmascaramiento en el origen de los datos

**Decisión**: representar la sesión con un selector de **Rol Activo** en la barra superior, resolver permisos con `puede()` sobre `PERMISOS`, y aplicar el enmascaramiento antes de entregar los datos a cualquier vista, búsqueda o exportación.

**Justificación**: el objetivo es demostrar la segregación de funciones sin implementar autenticación. Al centralizar la visibilidad en `COMPRAS_PARAMETROS.datosBancarios` y consumirla desde `reglas.js`, `proveedores.js`, la vista y el guardado del formulario, `jefe_compras` ve RUT y cuenta completos, `admin_ti` además puede editarlos, y el resto de roles nunca recibe el valor completo (FR-025 y SC-009). El cambio de rol vuelve a renderizar la vista, con lo que el enmascaramiento se aplica de inmediato. `admin_ti` es el administrador del sistema y no un operador de compras: edita datos bancarios, desbloquea proveedores y consulta y exporta la trazabilidad, pero no emite OC, no registra recepciones ni aprueba solicitudes, pagos o devoluciones (FR-004). La regla "quien emite la OC no la recibe" se valida aparte de `PERMISOS` y sin excepciones por rol (FR-014).

**Alternativas consideradas**:

- Iniciar sesión con contraseñas reales: require almacenamiento de credenciales y autorización en servidor, fuera del alcance.
- Ocultar columnas con CSS: el dato completo seguiría presente en el DOM y en el CSV, incumpliendo FR-025.
- Comparar roles con literales en cada archivo: fue el estado inicial y provocó divergencias entre reglas, proveedores y vista (corregidas con T017 y T093).
- Dar a `admin_ti` acceso total: era la definición inicial. Se descartó el 2026-11-23 porque un rol con todas las operaciones rompía la segregación de funciones: el código lo eximía de la regla 8 y podía emitir y recibir la misma OC.
- Impedir que el comprador concilie las facturas de las OC que él emitió: exigiría un rol adicional que una pyme no tiene. Se acepta como riesgo asumido, mitigado porque la recepción la registra `bodega` y el pago lo aprueba `jefe_compras` (data-model §6).

## Decisión 6: Trazabilidad inmutable y anulación en lugar de borrado

**Decisión**: registrar cada cambio de estado y cada modificación bancaria en `erp_compras:trazabilidad`, con usuario, rol, fecha y detalle; los valores bancarios se guardan solo enmascarados. Un documento con eventos no se elimina: se anula con motivo.

**Justificación**: FR-027 a FR-030 existen para auditar quién aprobó, quién recibió y quién cambió una cuenta de pago. El historial también permite recorrer la cadena solicitud → cotización → OC → recepción → factura → devolución y conservar las anulaciones. El historial de eventos lo consultan solo `jefe_compras` y `admin_ti`, y solo `admin_ti` lo exporta; los demás roles recorren la cadena documental sin ver los eventos.

**Alternativas consideradas**:

- Borrar documentos y dejar solo el estado final: impediría auditar y contradiría FR-029.
- Registrar el número de cuenta completo en el detalle del evento: facilitaría un fraude interno y violaría FR-030.

## Decisión 7: CSV con BOM, separador `;` y datos ya enmascarados

**Decisión**: exportar los listados con `generarCSV()` en UTF-8 con BOM, separador `;`, fin de línea CRLF y escapado de comillas, separadores y saltos de línea. Los datos exportados salen de las mismas vistas enmascaradas que ve el rol activo y respetan filtros y permisos.

**Justificación**: en Excel en español el separador `;` y el BOM evitan columnas juntas y caracteres corruptos (SC-010). Reutilizar `vistaProveedor()` garantiza que un rol sin permiso no pueda filtrar el RUT o la cuenta completos mediante el archivo (FR-024 y FR-025). El prefijo `'` en valores que empiezan con `=`, `+`, `-` o `@` previene la interpretación como fórmula.

**Alternativas consideradas**:

- Separador `,`: Excel en configuración regional española lo interpreta como decimal y rompe las columnas.
- Exportar XLSX o PDF: exigiría una librería externa y no está en el alcance de US10.

## Decisión 8: Pruebas automáticas por capas y guion de validación manual

**Decisión**: usar Vitest con jsdom para pruebas unitarias de `reglas.js` y de integración de cada flujo en `tests/integration/compras/`. La validación manual de extremo a extremo se documenta en [quickstart.md](quickstart.md).

**Justificación**: la constitución exige pruebas antes o junto con cada cambio de lógica de negocio. Las reglas puras se prueban sin DOM; los flujos de las historias se prueban con el almacenamiento simulado. El guion manual complementa lo automatizado con los criterios de experiencia de usuario y el tiempo de la demo (SC-002).

**Alternativas consideradas**:

- Solo pruebas manuales: no detectaría regresiones en cálculos ni en enmascaramiento.
- Playwright o Cypress: añadiría browsers y configuración innecesarios para este tamaño de equipo; jsdom ya cubre los flujos de la interfaz.

## Decisión 9: Contratos explícitos para almacenamiento, exportación e integración

**Decisión**: documentar los contratos propios del módulo en `contracts/`: el de colecciones y operaciones de almacenamiento, y el de exportación CSV, sesión por roles e integración con otros módulos del ERP. El contrato del módulo base se reutiliza sin modificaciones desde `001-erp-base-module/contracts/entity-storage.md`.

**Justificación**: el módulo expone formatos que otros componentes consumen (CSV, IDs de productos, proveedores y facturas). Escribir los contratos evita que un cambio en las claves de `localStorage` o en el separador CSV rompa sin aviso a Inventario, Contabilidad o las pruebas.

**Alternativas consideradas**:

- No documentar contratos: la integración futura dependería de convenciones no escritas.
- Modificar el contrato del módulo base: rompería la compatibilidad con `001` y con sus pruebas.

## Decisión 10: Alcance cerrado para el MVP

**Decisión**: no implementar backend, autenticación real, conexión con el SII, compras públicas (Ley 19.886) ni multiempresa en esta funcionalidad. Inventario, Contabilidad y RR.HH. se simulan con datos maestros de solo lectura y se integrarán en otra iteración.

**Justificación**: el cliente es una pyme privada y el entregable es académico. El modelo de datos ya reserva los identificadores y las relaciones necesarias, de modo que esas integraciones no exijan rediseñar el MER.

**Alternativas consideradas**:

- Descargar documentos tributarios del SII: requiere credenciales y servicios externos ajenos al MVP.
- Adelantar multiempresa: multiplicaría las claves de almacenamiento y los escenarios de prueba sin valor para la demo.

## Decisión 11: Navegación y visibilidad por rol

**Decisión**: agrupar la barra lateral en Panel / **Adquisiciones** (Proveedores, Catálogo, Evaluaciones) / **Compras** (Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones), según data-model §1. Cada vista se resuelve como "opera", "solo lectura" o "no ve" con una matriz de visibilidad (FR-033) separada de `PERMISOS`, que solo gobierna las acciones. El panel muestra pendientes e indicadores propios de cada rol (FR-035). El encabezado muestra la sección actual, las acciones rápidas se rotulan con una descripción legible y se elimina la tarjeta "Sesión activa", que duplicaba el selector de rol (FR-036).

**Justificación**: una navegación por rol reduce la confusión y evita mostrar información que el rol no necesita (por ejemplo, cotizaciones al solicitante). La agrupación refleja las dos caras del modelo: la estratégica (Adquisiciones) y la operativa (Compras). Separar la visibilidad de las acciones permite expresar el "solo lectura", que `PERMISOS` por sí solo no distingue.

**Alternativas consideradas**:

- Mostrar todas las vistas y deshabilitar los botones: expone datos innecesarios y llena la interfaz de controles inactivos.
- Mantener una sola sección plana "Compras" con diez pestañas: era el estado anterior y no distingue la parte estratégica de la operativa.
- Derivar la visibilidad solo de `PERMISOS`: no permite diferenciar "solo lectura" de "no ve".
