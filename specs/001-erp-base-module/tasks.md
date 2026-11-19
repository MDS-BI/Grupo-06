# Tareas: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`
**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/

## Formato: `[ID] [P?] [Historia] Descripción`

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Inicializar la estructura del proyecto Vite y las herramientas compartidas.

- [x] T001 Crear la estructura de la aplicación Vite con src/, tests/, y archivos de configuración
- [x] T002 Instalar las dependencias Vite y Vitest para el proyecto
- [x] T003 [P] Configurar el linting y formateo para la aplicación JavaScript ligera

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Crear la capa de almacenamiento y el esqueleto de la aplicación de los que dependen todas las historias.

- [x] T004 Crear el modelo de datos de entidad y los ayudantes de validación en src/storage.js
- [x] T005 Implementar la persistencia en localStorage del navegador para registros de entidad en src/storage.js
- [x] T006 Crear el esqueleto principal de la aplicación y renderizar el estado vacío inicial en src/app.js
- [x] T007 [P] Construir una base de hoja de estilos compartida para diseño, formularios y estados de retroalimentación en src/styles.css

---

## Fase 3: Historia de Usuario 1 - Crear y organizar entidades (Prioridad: P1) 🎯 MVP

**Objetivo**: Permitir a los usuarios añadir entidades y verlas en la lista.

**Prueba Independiente**: Un usuario puede abrir la aplicación, enviar un formulario de entidad y ver la nueva entidad aparecer.

### Pruebas para la Historia de Usuario 1

- [x] T008 [P] [US1] Añadir pruebas unitarias para la validación de entidades en tests/unit/storage.test.js
- [x] T009 [P] [US1] Añadir pruebas de integración para crear una entidad en tests/integration/create-entity.test.js

### Implementación de la Historia de Usuario 1

- [x] T010 [P] [US1] Crear la interfaz del formulario de entidad en src/components/entity-form.js
- [x] T011 [US1] Conectar el envío del formulario para crear y persistir una nueva entidad en src/app.js
- [x] T012 [US1] Renderizar la lista de entidades y mostrar retroalimentación de validación en src/components/entity-list.js

**Punto de control**: La Historia de Usuario 1 debe estar completamente funcional y ser comprobable de forma independiente.

---

## Fase 4: Historia de Usuario 2 - Editar y eliminar entidades (Prioridad: P1)

**Objetivo**: Permitir a los usuarios actualizar o eliminar entidades almacenadas, manteniendo la capacidad de respuesta con conjuntos de datos grandes.

**Prueba Independiente**: Un usuario puede editar una entidad existente o eliminarla, y la lista se actualiza correctamente.

### Pruebas para la Historia de Usuario 2

- [x] T013 [P] [US2] Añadir pruebas unitarias para actualizar y eliminar entidades en tests/unit/storage.test.js
- [x] T014 [P] [US2] Añadir pruebas de integración para editar y eliminar una entidad en tests/integration/edit-delete-entity.test.js

### Implementación de la Historia de Usuario 2

- [x] T015 [P] [US2] Añadir controles de edición y eliminación a la interfaz de la lista de entidades en src/components/entity-list.js
- [x] T016 [US2] Conectar las acciones de edición para poblar el formulario y actualizar los datos persistidos en src/app.js
- [x] T017 [US2] Gestionar las acciones de eliminación y quitar registros del almacenamiento y la interfaz en src/app.js

**Punto de control**: Las Historias de Usuario 1 y 2 deben funcionar de forma independiente.

---

## Fase 5: Historia de Usuario 3 (original) - Pantalla de bienvenida con navegación (Prioridad: P1)

**Objetivo**: Proporcionar la pantalla de punto de entrada con dos botones claramente etiquetados que llevan a gestión y búsqueda. _(Sustituida por el rediseño del panel de la Fase 17; se conserva como historial del trabajo entregado.)_

**Prueba Independiente**: Un usuario abre la aplicación, ve la pantalla de bienvenida y llega a ambas pantallas desde sus botones.

### Implementación de la Historia de Usuario 3

- [x] T018 [P] [US3] [SUPERSEDIDA por Fase 17] Añadir una vista de pantalla de bienvenida con dos botones de navegación claramente etiquetados en index.html
- [x] T019 [P] [US3] [SUPERSEDIDA por Fase 17] Añadir lógica de cambio de vista para las pantallas de bienvenida, gestión y búsqueda en src/app.js

**Punto de control**: La Historia de Usuario 3 debe estar completamente funcional y ser comprobable de forma independiente.

---

## Fase 6: Historia de Usuario 4 (pestañas originales) - Gestionar entidades y documentos en una pantalla dedicada (Prioridad: P1)

**Objetivo**: Proporcionar la pantalla de gestión con la pestaña de navegación horizontal Entidades/Documentos/Inicio y formularios de gestión completos, sin mostrar la lista de entidades. _(La navegación por pestañas fue sustituida por el marco de barra lateral de la Fase 16; los flujos de gestión siguen vigentes.)_

**Prueba Independiente**: Desde la pantalla de bienvenida, un usuario llega a la pantalla de gestión, cambia de pestaña y añade, edita y elimina una entidad y un documento.

### Implementación de la Historia de Usuario 4

- [x] T020 [P] [US4] [SUPERSEDIDA por Fase 16] Añadir una pestaña de navegación horizontal con botones Entidades, Documentos e Inicio a la vista de gestión en index.html
- [x] T021 [P] [US4] [SUPERSEDIDA por Fase 16] Organizar la vista de gestión en paneles de entidades y documentos y eliminar la lista de entidades en index.html
- [x] T022 [US4] [SUPERSEDIDA por Fase 16] Añadir lógica de cambio de pestaña y navegación a Inicio desde la pantalla de gestión en src/app.js
- [x] T023 [US4] [SUPERSEDIDA por Fase 16] Añadir edición y eliminación mediante selectores para entidades y documentos en src/app.js
- [x] T024 [P] [US4] [SUPERSEDIDA por Fase 16] Añadir pruebas de integración para la pestaña de navegación de gestión en tests/integration/manage-tabs.test.js
- [x] T025 [P] [US4] [SUPERSEDIDA por Fase 16] Añadir estilos para la pestaña de navegación horizontal en src/styles.css

**Punto de control**: Las Historias de Usuario 1-4 deben estar completamente funcionales y ser comprobables de forma independiente.

---

## Fase 7: Historia de Usuario 5 - Definir un perfil de configuración del módulo (Prioridad: P1)

**Objetivo**: Introducir `src/module-config.js` para que los desarrolladores puedan adaptar la identidad del módulo sin editar el código central, con valores predeterminados seguros e informes de error claros.

**Prueba Independiente**: Un desarrollador suministra una configuración de Ventas; la aplicación carga mostrándola. Al quitar el archivo se restauran los valores predeterminados Entity/Document sin errores.

### Pruebas para la Historia de Usuario 5

- [x] T026 [P] [US5] Añadir pruebas unitarias para carga de configuración, retroceso a predeterminados e informes de configuración inválida en tests/unit/module-config.test.js

### Implementación de la Historia de Usuario 5

- [x] T027 [US5] Crear el cargador de configuración con valores predeterminados, validación e informes de error claros en src/module-config.js
- [x] T028 [US5] Cargar la configuración al arrancar y pasarla a todas las vistas en src/main.js y src/app.js

**Punto de control**: La configuración aún no impulsa nada visible, pero carga de forma fiable y valida limpiamente.

---

## Fase 8: Historia de Usuario 6 - Reetiquetar pantallas desde la configuración (Prioridad: P1)

**Objetivo**: Derivar todas las etiquetas visibles para el usuario de la configuración para que los módulos adaptados hablen su idioma de dominio en todo momento.

**Prueba Independiente**: Con mapeos Entidad→Cliente y Documento→Pedido de Venta, cada pestaña, botón, etiqueta de formulario, encabezado y mensaje muestra los términos mapeados en las tres pantallas; el comportamiento no cambia.

### Pruebas para la Historia de Usuario 6

- [x] T029 [P] [US6] Añadir pruebas de integración que verifiquen las etiquetas configuradas en las pantallas de bienvenida, gestión y búsqueda en tests/integration/relabeling.test.js

### Implementación de la Historia de Usuario 6

- [x] T030 [US6] Derivar todas las etiquetas visibles para el usuario de la configuración en lugar de texto codificado en index.html, src/app.js y los archivos de componentes

**Punto de control**: Un módulo configurado se presenta completamente bajo su propia terminología.

---

## Fase 9: Historia de Usuario 7 - Declarar campos personalizados para los registros (Prioridad: P1)

**Objetivo**: Permitir que los campos personalizados declarados fluyan automáticamente por formularios, validación, persistencia, listas y búsqueda.

**Prueba Independiente**: Declarar un campo numérico obligatorio en las entidades renderiza una entrada numérica que bloquea guardados en blanco, muestra valores en listas y coincide en búsquedas; sin declaraciones la aplicación se comporta como la base sin modificar.

### Pruebas para la Historia de Usuario 7

- [x] T031 [P] [US7] Añadir pruebas unitarias para validación y persistencia de campos personalizados en tests/unit/storage.test.js
- [x] T032 [P] [US7] Añadir pruebas de integración para el renderizado de campos personalizados en formularios, listas y búsqueda en tests/integration/custom-fields.test.js

### Implementación de la Historia de Usuario 7

- [x] T033 [P] [US7] Renderizar dinámicamente los campos personalizados declarados en los formularios de entidad y documento en src/components/entity-form.js y src/components/document-form.js
- [x] T034 [US7] Incluir los campos personalizados en validación, persistencia, listas y búsqueda en src/storage.js y src/app.js

**Punto de control**: Los datos específicos del módulo requieren cero cambios de código de interfaz.

---

## Fase 10: Historia de Usuario 8 - Buscar y encontrar entidades rápidamente (Prioridad: P2)

**Objetivo**: Permitir a los usuarios buscar y filtrar entidades rápidamente, manteniendo la capacidad de respuesta con conjuntos de datos grandes.

**Prueba Independiente**: Un usuario puede introducir un término de búsqueda y ver solo las entidades coincidentes.

### Pruebas para la Historia de Usuario 8

- [x] T035 [P] [US8] Añadir pruebas unitarias para la lógica de filtrado de búsqueda en tests/unit/storage.test.js
- [x] T036 [P] [US8] Añadir pruebas de integración para el comportamiento de búsqueda en tests/integration/search-entities.test.js

### Implementación de la Historia de Usuario 8

- [x] T037 [P] [US8] Crear la interfaz de la barra de búsqueda en src/components/search-bar.js
- [x] T038 [US8] Conectar la entrada de búsqueda al filtrado y al comportamiento de estado vacío en src/app.js
- [x] T039 [US8] Asegurar que los resultados de búsqueda permanecen sincronizados con las acciones de crear, editar y eliminar en src/app.js

**Punto de control**: Las historias centrales de datos y la búsqueda deben estar ahora funcionalmente independientes.

---

## Fase 11: Historia de Usuario 9 - Registrar una fecha objetivo (Prioridad: P2)

**Objetivo**: Permitir a los usuarios adjuntar una fecha objetivo opcional a una entidad.

**Prueba Independiente**: Un usuario puede fijar una fecha en una entidad y verla mostrada en la lista.

### Pruebas para la Historia de Usuario 9

- [x] T040 [P] [US9] Añadir pruebas unitarias para validación y persistencia de la fecha objetivo en tests/unit/storage.test.js

### Implementación de la Historia de Usuario 9

- [x] T041 [P] [US9] Añadir la entrada de fecha objetivo al formulario de entidad en index.html
- [x] T042 [US9] Incluir targetDate en la lógica de validación, creación, actualización y búsqueda en src/storage.js
- [x] T043 [US9] Conectar targetDate al envío del formulario, poblado de edición y visualización de errores en src/app.js
- [x] T044 [US9] Mostrar la fecha objetivo en la lista de entidades en src/app.js

**Punto de control**: La Historia de Usuario 9 debe estar completamente funcional y ser comprobable de forma independiente.

---

## Fase 12: Historia de Usuario 10 - Registrar los detalles de documentos de una entidad (Prioridad: P2)

**Objetivo**: Permitir a los usuarios registrar detalles de documentos para una entidad y verlos juntos, con la eliminación en cascada protegiendo la integridad referencial.

**Prueba Independiente**: Un usuario puede añadir un documento a una entidad y ver los detalles mostrados con esa entidad; eliminar la entidad elimina sus documentos.

### Pruebas para la Historia de Usuario 10

- [x] T045 [P] [US10] Añadir pruebas unitarias para generación de entity_id y validación de documentos en tests/unit/storage.test.js
- [x] T046 [P] [US10] Añadir pruebas de integración para añadir un documento a una entidad en tests/integration/add-document.test.js
- [x] T047 [P] [US10] Añadir pruebas de integración para edición, eliminación y eliminación en cascada de documentos en tests/integration/manage-document.test.js

### Implementación de la Historia de Usuario 10

- [x] T048 [P] [US10] Crear la interfaz del formulario de documento en src/components/document-form.js
- [x] T049 [P] [US10] Crear la interfaz de la lista de documentos en src/components/document-list.js
- [x] T050 [US10] Conectar las acciones de crear, editar y eliminar documentos para persistirlos en src/app.js
- [x] T051 [US10] Añadir entity_id a la creación de entidades y mostrar los documentos con su entidad en src/app.js
- [x] T052 [US10] Eliminar en cascada los documentos cuando se elimina una entidad en src/storage.js

**Punto de control**: Los datos maestros y los documentos transaccionales deben estar completamente vinculados.

---

## Fase 13: Historia de Usuario 11 - Buscar entidades en una pantalla dedicada (Prioridad: P2)

**Objetivo**: Proporcionar la pantalla de búsqueda dedicada accesible desde la pantalla de bienvenida, manteniendo la edición en la pantalla de gestión.

**Prueba Independiente**: Un usuario navega desde la pantalla de bienvenida a la pantalla de búsqueda, busca, ve resultados o un estado vacío, y vuelve a Inicio.

### Implementación de la Historia de Usuario 11

- [x] T053 [P] [US11] Añadir la entrada de búsqueda y la lista de resultados a la vista de búsqueda dedicada en index.html
- [x] T054 [US11] Conectar la entrada de búsqueda al filtrado de resultados y mostrar un estado vacío en la pantalla de búsqueda en src/app.js
- [x] T055 [US11] Añadir navegación al Panel desde la pantalla de búsqueda en index.html

**Punto de control**: Todas las historias del usuario de negocio deben estar completamente funcionales y ser comprobables de forma independiente.

---

## Fase 14: Historia de Usuario 12 - Configurar el ciclo de vida de estados de documentos (Prioridad: P2)

**Objetivo**: Aplicar los estados y transiciones configurados en los documentos manteniendo el estado de texto libre cuando no hay configuración.

**Prueba Independiente**: Con cotización→pedido→facturado configurado, solo se ofrecen los estados siguientes válidos, los inválidos se rechazan con explicaciones, y el estado es visible de un vistazo; sin configuración, el estado permanece como texto libre.

### Pruebas para la Historia de Usuario 12

- [x] T056 [P] [US12] Añadir pruebas unitarias para la aplicación de transiciones de estado en tests/unit/storage.test.js

### Implementación de la Historia de Usuario 12

- [x] T057 [US12] Restringir las opciones de estado de documento a las transiciones permitidas y aplicarlas al guardar en src/components/document-form.js y src/storage.js

**Punto de control**: La cadena de personalización (HU5 → HU6/HU7/HU12) está completa de extremo a extremo.

---

## Fase 15: Pulido y Preocupaciones Transversales

**Propósito**: Mejorar la calidad, accesibilidad, fiabilidad y el comportamiento con conjuntos de datos grandes en todas las historias.

- [x] T058 [P] Añadir refinamientos de accesibilidad para etiquetas, foco de teclado y estructura semántica
- [x] T059 [P] Añadir pulido final de UX para estados vacíos, mensajes de validación y diseño responsivo
- [x] T060 Verificar que el renderizado de listas y la búsqueda permanecen responsivos y correctos con 500 registros (FR-032, SC-004)
- [x] T061 Ejecutar la suite completa de pruebas y probar manualmente los flujos principales de usuario
- [x] T062 [P] Añadir estilos para la pantalla de bienvenida y la navegación de vistas en src/styles.css
- [x] T063 Ejecutar la suite completa de pruebas y la compilación de producción para verificar que no hay regresiones

---

## Fase 16: Historia de Usuario 13 - Marco de espacio de trabajo ERP con marca (Prioridad: P1)

**Objetivo**: Envolver cada pantalla en un marco ERP persistente: una barra superior con logotipo derivado y nombre del módulo, más una barra lateral de botones de módulo con resaltado de módulo activo y contracción responsiva.

**Prueba Independiente**: En cada pantalla la barra superior y la barra lateral son visibles, el módulo activo está resaltado, la navegación entre módulos preserva los datos, y la barra lateral se contrae a una columna de iconos en ventanas gráficas estrechas.

### Pruebas para la Historia de Usuario 13

- [x] T064 [P] [US13] Añadir pruebas unitarias para validación del color de acento en tests/unit/module-config.test.js
- [x] T065 [P] [US13] Añadir pruebas de integración que afirmen que el marco (logotipo, nombre del módulo, botones de barra lateral, resaltado activo) aparece en todas las pantallas en tests/integration/workspace-shell.test.js

### Implementación de la Historia de Usuario 13

- [x] T066 [P] [US13] Añadir el marcado del marco del espacio de trabajo (barra superior, montaje de logotipo SVG en línea, botones de módulo en barra lateral, región de contenido principal) a index.html
- [x] T067 [P] [US13] Crear src/components/shell.js para renderizar el logotipo monograma SVG a partir del nombre del módulo, aplicar las etiquetas configuradas a los botones de módulo, gestionar el resaltado de módulo activo y exponer eventos de navegación
- [x] T068 [US13] Reemplazar las pestañas horizontales de gestión y la navegación independiente hacia atrás por enrutamiento de módulos mediante la barra lateral en src/app.js
- [x] T069 [P] [US13] Construir la hoja de estilos de tokens de diseño ERP (variables de color, escala de espaciado, tipografía) más estilos de barra superior, barra lateral y tarjetas en src/styles.css
- [x] T070 [US13] Soportar un theme.accentColor opcional en la validación de src/module-config.js y aplicarlo como propiedad personalizada de CSS en src/app.js
- [x] T071 [US13] Contraer la barra lateral a una columna de iconos en ventanas gráficas estrechas en src/styles.css
- [x] T072 [P] [US13] Actualizar las pruebas de integración existentes (manage-tabs.test.js, relabeling.test.js) para apuntar al marco de barra lateral en lugar de los botones de pestañas/bienvenida

**Punto de control**: Todas las pantallas se renderizan dentro del marco con marca con navegación por barra lateral funcional y sin pérdida de datos.

---

## Fase 17: Historia de Usuario 3 (revisada) - Panel de inicio con acciones rápidas y estadísticas (Prioridad: P1)

**Objetivo**: Reemplazar la vista de bienvenida de dos botones por un panel ERP que ofrece múltiples botones de acción rápida y estadísticas de registros en vivo.

**Prueba Independiente**: La aplicación abre en un panel con acciones rápidas para nueva entidad, nuevo documento, gestión de entidades y buscar registros; activarlas aterriza en el lugar correcto listo para introducir datos, y las tarjetas de estadísticas coinciden con los registros almacenados.

### Pruebas para la Historia de Usuario 3

- [x] T073 [P] [US3] Añadir pruebas de integración para las acciones rápidas del panel y las estadísticas en vivo en tests/integration/dashboard.test.js

### Implementación de la Historia de Usuario 3

- [x] T074 [P] [US3] Añadir el marcado del panel (encabezado, cuadrícula de acciones rápidas, tarjetas de estadísticas) a index.html reemplazando la vista de bienvenida de dos botones
- [x] T075 [US3] Conectar los botones de acción rápida para abrir la gestión de entidades, la gestión de documentos (formularios limpiados) y la búsqueda (entrada enfocada) en src/app.js
- [x] T076 [US3] Renderizar y refrescar los recuentos de entidades/documentos desde el almacenamiento cada vez que se muestra el panel en src/components/dashboard.js
- [x] T077 [P] [US3] Dar estilo al encabezado del panel, las tarjetas de acción rápida y los mosaicos de estadísticas en src/styles.css

**Punto de control**: La aplicación abre en un panel funcional; cada tarea ERP clave está a un clic.

---

## Fase 18: Pulido y Regresión (Aspecto ERP)

**Propósito**: Unificar el estilo visual en toda la aplicación rediseñada y protegerse contra regresiones.

- [x] T078 [P] Rediseñar formularios, listas, insignias, mensajes de error y estados vacíos según el sistema de tokens de diseño en src/styles.css
- [x] T079 [P] Verificar el orden de foco del teclado y aria-current en los botones de módulo de la barra lateral (pase de accesibilidad del nuevo marco)
- [x] T080 Actualizar README.md con las secciones del marco del espacio de trabajo, panel y tematización
- [x] T081 Ejecutar la suite completa de pruebas y la compilación de producción para verificar que no hay regresiones (FR-032, SC-004)

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- Configuración (Fase 1): Sin dependencias
- Fundacional (Fase 2): Depende de completar Configuración
- Historia de Usuario 1 (Fase 3): Depende de completar Fundacional
- Historia de Usuario 2 (Fase 4): Depende de completar la implementación de la Historia de Usuario 1
- Historia de Usuario 3 (Fase 5): Depende de completar Fundacional
- Historia de Usuario 4 (Fase 6): Depende de completar la Historia de Usuario 3 y se beneficia de que los formularios de las Historias de Usuario 1-2 estén disponibles
- Historia de Usuario 5 (Fase 7): Depende de completar Fundacional; desbloquea HU6, HU7, HU12
- Historia de Usuario 6 (Fase 8): Depende de completar la Historia de Usuario 5
- Historia de Usuario 7 (Fase 9): Depende de completar la Historia de Usuario 5
- Historia de Usuario 8 (Fase 10): Depende de completar Fundacional y puede proceder después de la Historia de Usuario 1
- Historia de Usuario 9 (Fase 11): Depende de completar Fundacional y puede proceder después de la Historia de Usuario 1
- Historia de Usuario 10 (Fase 12): Depende de completar la implementación de la Historia de Usuario 1 y del campo entity_id
- Historia de Usuario 11 (Fase 13): Depende de la Historia de Usuario 8 (lógica de búsqueda) y la Historia de Usuario 3 (navegación)
- Historia de Usuario 12 (Fase 14): Depende de la Historia de Usuario 5 (configuración) y la Historia de Usuario 10 (documentos)
- Pulido (Fase 15): Depende de que todas las historias de usuario deseadas estén completas
- Historia de Usuario 13 (Fase 16): Depende de que las Fases 1-15 estén completas; reestructura la navegación entregada por HU3/HU4 dentro del marco
- Historia de Usuario 3 revisada (Fase 17): Depende de la Fase 16 (el enrutamiento por barra lateral debe existir antes de que las acciones del panel lo usen)
- Pulido Aspecto ERP (Fase 18): Depende de que las Fases 16 y 17 estén completas

### Oportunidades Paralelas

- T003 puede ejecutarse en paralelo con las tareas de configuración
- T007 puede completarse junto al trabajo de almacenamiento y esqueleto de la aplicación
- Las pruebas de cada historia pueden crearse en paralelo con las tareas de implementación de la misma historia
- Después de la Fase 7 (perfil de configuración), HU6 (Fase 8) y HU7 (Fase 9) pueden proceder en paralelo
- HU8 (Fase 10) y HU9 (Fase 11) son independientes y pueden proceder en paralelo después de la Historia de Usuario 1
- En la Fase 15, T058-T060 pueden ejecutarse en paralelo antes de las tareas finales de verificación T061-T063
- En la Fase 16, T064-T067 y T069 pueden ejecutarse en paralelo; T072 aterriza junto al cambio de enrutamiento T068
- En la Fase 17, T073/T074/T077 pueden ejecutarse en paralelo con T075/T076
- En la Fase 18, T078 y T079 pueden ejecutarse en paralelo antes de la verificación final T080-T081
