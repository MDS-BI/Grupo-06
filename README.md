# Módulo Ventas / CRM — MVP de ERP

Trabajo grupal de **Modelación de Sistemas 2026-2**, Departamento de Ingeniería Industrial, Universidad de Concepción.

**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

## Estado del repositorio

**Revisión intermedia** (foco: modelo entidad-relación y plan de trabajo). El módulo Ventas / CRM todavía no está implementado; se construirá sobre el template del curso (descrito al final de este archivo) con Spec Driven Development (Speckit), a partir de los archivos de `specs/002-modulo-ventas-crm/`.

## Problema y solución (resumen)

Las pymes que venden a otras empresas gestionan clientes, cotizaciones y pedidos en planillas y correos separados, lo que provoca cotizaciones sin seguimiento, poca visibilidad del embudo de ventas y pérdida de información cuando un vendedor deja la empresa.

El MVP propone un módulo de Ventas / CRM integrado al ERP que centraliza el ciclo comercial:

```
Cliente → Interacción → Oportunidad → Cotización → Pedido → Documento de venta
```

Detalle completo del alcance, usuarios, cronograma y roles en el [plan de trabajo](docs/plan-de-trabajo.md).

## Modelo entidad-relación

![MER Módulo Ventas / CRM](docs/mer.png)

Diccionario de datos, cardinalidades, reglas de negocio, datos sensibles y sesgos en [`data-model.md`](specs/002-modulo-ventas-crm/data-model.md).

## Archivos del módulo Ventas / CRM

```
docs/
├── plan-de-trabajo.md             ← propuesta de MVP, cronograma, roles
├── mer.png                        ← imagen del MER
└── mer.dot                        ← fuente de la imagen (Graphviz)
specs/
├── 001-erp-base-module/           ← especificación del template (no se modifica)
└── 002-modulo-ventas-crm/
    └── data-model.md              ← modelo de datos del módulo (Speckit)
```

Próximos archivos según el plan: `spec.md`, `plan.md` y `tasks.md` en `specs/002-modulo-ventas-crm/`, y la constitución en `.specify/memory/constitution.md`.

Para regenerar la imagen del MER se requiere [Graphviz](https://graphviz.org/download/). Desde la raíz del repositorio:

```bash
dot -Tpng -Gdpi=150 docs/mer.dot -o docs/mer.png
```

## Registro de decisiones

Las decisiones de diseño se registran como **Issues** con la etiqueta `decision`.

---

## Template base del curso: ERP Software Base Module (Vite + Vanilla JS)

Minimal single-page app serving as an Enterprise Resource Planning (ERP) software base module. It provides the common foundation for building custom ERP modules: master data management (Entities) and linked transactional documents (Documents) with create/edit/delete/search, validation, and browser localStorage persistence — using Vite and vanilla HTML, CSS, and JavaScript.

The user interface is fully in **Spanish** (default terms: Entidad / Documento; module name: Módulo Base ERP), including labels, validation messages, empty states, and dialogs.

Entities carry standard ERP master-data fields (name, code, tax ID, email, phone, address, category, target date, credit limit, payment terms). Documents use series + folio numbering and carry a monetary breakdown (subtotal, discount, tax, total), currency, payment terms, notes, quantity, dates, and status.

The app presents itself as a coherent ERP workspace:

- **Workspace shell** — every screen lives inside a branded chrome: a top bar with a logo (an SVG monogram derived from the module name) and module name, plus a persistent sidebar of module buttons (Panel, Entidades, Documentos, Búsqueda). The active module is highlighted (`aria-current="page"`), and the sidebar collapses to an icon rail on narrow viewports.
- **Home dashboard** — the entry screen offers quick-action buttons for key ERP tasks (new entity, new document, open management areas, find records) and live statistic cards showing record counts.
- **Design tokens** — styling is driven by CSS custom properties in `src/styles.css`, so branding changes apply globally.

### Setup

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the URL Vite prints).

### Tests

Run the full test suite (unit + integration) with:

```bash
npm test
```

Or a one-off run without watch mode:

```bash
npx vitest run
```

### Building Custom Modules

Custom ERP modules built on this base define:

- What an **Entity** represents (e.g., customer, product, asset) plus domain-specific fields.
- What a **Document** represents (e.g., order, invoice, contract).
- Module-specific labels and validation rules.

The base module handles identity generation, timestamps, referential integrity between entities and documents, cascade deletion, navigation, and search. See `specs/001-erp-base-module/` for the full specification.

### Tailoring via Configuration

All tailoring lives in one place: the `userConfig` object at the top of `src/module-config.js`. Developers edit this single export; no core code changes are required. Available knobs:

- `moduleName` — display name shown in the top bar, dashboard, and document title; also derives the logo monogram.
- `labels` — rename Entity/Document terms across every screen, including sidebar buttons, quick actions, forms, and messages. Spanish articles and agreements (el/la, seleccionado/a) are derived from the first word of each configured term.
- `customFields` — declare extra fields per record type with `target` (`entity` or `document`), `key`, `label`, `type` (`text`, `number`, `date`, or `select`), optional `required`, and `options` for selects. Keys must not collide with base field names (see `specs/001-erp-base-module/data-model.md`). Values persist alongside records and appear in search results.
- `statusLifecycle` — restrict document statuses to a configured list of `statuses` with permitted `transitions` between them. Without it, status stays a free-form field.
- `theme.accentColor` — a hex color (e.g., `"#0f62fe"`) applied across the shell as highlights and primary controls. Invalid values fall back to the default.

If the configuration is invalid (unknown types, bad keys, transitions referencing unknown statuses, non-hex accent colors), the app shows the problems in a banner and falls back to defaults instead of breaking.

### Notes

- Data is persisted to `localStorage` under the keys `erp_base_module:entities` and `erp_base_module:documents`.
- Deleting an entity also deletes its documents (cascade).
- This project intentionally uses vanilla HTML, CSS, and JavaScript for simplicity.
