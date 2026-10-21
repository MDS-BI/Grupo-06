# Plan de trabajo — Módulo Ventas / CRM

**Asignatura**: Modelación de Sistemas 2026-2 — Departamento de Ingeniería Industrial, UdeC
**Versión**: 0.1 (revisión intermedia, 20 de octubre de 2026)
**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

---

## 1. Propuesta de MVP

**Problema.** Las pymes que venden a otras empresas suelen gestionar clientes, cotizaciones y pedidos en planillas y correos separados. Esto genera cotizaciones vencidas sin seguimiento, falta de visibilidad del embudo de ventas y pérdida de información cuando un vendedor deja la empresa.

**Solución.** Un módulo de Ventas / CRM integrado al ERP que centraliza el ciclo comercial:

```
Cliente → Interacción → Oportunidad → Cotización → Pedido → Documento de venta
```

**Cliente (quién adopta y paga el sistema):** gerencia comercial de una pyme chilena con equipo de ventas de 3 a 15 personas.

**Usuarios (quién lo opera):**

| Usuario | Necesidad principal |
|---|---|
| Vendedor | Registrar clientes e interacciones, cotizar rápido, ver sus oportunidades y su avance contra la meta |
| Jefe de ventas | Ver el embudo de todo el equipo, cumplimiento de metas, motivos de pérdida; asignar cuentas |
| Administrador | Mantener catálogo de productos, usuarios y metas |
| Otros módulos del ERP | Leer pedidos confirmados (Distribución) y documentos de venta (Contabilidad) |

**Alcance del MVP (prioridades).**

| Prioridad | Funcionalidad |
|---|---|
| P1 | Gestión de clientes y contactos (crear, editar, buscar, filtrar) |
| P1 | Embudo de oportunidades en vista kanban por etapa |
| P1 | Creación de cotizaciones con líneas de producto, cálculo de neto, IVA y total |
| P1 | Conversión de cotización aceptada en pedido de venta |
| P1 | Panel principal con indicadores: ventas del mes, cumplimiento de meta, conversión, valor del embudo |
| P2 | Bitácora de interacciones por cliente |
| P2 | Metas mensuales por vendedor |
| P2 | Emisión simulada de factura o boleta |
| P3 | Exportación de reportes a CSV |

**Fuera de alcance:** backend real, autenticación real, conexión con el SII, envío real de correos.

---

## 2. Metodología: Spec Driven Development con Speckit

Cada fase produce un archivo en `specs/002-modulo-ventas-crm/`. Las decisiones relevantes se registran como **Issues de GitHub** con la etiqueta `decision`.

| Fase | Comando Speckit | Producto |
|---|---|---|
| 0. Principios | constitution | `.specify/memory/constitution.md` |
| 1. Especificación | specify + clarify | `spec.md` (problema, usuarios, historias de usuario, criterios de aceptación) |
| 2. Diseño técnico | plan | `plan.md`, `data-model.md` (versión final) |
| 3. Tareas | tasks | `tasks.md` |
| 4. Implementación | implement | Código del MVP dentro del template del curso |

> Los nombres exactos de los comandos dependen de la versión de Speckit instalada; verificar en su documentación oficial.

---

## 3. Cronograma

| Semana | Fechas | Actividad | Entregable | Hito |
|---|---|---|---|---|
| 1 | 20 oct | MER v0.1 y plan de trabajo | `data-model.md`, `docs/mer.png`, este plan | **Revisión intermedia (10 %)** |
| 1–2 | 21 – 27 oct | Incorporar feedback del MER. Redactar constitución y especificación; resolver ambigüedades con clarify | `constitution.md`, `spec.md` | |
| 2–3 | 28 oct – 3 nov | Plan técnico ajustado al template; MER final y su imagen | `plan.md`, `data-model.md` v1.0, `mer.png` final | |
| 3 | 4 – 8 nov | Desglose de tareas por historia de usuario | `tasks.md` | |
| 4–5 | 9 – 20 nov | Implementación con IA generativa: primero P1, luego P2. Datos semilla ficticios | MVP funcional | Demo interna 20 nov |
| 6 | 21 – 26 nov | Pruebas, corrección de errores, README con instrucciones de ejecución, sección de riesgos, sesgos y escalabilidad | README completo | Congelamiento del repo 26 nov |
| 6 | 27 – 29 nov | Ensayo de la presentación: **todos los integrantes** la presentan cronometrada (5 min) | Presentación | |
| 7 | semana del 30 nov | Presentación y demo | | **Presentación (10 %) y revisión final (10 %)** |

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
| Historias de usuario y decisiones de bases de datos | `spec.md` + Issues etiquetados `decision` + diccionario de datos en `data-model.md` |
| Claridad del problema y solución | Secciones de problema y solución en `spec.md` |
| MER consistente con la solución | `docs/mer.png` derivado de `data-model.md`; cada historia P1 usa entidades del MER |
| Usuarios y manejo de riesgos | Tabla de usuarios (`spec.md`) y sección de datos sensibles y sesgos (`data-model.md`, sección 6) |
| Presentación | Ensayos cronometrados; demo con el flujo cliente → cotización → pedido → panel |

---

## 6. Gestión del trabajo en GitHub

- **Milestones**: `Revisión intermedia (20-oct)`, `Specs (8-nov)`, `MVP (20-nov)`, `Entrega final (30-nov)`.
- **Etiquetas**: `decision`, `spec`, `datos`, `frontend`, `bug`, `docs`.
- **Ramas**: una por historia de usuario (`feature/us1-clientes`), integración a `main` mediante pull request revisado por otro integrante.
- **Reunión semanal** de 30 minutos; acuerdos registrados en un Issue.

---

## 7. Riesgos del proyecto

| Riesgo | Mitigación |
|---|---|
| El código generado por IA no respeta el template | Incluir las convenciones del template en la constitución y en `plan.md` |
| Desbalance de carga (afecta la coevaluación) | Tareas asignadas en Issues con responsable visible |
| MER y MVP divergen durante la implementación | Toda modificación de datos pasa primero por `data-model.md` |
| La presentación excede los 5 minutos | Guion fijo y ensayos cronometrados de todos |
