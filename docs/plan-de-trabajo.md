# Plan de trabajo — Módulo Adquisiciones y Compras

**Asignatura**: Modelación de Sistemas 2026-2 — Departamento de Ingeniería Industrial, UdeC
**Versión**: 1.0 (27 de octubre de 2026). Reemplaza la versión 0.1 del 20 de octubre, que describía por error un módulo de Ventas / CRM.
**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

---

## 1. Propuesta de MVP

**Problema.** En muchas pymes las compras se gestionan por correo y planillas: no queda registro de quién autorizó cada compra, se paga lo que el proveedor factura aunque no coincida con lo recibido, y las facturas se aprueban tarde, incumpliendo el plazo legal de pago de 30 días.

**Solución.** Un módulo de Adquisiciones y Compras integrado al ERP que ordena el ciclo completo:

```
Solicitud de compra → Cotizaciones de proveedores → Orden de compra → Recepción → Factura del proveedor
```

**Cliente (quién adopta y paga el sistema):** gerencia de administración y finanzas de una pyme chilena con un área de compras de 1 a 5 personas.

**Usuarios (quién lo opera):**

| Usuario | Necesidad principal |
|---|---|
| Solicitante | Pedir lo que necesita y seguir su solicitud |
| Comprador | Cotizar, comparar ofertas y emitir órdenes de compra |
| Jefe de compras | Aprobar solicitudes y facturas, controlar gasto y proveedores |
| Encargado de bodega | Registrar lo recibido y lo rechazado |
| Administrador | Mantener proveedores, datos bancarios, usuarios y centros de costo |
| Otros módulos del ERP | Inventario lee lo recibido; Contabilidad lee las facturas aprobadas para pago |

**Alcance del MVP**: 10 historias de usuario priorizadas (P1 a P3) en [`spec.md`](../specs/002-modulo-adquisiciones-compras/spec.md).

| Prioridad | Funcionalidad |
|---|---|
| P1 | Gestión de proveedores (US1) |
| P1 | Solicitudes de compra con aprobación (US2) |
| P1 | Órdenes de compra (US3) |
| P1 | Recepciones parciales y totales (US4) |
| P1 | Panel con pendientes y alertas (US5) |
| P2 | Cotizaciones y comparación de ofertas (US6) |
| P2 | Facturas con conciliación de tres vías (US7) |
| P2 | Catálogo de productos por proveedor (US8) |
| P3 | Evaluación de proveedores (US9) |
| P3 | Exportación de reportes a CSV (US10) |

**Fuera de alcance:** backend real, autenticación real, conexión con el SII, registro del pago, control de presupuesto y compras públicas.

---

## 2. Metodología: Spec Driven Development con Speckit

Cada fase produce un archivo en `specs/002-modulo-adquisiciones-compras/`. Las decisiones relevantes se registran como **Issues de GitHub** con la etiqueta `decision`.

| Fase | Comando Speckit | Producto | Estado |
|---|---|---|---|
| 0. Principios | `speckit.constitution` | `.specify/memory/constitution.md` | Se usa la del template (v1.0.0) |
| 1. Especificación | `speckit.specify` + `speckit.clarify` | `spec.md` | Borrador listo; quedan 2 puntos por aclarar (FR-021 y FR-022) |
| 2. Diseño técnico | `speckit.plan` | `plan.md`, `data-model.md` | Borrador listo |
| 3. Tareas | `speckit.tasks` | `tasks.md` | Pendiente |
| 4. Implementación | `speckit.implement` | Código en `src/compras/` dentro del template | Pendiente |

Los comandos están en `.opencode/commands/` del repositorio.

---

## 3. Cronograma

| Semana | Fechas | Actividad | Entregable | Hito |
|---|---|---|---|---|
| 0 | 20 oct | MER y plan de trabajo (versión Ventas, corregida después) | `data-model.md`, `docs/mer.png`, este plan | Revisión intermedia (10 %) |
| 1 | 26 – 27 oct | Feedback del profesor; cambio a Adquisiciones y Compras; `spec.md` y `plan.md` | Specs v1.0 | |
| 1 | 28 oct – 1 nov | Aclarar FR-021 y FR-022; `tasks.md`; dejar el template corriendo | `tasks.md`, iteración 0 | |
| 2 | 2 – 8 nov | Iteración 1: versión integrada de prueba | Proveedores y OC por configuración | Avance semanal |
| 3 | 9 – 15 nov | Iteración 2: solicitud → OC → recepción | US2, US3, US4 | Avance semanal |
| 4 | 16 – 22 nov | Iteración 3: cotizaciones, facturas, catálogo | US6, US7, US8; demo del ciclo completo | Avance semanal |
| 5 | 23 – 26 nov | Iteración 4: evaluación, CSV, pruebas, README final | Repositorio congelado el 26 nov | |
| 5 | 27 – 29 nov | Ensayo: **todos los integrantes** presentan cronometrado (5 min) | Presentación | |
| 6 | semana del 30 nov | Presentación y demo | | **Presentación (10 %) y revisión final (10 %)** |

---

## 4. Roles y responsabilidades

Cada rol tiene un responsable, pero **todos revisan todo**: el presentador se elige al azar. Asignación provisoria; la definitiva se registra en un Issue con la etiqueta `decision`.

| Rol | Responsable | Tareas |
|---|---|---|
| Coordinación y repositorio | Bastián Domke Cifuentes | Issues, milestones, revisión de pull requests, cumplimiento de plazos |
| Producto y specs | Joaquín Westermeier Manoli | `spec.md`, historias de usuario, criterios de aceptación |
| Datos | Julio Castro González | MER, `data-model.md`, datos semilla, sección de riesgos y sesgos |
| Implementación | Valentina Barrientos Acuña y Maximiliano Cid Cereceda | `plan.md`, `tasks.md`, generación e integración del código con el template |
| Calidad y documentación | Franco García Lépez | Pruebas de las historias de usuario, README, formato general |

---

## 5. Correspondencia con la rúbrica

| Ítem de la rúbrica | Dónde se cumple |
|---|---|
| Formato general | README y archivos `.md` con estructura uniforme y referencias |
| Historias de usuario y decisiones de bases de datos | `spec.md` (10 historias) + Issues `decision` + diccionario de datos en `data-model.md` |
| Claridad del problema y solución | Secciones Problema y Solución propuesta en `spec.md` |
| MER consistente con la solución | `docs/mer.png`, generado automáticamente desde el diagrama de `data-model.md`; cada historia usa entidades del MER |
| Usuarios y manejo de riesgos | Cliente y usuarios en `spec.md`; datos sensibles, riesgos y sesgos en `data-model.md`, sección 6 |
| Presentación | Ensayos cronometrados; demo del ciclo solicitud → cotizaciones → OC → recepción → factura conciliada |

---

## 6. Gestión del trabajo en GitHub

- **Milestones**: `Iteración 1 (8-nov)`, `Iteración 2 (15-nov)`, `Iteración 3 (22-nov)`, `Entrega final (26-nov)`.
- **Etiquetas**: `decision`, `spec`, `datos`, `frontend`, `bug`, `docs`, y una por iteración.
- **Historias y tareas**: cada historia de usuario es un Issue con responsable; sus tareas salen de `tasks.md`.
- **Ramas**: una por historia (`feature/us1-proveedores`), integrada a `main` mediante pull request revisado por otro integrante.
- **Mensajes de commit**: formato `tipo(alcance): descripción`, por ejemplo `docs(purchasing): ...` o `feat(purchasing): ...`.
- **Reunión semanal** de 30 minutos; acuerdos registrados en un Issue.

---

## 7. Riesgos del proyecto

| Riesgo | Mitigación |
|---|---|
| Falta la carpeta `src/` del template | Consultar a los ayudantes en la semana del 28 oct; bloquea la iteración 1 |
| El código generado por IA no respeta el template | Constitución del template y `plan.md` como contexto obligatorio de cada `speckit.implement` |
| El ciclo completo es grande para el plazo | Historias priorizadas: P1 asegura un MVP funcional aunque P3 no alcance |
| Desbalance de carga (afecta la coevaluación) | Historias asignadas en Issues con responsable visible |
| MER y MVP divergen durante la implementación | Toda modificación de datos pasa primero por `data-model.md`; la imagen se regenera desde el diagrama |
| La presentación excede los 5 minutos | Guion fijo y ensayos cronometrados de todos |
