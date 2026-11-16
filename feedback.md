Feedback Avance (26/10/26)

- buen avance pero falta el plan para el modulo ventas.

Proximos pasos:
 
- rectificar puntos anteriores 
- trabajar en los specs (historias de usuario, US) para definir tareas
- dividirse las US y tareas para una siguiente iteracion (avances cada semana)
- ejecutar una version integrada de prueba

 Feedback Avance 02 (2/11/26)

- Se insiste en el manejo de los specs (revisar video). Cada carpeta debe tener toda la estructura base (y editar sobre ella).
- no se observan historias de usuario por TODOS los miembros del grupo (solo actividad de 3 persona)

Proximos pasos:

- rectificar lo anterior, terminar specs y crear tareas a partir de los specs
- hacer primera implmentacion, registar modificaciones/incremental y volver al spec
- dividir el grupo entre modificaciones (ajustes previos) e incremental (nueva funcionalidad)
- integrar nueva version en 2 semanas

Feedback Avance (16/11/26)

- Se insiste en el manejo de los specs (revisar video). Cada carpeta debe tener toda la estructura base (y editar sobre ella).

Cambios en la especificación:

- spec.md: se agregaron US5 a US11, la sección Clarifications (umbral 1.000.000 CLP, tolerancia 1 %, datos bancarios visibles para `admin_ti` y `jefe_compras`, formato CSV) y el flujo de productos dañados (FR-025 a FR-030). Algunas US nuevas (US5, US11) no usan el formato de las anteriores.
- tasks.md: reescrito y alineado con las US1–US11 y FR-025 a FR-030. Coherente con spec.md, pero casi todas las tareas aparecen como hechas.

Consistencia sitio–especificación:

- US5 (T043–T050): `src/compras/panel.js` existe, pero no se verificó el contenido de panel.js ni de vista.js. No verificable que el panel cumpla los escenarios.
- T100/T102–T106: `trazabilidad.js` existe y tiene tests, pero no se verificó que `devoluciones.js` y `facturas.js` lo usen. No verificable.
- T017/T093: `src/module-config.js` no incluye regla de visibilidad por rol. El enmascaramiento no es verificable (reglas.js no incluido).
- Funcionalidad fuera de spec: `index.html` mantiene las vistas genéricas Entidades/Documentos/Búsqueda del template, que no figuran en spec.md. Revisar implementacion
- hacer mejoras de funcionalidad e interfaz de usuario, incluir data simulada para probar campos, incluir mejoras de estilo, transicion, navegacion, etcetera.

Presentacion de MVP final en 2 semanas.
