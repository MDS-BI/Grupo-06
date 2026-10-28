# Repository Structure Analysis — Focus: Acquisitions & Sales Module

**Repository**: `Grupo-06` — ERP Software Base Module (Vite + Vanilla JS)
**Date**: 2026-10-20
**Scope**: Overall repository structure, the base-module architecture that custom modules plug into, the current state of the Sales (`Ventas`) module, the proposed shape of an Acquisitions (`Compras`/`Adquisiciones`) module, and the gaps between specs, tests, and source code.

---

## 1. Executive Summary

This repository is a **spec-driven ERP base module**: a single-page app (Vite, vanilla HTML/CSS/JS, Spanish UI) that provides master-data management (**Entities**) plus linked transactional records (**Documents**) with CRUD, validation, search, cascade deletion and `localStorage` persistence.

**There is no dedicated "Acquisitions and Sales" module in the codebase today.** Sales appears only as:

- the canonical *example* configuration profile used throughout the specs (`specs/001-erp-base-module/spec.md`, `plan.md`, `quickstart.md`, `tasks.md`), and
- test fixtures (`tests/unit/module-config.test.js`, `tests/integration/dashboard.test.js`, `relabeling.test.js`, `workspace-shell.test.js`), where `moduleName: 'Ventas'`, `entity: 'Cliente'`, `document: 'Pedido de Venta'`.

Acquisitions (`Compras`/`Proveedores`) does not appear anywhere yet. Both modules are meant to be produced as **configuration profiles on top of the base module**, not as separate codebases.

**Critical structural finding**: the latest commit (`a0062c0` "ERP update: changed styles and fonts") **deleted the entire application source** — `index.html` and all 14 files under `src/` (1,807 deleted lines). HEAD contains specs and tests only; the app itself no longer exists in the tree (it is recoverable from `501e9c6`). Consequently the 81/81 completed tasks in `tasks.md` and the whole test suite reference files that are absent (tests import `../../src/app.js`, `../../src/module-config.js`, `../../index.html`).

---

## 2. Repository Layout (HEAD)

```text
Grupo-06/
├── README.md                     # English overview, setup, config knobs
├── package.json                  # vite + vitest + jsdom; scripts: dev/build/preview/test
├── vitest.config.mjs             # fileParallelism: false (sequential test runs)
├── pyproject.toml / uv.lock      # Python tooling (spec-kit scripts only, not the app)
│
├── specs/                        # ★ Spec-driven development artifacts (spec-kit / Specify)
│   └── 001-erp-base-module/
│       ├── spec.md               # 13 user stories, FR-001..FR-039, XR-001..XR-005
│       ├── plan.md               # tech context + intended src/ structure
│       ├── data-model.md         # Entity, Document, ModuleConfig schemas + validation rules
│       ├── research.md           # stack decisions (Vite, vanilla JS, localStorage)
│       ├── quickstart.md         # how to tailor the module via configuration
│       ├── tasks.md              # 81 tasks, all checked [X]
│       ├── contracts/entity-storage.md  # storage API contract (CRUD + cascade)
│       └── checklists/requirements.md
│
├── tests/                        # ★ Test suite (still present, source missing)
│   ├── unit/
│   │   ├── storage.test.js       # entity/document CRUD, validation, search, cascade
│   │   └── module-config.test.js # config normalization incl. a full "Ventas" profile
│   └── integration/              # JSDOM boots of index.html + src/app.js
│       ├── dashboard.test.js     # boots with salesConfig
│       ├── relabeling.test.js    # Entidad→Cliente / Documento→Pedido de Venta
│       ├── workspace-shell.test.js  # "Sales Suite" branding + relabeling
│       ├── create-entity / edit-delete-entity / manage-document /
│       │   manage-tabs / search-entities / add-document / custom-fields
│
├── .specify/                     # Specify (spec-kit) tooling: constitution, templates, scripts
├── .opencode/                    # opencode speckit command definitions
├── .vscode/, .gitignore, package-lock.json, .python-version
│
└── [MISSING AT HEAD] index.html, src/   # ← deleted in a0062c0; last exists at 501e9c6
```

### Source structure as specified (`plan.md`) and as it existed at `501e9c6`

```text
index.html            # single HTML entry: shell markup + 4 views + forms
src/
├── main.js           # entry point (4 lines) → initApp()
├── app.js            # orchestration: view switching, form wiring, navigation (284 lines)
├── module-config.js  # ★ ALL module tailoring: userConfig + normalizeConfig/labelFor
├── storage.js        # localStorage CRUD, validation, search, cascade delete (315 lines)
├── styles.css        # design tokens (CSS custom properties) + layout (320 lines)
└── components/
    ├── shell.js          # top bar, SVG monogram logo, sidebar, active-module state
    ├── dashboard.js      # quick actions + live stat cards
    ├── entity-form.js    # entity create/edit form (+ custom fields)
    ├── entity-list.js    # entity list rendering
    ├── document-form.js  # document create/edit form (+ lifecycle status control)
    ├── document-list.js  # document list + folioLabel (series-folio)
    ├── custom-fields.js  # generic renderer for declared custom fields
    └── search-bar.js     # dedicated search screen
```

---

## 3. How a "Module" Is Built on This Base

A custom module (Sales, Acquisitions, …) is defined **only** through the `userConfig` object at the top of `src/module-config.js`. Five knobs, validated at boot with visible fallback errors:

| Knob | Purpose | Fallback if absent/invalid |
|---|---|---|
| `moduleName` | Branding in top bar, dashboard, document title, logo monogram | `Módulo Base ERP` |
| `labels` | Rename Entity/Document terms on every screen (Spanish gender derived from first word) | `Entidad` / `Documento` |
| `customFields` | Extra fields per record type: `{target, key, label, type: text\|number\|date\|select, required?, options?}`; keys must not collide with `BASE_FIELDS` | none |
| `statusLifecycle` | `{statuses[], transitions{}}` — controlled document state machine | free-text status |
| `theme.accentColor` | Global accent color (CSS custom property) | `#2563eb` |

Data flow:

```text
module-config.js (userConfig → normalizeConfig)
        │  config (labels, customFields, lifecycle)
        ▼
storage.js (validation uses declared customFields; persistence in localStorage)
        │  entities[] / documents[]
        ▼
components/* (forms/lists render base + custom fields, labels from labelFor())
        ▼
app.js (view switching: dashboard | entities | documents | search)
```

Base data model (relevant fields for both target modules):

- **Entity**: `name`, `code`, `taxId`, `email`, `phone`, `address`, `category`, `description`, `targetDate`, `creditLimit`, `paymentTerms`, auto `entity_id`, timestamps.
- **Document**: `entity_id` (FK), `series` + `folio` (official number, e.g. `FAC-1001`), `startDate`, `endDate`, `quantity`, `subtotal`, `discount`, `taxAmount`, `totalAmount`, `currency`, `paymentTerms`, `notes`, `status`, timestamps.
- **Integrity**: documents belong to exactly one entity; deleting an entity cascades to its documents (`contracts/entity-storage.md`).
- **Storage keys**: `erp_base_module:entities`, `erp_base_module:documents`.

---

## 4. Sales Module (`Ventas`) — Current State

Sales is the *reference example* of the whole tailoring mechanism, but it exists only as configuration fixtures:

| Location | What it shows |
|---|---|
| `specs/001-erp-base-module/spec.md` (HU5, HU6) | Acceptance test: a "Ventas" profile (Entity→Cliente, Document→Pedido de Venta, custom fields, lifecycle) must render the app fully as a Sales module |
| `specs/001-erp-base-module/quickstart.md` | Step 1 of tailoring: set module name and term mappings, e.g. Entidad→Cliente |
| `tests/unit/module-config.test.js` | `salesConfig` accepted by `normalizeConfig`, `labelFor('documents') === 'Pedidos de Venta'` |
| `tests/integration/dashboard.test.js` | Dashboard under `salesConfig` shows "Nuevo Pedido de Venta", stat card "Pedidos de Venta" |
| `tests/integration/relabeling.test.js` | Every screen label re-mapped (form headings, delete buttons, search heading) |
| `tests/integration/workspace-shell.test.js` | Branding "Sales Suite" + relabeling inside the shell |
| `src/module-config.js` (historical) | Comment block documents exactly the Ventas profile: labels, custom fields (`zona`, `metodoEnvio`), lifecycle `cotización → pedido → facturado`, accent `#0f62fe` |

**Implied Sales profile (as designed):**

```js
const userConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes',
            document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
  customFields: [
    { target: 'entity',   key: 'zona',         label: 'Zona',          type: 'select', options: ['Norte', 'Sur'] },
    { target: 'document', key: 'metodoEnvio',  label: 'Método de envío', type: 'select', options: ['estándar', 'exprés'] }
  ],
  statusLifecycle: {
    statuses: ['cotización', 'pedido', 'facturado'],
    transitions: { 'cotización': ['pedido'], 'pedido': ['facturado'], 'facturado': [] }
  },
  theme: { accentColor: '#0f62fe' }
};
```

**Domain mapping (Sales)**: Entity = *Cliente* (with `creditLimit`, `paymentTerms`, `taxId` already in the base), Document = *Pedido de Venta / Factura* (with `series`/`folio` numbering and monetary breakdown already in the base).

---

## 5. Acquisitions Module (`Compras` / `Adquisiciones`) — Proposed Shape

No artifacts exist yet. Following the repo's convention (one folder per feature under `specs/`, tests booting `src/app.js` with a config override), an Acquisitions module would be a second configuration profile plus a new spec:

```text
specs/002-acquisitions-module/     # proposed (spec-kit workflow: /speckit.specify …)
├── spec.md, plan.md, data-model.md, research.md, tasks.md, quickstart.md
tests/unit/acquisitions-config.test.js
tests/integration/acquisitions-relabeling.test.js
```

**Proposed Acquisitions profile:**

```js
const userConfig = {
  moduleName: 'Compras',
  labels: { entity: 'Proveedor', entities: 'Proveedores',
            document: 'Orden de Compra', documents: 'Órdenes de Compra' },
  customFields: [
    { target: 'entity',   key: 'ruc',            label: 'RUC/NIF',          type: 'text' },
    { target: 'entity',   key: 'contacto',       label: 'Contacto',         type: 'text' },
    { target: 'entity',   key: 'plazoEntrega',   label: 'Plazo de entrega', type: 'number' },
    { target: 'document', key: 'monedaOrigen',   label: 'Moneda de origen', type: 'select', options: ['PEN', 'USD', 'EUR'] },
    { target: 'document', key: 'fechaRecepcion', label: 'Fecha de recepción', type: 'date' },
    { target: 'document', key: 'almacen',        label: 'Almacén',          type: 'select', options: ['Principal', 'Secundario'] }
  ],
  statusLifecycle: {
    statuses: ['solicitada', 'aprobada', 'recibida', 'facturada'],
    transitions: { 'solicitada': ['aprobada'], 'aprobada': ['recibida'],
                   'recibida': ['facturada'], 'facturada': [] }
  },
  theme: { accentColor: '#198038' }   // distinct accent to tell modules apart
};
```

**Domain mapping (both modules)**:

| Base concept | Sales (`Ventas`) | Acquisitions (`Compras`) |
|---|---|---|
| Entity | Cliente | Proveedor |
| `taxId` | RFC / NIF del cliente | RUC / NIF del proveedor |
| `creditLimit` | Crédito otorgado al cliente | Límite de crédito con el proveedor |
| `paymentTerms` | Cond. de venta (contado, neto 30) | Cond. de compra |
| Document | Pedido de Venta / Factura emitida | Orden de Compra / Recepción |
| `series` + `folio` | FAC, BV (venta) | OC, GR (compra) |
| `status` lifecycle | cotización → pedido → facturado | solicitada → aprobada → recibida → facturada |
| `startDate`/`endDate` | Vigencia de la cotización / entrega | Vigencia de la orden / recepción |

**Storage caveat**: both modules would share the fixed keys `erp_base_module:entities` and `erp_base_module:documents` on the same origin. Running Sales and Acquisitions side by side requires either separate browser origins/ports or making the storage key prefix configurable (a change in `src/storage.js`, i.e. beyond `userConfig` today).

---

## 6. Extension Points Needed Beyond Configuration

`data-model.md` explicitly flags what the base does **not** provide (lines 91 and 105):

1. **Document line items** (product, quantity, price) — both modules need multi-line orders/invoices; the base carries only a single `quantity` and monetary totals.
2. **Automatic / unique folio numbering per series** — `series` + `folio` are entered manually today; both modules need gapless, per-series sequences.
3. **Automatic totals** (`total = subtotal − discount + tax`) — intentionally left as an extension point to avoid rounding surprises.
4. **Cross-module reporting** (stock, payables/receivables, kardex) — out of scope of the base (spec assumption: no advanced ERP features).
5. **Shared master data** — the same party can be a customer *and* a supplier; with per-module storage keys there is no shared Party master yet.

---

## 7. Risks and Gaps

| # | Finding | Evidence | Impact |
|---|---|---|---|
| 1 | **Application source deleted at HEAD** | `git show --stat a0062c0`: `index.html`, `src/*` removed (1,807 lines) | App cannot run (`npm run dev`) or be tested (`npm test`); README/specs describe files that don't exist |
| 2 | Test suite is orphaned | All 12 test files import `../../src/*` and `../../index.html` | 81/81 tasks marked `[X]` but nothing verifies |
| 3 | No Acquisitions artifacts | grep for `purchase/compra/acquisi` → no matches outside unrelated text | Module must start from `/speckit.specify` (spec 002) |
| 4 | No dedicated Sales spec | Sales lives only as fixtures inside `specs/001` | A `002-sales-module` spec would formalize its profile/fields |
| 5 | Fixed `localStorage` keys | `storage.js`: `erp_base_module:entities/documents` | Sales + Acquisitions cannot coexist on one origin |
| 6 | Single `userConfig` slot | `module-config.js` exports one `userConfig` | Switching modules means editing source; no runtime module selector |
| 7 | Line items / folio automation missing | `data-model.md` "Notas de Extensibilidad" | Blocks realistic Sales/Acquisitions transactions |
| 8 | Dependencies not installed | no root `node_modules/` | `npm install` required before any verification |

**Recommended next steps**

1. Restore the source: `git checkout 501e9c6 -- src index.html` (or revert `a0062c0` if the deletion was accidental), then `npm install && npm test`.
2. Create `specs/002-sales-module/` and `specs/003-acquisitions-module/` via the spec-kit workflow (`.opencode/commands/speckit.specify.md`), each defining its `userConfig` profile, custom fields, lifecycle and acceptance tests (mirror the existing `bootWith(config)` pattern).
3. Make the storage key prefix configurable (or derive it from `moduleName`) so both modules can run side by side.
4. Design the line-items + auto-folio extension as a shared base enhancement before implementing either module.
5. Consider a runtime module selector (Sales | Acquisitions) if both must be reachable in one deployment.

---

## 8. Key File References

- Base spec: `specs/001-erp-base-module/spec.md`
- Data model & extension notes: `specs/001-erp-base-module/data-model.md`
- Storage contract: `specs/001-erp-base-module/contracts/entity-storage.md`
- Intended source layout: `specs/001-erp-base-module/plan.md`
- Task list (all complete): `specs/001-erp-base-module/tasks.md`
- Config tailoring docs: `README.md` ("Tailoring via Configuration"), `specs/001-erp-base-module/quickstart.md`
- Sales fixtures: `tests/unit/module-config.test.js`, `tests/integration/{dashboard,relabeling,workspace-shell}.test.js`
- Last known source tree: `git show 501e9c6:src/module-config.js`, `git show 501e9c6:src/app.js`
