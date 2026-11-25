# Módulo Adquisiciones y Compras — MVP de ERP

Trabajo grupal de **Modelación de Sistemas 2026-2**, Departamento de Ingeniería Industrial, Universidad de Concepción.

**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

## Estado del Repositorio

**MVP funcional, verificado y listo para entrega.** La aplicación ya no expone el template base en la interfaz: `index.html` contiene una única navegación (**Compras**) y un indicador de sesión de solo lectura en la barra superior. El ingreso se hace desde un portal corporativo con paleta GitHub Dark (`#0D1117` / `#161B22` / `#2F81F7`): campo dual de **correo corporativo o RUT**, clave de demostración **`Compras2026`** (no protege datos reales; los roles siguen siendo simulados), conmutador **Modo Demo / Modo Real** con datos separados, directorio de ocho usuarios revelable solo en Modo Demo con **Activar modo presentación**, opción **Mostrar/Ocultar** la clave y errores junto al campo. El consentimiento de cookies se administra en `sessionStorage` y el Asistente IA responde únicamente dentro del ERP, con guardrails RBAC. El rol queda fijo hasta cerrar sesión. El módulo cubre US1 a US13: el ciclo solicitud → cotización → orden de compra → recepción → factura → devolución, además del panel por rol, catálogo, evaluaciones, navegación por visibilidad, gobernanza de identidades con OTP, auditoría forense y exportación CSV.

El código de soporte del template base (`src/storage.js`, `src/module-config.js` y `src/components/`) se conserva como dependencia técnica, pero sus vistas (Panel, Entidades, Documentos y Búsqueda) ya no forman parte de la interfaz. Las pruebas de integración heredadas se mantienen en el repositorio con `describe.skip` y una nota que explica el motivo. El nombre por defecto de la aplicación es **Adquisiciones y Compras**.

**Modos de datos y gobernanza (FR-037, FR-042–FR-046):** el conmutador **Modo Demo / Modo Real** persiste la selección y mantiene instantáneas separadas de las colecciones; al cambiar de modo se cierra la sesión. En **Modo Demo** la primera visita carga las 12 colecciones de `semilla.json` y habilita el directorio de acceso rápido; en **Modo Real** se conservan los catálogos base y el botón **Cargar catálogo base de proveedores/insumos** completa los maestros sin sobrescribir registros creados por el usuario (`cargarCatalogoBase()` en `src/compras/almacenamiento.js`). El ingreso acepta correo o RUT Módulo 11 y las operaciones sensibles exigen OTP del titular.

La implementación se construyó sobre la plantilla base utilizando la metodología *Spec-Driven Development* (Speckit), siguiendo el [Plan Técnico](specs/002-modulo-adquisiciones-compras/plan.md) y la lista de [Tareas del Módulo](specs/002-modulo-adquisiciones-compras/tasks.md).

### Ejecución rápida

```bash
npm install
npm run dev           # servidor de desarrollo Vite (http://localhost:5173)
npm test              # pruebas en modo observación
npx vitest run        # suite completa una vez
npm run lint          # ESLint
npm run format:check  # Prettier (modo verificación)
npm run build         # build de producción
npm run preview       # vista previa del build (http://localhost:4173)
```

### Interfaz actual

- **Acceso**: portal corporativo GitHub Dark con campo dual de **correo corporativo o RUT** y clave única `Compras2026`. El conmutador **Modo Demo / Modo Real** separa los datos; el directorio de siete usuarios solo aparece en Modo Demo tras pulsar **Activar modo presentación** y cada entrada completa correo y clave (`poblarDirectorioUsuarios()` en `src/app.js`). Incluye errores junto al campo, opción **Mostrar/Ocultar** y **Cerrar sesión**.
- **Cookies de sesión**: banner con *Aceptar todas*, *Solo esenciales* y *Configurar preferencias*. El estado se guarda en `sessionStorage` bajo `compras_cookie_consent_v1` (`src/compras/cookies.js`) y se puede reabrir desde el enlace *Cookies* del footer; las preferencias de UI y analítica interna son opcionales y las esenciales siempre están activas.
- **Barra superior**: marca *Adquisiciones y Compras* con logotipo monograma SVG, indicador de sesión con usuario, rol y centro de costo, distintivo **Control de roles: administrador TI** y botón **Cerrar sesión**. El rol no cambia en vivo: para probar otro, cierre sesión e ingrese de nuevo.
- **Barra lateral**: una sola sección, **Compras**, marcada como página activa (`aria-current="page"`) y con nombre accesible también cuando el icono se colapsa. Dentro del módulo, la navegación se agrupa en **Panel / Adquisiciones / Compras** según `vistasVisibles()` de `src/compras/visibilidad.js`.
- **Pestañas del módulo**: Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones. La exportación CSV está disponible desde el módulo.
- **Panel**: pendientes por rol con contador y acceso directo, alertas de facturas por vencer, seguimiento de OC sin recepción, indicadores del mes y acciones rápidas con descripción legible.
- **Asistente IA**: tarjeta del Panel que responde saludos, agradecimientos y ayuda con el nombre y rol activos; rechaza temas fuera del ERP o sin permiso con el patrón «No puedo ayudarte a {tema}, quizás quisiste decir: {sugerencia1} o {sugerencia2}» y pide confirmación antes de ejecutar acciones sensibles.

### Roles y datos semilla

La semilla define cinco roles; la sesión se fija al ingresar y se comprueba cerrando sesión entre roles. La matriz canónica vive en `src/compras/visibilidad.js` y los permisos de operación en `PERMISOS`/`puede()` (`src/compras/almacenamiento.js`).

### Credenciales de prueba (extraídas de `src/compras/semilla.json`)

Los ocho RUT son válidos con el algoritmo **Módulo 11** (`validarRut()` en `src/compras/reglas.js`). La clave es común: **`Compras2026`**. El campo de acceso acepta correo o RUT; en Modo Demo se ingresa con un clic desde el directorio y en Modo Real se escriben el correo o RUT y la clave. Los ocho RUT completos se exhiben en la columna **RUT** del padrón de `admin_ti`.

| Nombre | Rol | RUT válido Módulo 11 | Correo corporativo | Centro de costo | Contraseña |
|---|---|---|---|---|---|
| Camila Rojas Soto | `solicitante` | `18.123.456-3` | `camila.rojas@pyme.cl` | `CC-ADM` Administración | `Compras2026` |
| Diego Muñoz Vera | `solicitante` | `17.234.567-0` | `diego.munoz@pyme.cl` | `CC-OPE` Operaciones | `Compras2026` |
| Francisca Herrera Díaz | `comprador` | `16.345.678-8` | `francisca.herrera@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Andrés Contreras Pérez | `jefe_compras` | `18.100.001-5` | `andres.contreras@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Valentina Lagos Fuentes | `jefe_compras` | `15.567.890-9` | `valentina.lagos@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Rodrigo Araya Mena | `bodega` | `14.678.901-3` | `bodega@pyme.cl` | `CC-BOD` Bodega | `Compras2026` |
| Tomás Villarroel Sepúlveda | `admin_ti` | `13.789.012-7` | `admin.ti@pyme.cl` | `CC-COM` Compras | `Compras2026` |


### Matriz RBAC y privacidad de datos sensibles

| Rol | Permisos principales | RUT personal ajeno (Ley 19.628) | RUT tributario de proveedores | Cuenta bancaria |
|---|---|---|---|---|
| `solicitante` | Crea y ve solo sus solicitudes; catálogo y OC/recepciones propias en solo lectura; exporta. | `••••••••-•` | Sin acceso | Sin acceso (`No disponible`) |
| `comprador` | Gestiona proveedores, cotizaciones, OC, facturas, catálogo y evaluaciones; emite OC y concilia. | `••••••••-•` | Completo | `****XXXX` (últimos 2 dígitos si la cuenta tiene ≤ 4) |
| `jefe_compras` | Aprueba solicitudes ajenas, pagos y devoluciones; evalúa y consulta trazabilidad. | `XX.XXX.XXX-K` solo en auditoría (`18.XXX.XXX-5` en la semilla) | Completo | Completa, solo lectura |
| `bodega` | Registra recepciones y devoluciones; crea y ve solo sus propias solicitudes. | `••••••••-•` | Solo en recepciones y guías de despacho | Sin acceso (`No disponible`) |
| `admin_ti` | Edita datos bancarios, desbloquea proveedores, consulta y exporta trazabilidad, y crea/edita sus propias solicitudes; resto en solo lectura. No emite OC, recibe ni aprueba. | Completo | Completo | Completa, con edición y `fecha_cambio_cuenta` |

Cada usuario ve su propio RUT sin enmascarar. Atribuciones exclusivas de `admin_ti` en esta versión: **edición bancaria, desbloqueo de proveedores, consulta/exportación de trazabilidad, padrón de usuarios con suspensión/reactivación, parametrización de umbral/tolerancia, desbloqueo de excepciones y Log de Auditoría Forense**. Toda edición de identidad, cambio de estado, parámetro o desbloqueo exige un OTP de seis dígitos validado por el titular. El umbral inicial de `1.000.000 CLP` neto y la tolerancia del `1 %` se pueden cambiar en caliente desde **Parámetros de compras** y se aplican de inmediato en `reglas.js` y sus consumidores.

El enmascaramiento se aplica **en el origen** en fichas, listados, búsquedas, comparativa, panel, historial, CSV y respuestas del asistente; la única fuente es `src/compras/visibilidad.js` y `reglas.js`/`module-config.js` delegan en ella. El formulario bancario usa catálogos cerrados de doce bancos chilenos y cinco tipos de cuenta (`src/compras/catalogos-bancarios.js`); al elegir **CuentaRUT (BancoEstado)** se fija ese banco y se auto-rellena la cuenta con el cuerpo numérico del RUT del proveedor, sin dígito verificador, con aviso editable.

La primera visita carga automáticamente `src/compras/semilla.json` con datos ficticios: 7 usuarios con nombre propio, correo corporativo, RUT válido y centro de costo, todos `activo: true`, 4 centros de costo, 20 productos, 12 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación (incluidas notas de crédito), 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Las fechas se desplazan al día actual para mantener vigentes los vencimientos y plazos.

### Gobernanza de identidades y datos (Fase 23)

- **Conmutador y presentación** (`gobernanza.js`, `almacenamiento.js`, `app.js`): Modo Demo y Modo Real conservan instantáneas separadas; cambiar de modo cierra la sesión. Solo Modo Demo revela correo y clave en el directorio.
- **Padrón y consentimiento** (`vista.js`, `administracion.js`): `admin_ti` ve siete filas con nombre, RUT completo, correo, centro de costo, estado y acciones; el nombre abre una ficha con Nombre, Correo, RUT, Rol y Centro de costo bloqueados hasta validar un OTP de seis dígitos con expiración. La solicitud genera una notificación interna al titular y la ayuda visual del código solo existe en Modo Demo. El guardado valida RUT Módulo 11 y formato de correo.
- **Auditoría forense** (`auditoria.js`): registro *append-only* separado de `trazabilidad.js`, con actor, usuario afectado, tipo de evento, campos anterior → nuevo, resultado OTP y timestamp, hash encadenado, filtros, verificación de integridad y exportación CSV restringida a `admin_ti`.
- **Parámetros y excepciones** (`gobernanza.js`, `administracion.js`): umbral de cotizaciones y tolerancia de conciliación editables con OTP; desbloqueo de excepciones con permiso y token vigente. Las cuentas suspendidas no pueden ingresar y no se permite autossuspensión ni dejar sin `admin_ti` activo.

Cobertura: FR-042–FR-046, US13 y SC-020–SC-023, con pruebas en `tests/unit/compras/usuarios.test.js`, `tests/unit/compras/otp.test.js`, `tests/integration/compras/usuarios.test.js`, `tests/integration/compras/auditoria-forense.test.js` y `tests/integration/compras/autenticacion.test.js`.

Las colecciones del módulo se guardan en `localStorage` con el prefijo `erp_compras:`; los proveedores se comparten con la entidad base (`erp_base_module:entities`). Para reiniciar los datos, limpia las claves `erp_compras:*` y `erp_base_module:entities` del almacenamiento local o ejecuta `await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras())` desde la consola con Vite abierto; después recarga la página.

### Verificación

Estado real verificado el 2026-11-25 sobre la rama `main`:

- `npx vitest run`: **317 pruebas aprobadas y 56 omitidas**, en **27 archivos aprobados y 10 omitidos** (los omitidos pertenecen al template base).
- `npm run lint`: **OK, sin errores ni advertencias**.
- `npm run format:check`: **sin diferencias** en el alcance de `.prettierignore` (núcleo base `src/storage.js` y `tests/unit/storage.test.js`).
- `npm run build`: **build de producción sin errores** (Vite 8.2.1).
- Accesibilidad WCAG 2.1 AA revisada: etiquetas asociadas, navegación por teclado en pestañas, errores junto al campo con `role="alert"`/`aria-describedby`, contraste mínimo 4,5:1 y respeto a `prefers-reduced-motion`.

Deuda declarada en [`tasks.md`](specs/002-modulo-adquisiciones-compras/tasks.md), no bloqueante para la entrega: T127 y T137/T139 (filtros en servicios y panel FR-035) y T144/T155 (recorrido manual en navegador de los escenarios 1 a 8). T101, T104, T109, T110 y T118 están cerradas. Las fases 1 a 23, incluidas T043-T050, T100, T102-T106, T107, T108, T120 y T161-T168, están cerradas.

## Problema y solución (Resumen)

En muchas pymes las compras se gestionan por correo y planillas: no queda registro de quién autorizó cada compra, se paga lo que el proveedor factura aunque no coincida con lo recibido, y las facturas se aprueban tarde, incumpliendo el plazo legal de pago de 30 días.

El MVP propone un módulo de Adquisiciones y Compras integrado al ERP que ordena el ciclo completo:

```
Solicitud de compra → Cotizaciones de proveedores → Orden de compra → Recepción → Factura del proveedor
```

## Documentación del módulo

| Documento | Contenido |
|---|---|
| [`spec.md`](specs/002-modulo-adquisiciones-compras/spec.md) | Problema, solución, usuarios, 13 historias de usuario, requisitos y criterios de éxito |
| [`plan.md`](specs/002-modulo-adquisiciones-compras/plan.md) | Cómo se construye sobre la plantilla base, iteraciones semanales, pruebas y escalabilidad |
| [`research.md`](specs/002-modulo-adquisiciones-compras/research.md) | Decisiones técnicas de la Fase 0, justificaciones y alternativas consideradas |
| [`data-model.md`](specs/002-modulo-adquisiciones-compras/data-model.md) | Modelo Entidad-Relación (MER), diagrama de clases, atributos y reglas de negocio |
| [`quickstart.md`](specs/002-modulo-adquisiciones-compras/quickstart.md) | Guion de ejecución y validación de extremo a extremo con datos semilla |
| [`contracts/`](specs/002-modulo-adquisiciones-compras/contracts/) | Contratos de almacenamiento, exportación CSV, permisos e integración con otros módulos |
| [`tasks.md`](specs/002-modulo-adquisiciones-compras/tasks.md) | Plan de ejecución y desglose técnico ordenado por fases e historias de usuario |
| [`plan-de-trabajo.md`](docs/plan-de-trabajo.md) | Cronograma, roles del equipo y correspondencia con la rúbrica de evaluación |
| [`feedback.md`](feedback.md) | Retroalimentación del profesor y ajustes aplicados tras la revisión intermedia |

## Modelo entidad-relación

![MER Módulo Adquisiciones y Compras](docs/mer.png)

- **Enlace directo (PNG):** `https://raw.githubusercontent.com/MDS-BI/Grupo-06/main/docs/mer.png`
- **Entregable vectorial (SVG, 12 entidades semilla):** [`mer.svg`](specs/002-modulo-adquisiciones-compras/mer.svg) · `https://raw.githubusercontent.com/MDS-BI/Grupo-06/main/specs/002-modulo-adquisiciones-compras/mer.svg`

El PNG muestra las 19 entidades normalizadas y el SVG las 12 colecciones de `semilla.json`; ambos derivan de [`data-model.md`](specs/002-modulo-adquisiciones-compras/data-model.md). La imagen se genera desde el bloque Mermaid de ese documento, así siempre coinciden en contenido. Para regenerarla se requiere Python y [Graphviz](https://graphviz.org/download/). Desde la raíz del repositorio:

```bash
python docs/generar_mer.py
dot -Tpng -Gdpi=150 docs/mer.dot -o docs/mer.png
```

## Estructura del repositorio

```text
docs/
├── plan-de-trabajo.md
├── mer.png                         ← Imagen del MER (19 entidades normalizadas)
├── mer.dot                         ← Fuente del diagrama (generada)
└── generar_mer.py                  ← Genera mer.dot desde data-model.md
specs/
├── 001-erp-base-module/            ← Especificación del template base (no se modifica)
└── 002-modulo-adquisiciones-compras/
        ├── spec.md
        ├── plan.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md
        ├── mer.svg                 ← Entregable vectorial (12 entidades semilla)
        ├── contracts/
        │       ├── almacenamiento-compras.md
        │       └── exportacion-e-integracion.md
        ├── tasks.md
        └── checklists/
                └── requirements.md
src/
├── app.js                          ← Arranque, portal de acceso, conmutador de modo y cookies
├── main.js                         ← Punto de entrada Vite
├── module-config.js                ← Configuración heredada del template base
├── storage.js                      ← Persistencia heredada del template base
├── components/                     ← Componentes heredados del template base
└── compras/                        ← Módulo US1-US13
        ├── vista.js                ← Navegación, pestañas, padrón, OTP, parámetros y auditoría
        ├── almacenamiento.js       ← Sesión, permisos, semilla, catálogos e instantáneas por modo
        ├── autenticacion.js        ← Ingreso dual por correo/RUT y bloqueo de cuentas suspendidas
        ├── gobernanza.js           ← Modo de datos, parámetros dinámicos, OTP y notificaciones
        ├── administracion.js       ← Edición, suspensión y desbloqueo autorizados por OTP
        ├── auditoria.js            ← Log de Auditoría Forense con hash encadenado
        ├── cookies.js              ← Consentimiento de cookies en sessionStorage
        ├── visibilidad.js          ← Matriz RBAC y enmascaramiento sensible
        ├── asistente.js            ← Asistente IA local con guardrails RBAC
        ├── reglas.js               ← Reglas, umbral/tolerancia dinámicos y RUT Módulo 11
        ├── catalogos-bancarios.js  ← Bancos y tipos de cuenta chilenos; CuentaRUT
        ├── semilla.json            ← 12 colecciones de datos ficticios
        ├── catalogo.js
        ├── proveedores.js
        ├── solicitudes.js
        ├── cotizaciones.js
        ├── ordenes-compra.js
        ├── recepciones.js
        ├── facturas.js
        ├── devoluciones.js
        ├── panel.js
        ├── evaluaciones.js
        ├── trazabilidad.js
        └── exportacion.js
tests/
├── integration/                    ← Pruebas de integración (las del template base están omitidas)
└── unit/                           ← Pruebas unitarias
```

## Registro de decisiones

Las decisiones de diseño se registran como *Issues* con la etiqueta `decision`.

---

## Origen: Template base del curso (Módulo Base ERP, Vite + Vanilla JS)

El proyecto se originó a partir de una aplicación de página única (*single-page app*) con gestión de entidades y documentos, persistencia en `localStorage` y una configuración centralizada. Esa base aportó los tokens de diseño en `src/styles.css`, el logotipo monograma, el manejo de errores de configuración y parte de la persistencia.

En la plantilla original, el espacio de trabajo mostraba Panel, Entidades, Documentos y Búsqueda; esas vistas se retiraron de `index.html` al incorporar el módulo de Adquisiciones y Compras. El código de apoyo permanece disponible, pero la personalización mediante `userConfig` ya no altera las etiquetas de la interfaz del módulo: solo se usa el nombre de la aplicación y el color de acento.

### Configuración

El objeto `userConfig` de `src/module-config.js` mantiene las opciones heredadas:

- `moduleName` — Nombre de la aplicación, título de la página y origen del monograma. Por defecto: `Adquisiciones y Compras`.
- `labels` — Terminología Entidad/Documento del template base; no afecta las pestañas del módulo.
- `customFields` — Campos adicionales del template base (`text`, `number`, `date` o `select`).
- `statusLifecycle` — Transiciones configurables de estados del template base.
- `theme.accentColor` — Color hexadecimal aplicado a la marca y los controles principales.

Si la configuración es inválida, la aplicación muestra los problemas en el banner `#config-errors` y utiliza los valores por defecto sin fallar.

### Notas heredadas

- Las entidades y documentos del template base se persisten en `localStorage` bajo `erp_base_module:entities` y `erp_base_module:documents`.
- Al eliminar una entidad del template base, también se eliminan sus documentos asociados (*eliminación en cascada*).
- El proyecto utiliza intencionalmente HTML, CSS y JavaScript puros, sin frameworks de interfaz.

---

## Consideraciones de Ingeniería (Escalabilidad, Seguridad/Privacidad y Sesgos de Datos)

### Escalabilidad

El MVP funciona 100 % en frontend sobre `localStorage` (por navegador, sin concurrencia ni transacciones). El modelo normalizado permite migrar a PostgreSQL u otro RDBMS y exponer una API REST/GraphQL conservando los nombres de colección de `semilla.json` como contrato. La migración prevista es por fases: persistencia y auditoría, autenticación real, integraciones y, por último, asistente gobernado. Las integraciones con Inventario y Contabilidad se diseñan con un outbox de eventos (`recepcion.registrada`, `factura.aprobada_pago`, `devolucion.registrada`) para no acoplar los módulos a la interfaz. Detalle en [`plan.md`](specs/002-modulo-adquisiciones-compras/plan.md) §*Escalabilidad y Desarrollo Futuro* y en [`research.md`](specs/002-modulo-adquisiciones-compras/research.md).

### Seguridad y privacidad (Ley 19.628)

La matriz de `src/compras/visibilidad.js` y los permisos de `src/compras/almacenamiento.js` aplican el enmascaramiento **en el origen** de RUT personal, RUT tributario y cuentas bancarias, con segregación de funciones sin excepciones, rol fijo por sesión, trazabilidad de cambios, Log de Auditoría Forense con hash encadenado y un asistente que nunca amplía permisos. La autenticación sigue siendo simulada (clave `Compras2026` incluida en el bundle) y todos los datos son ficticios; por eso el MVP demuestra el diseño de privacidad, no un despliegue conforme. El OTP y las notificaciones son internos y la ayuda visual del código solo existe en Modo Demo. Hoy aplica la Ley 19.628; la Ley 21.719, modificada por la Ley 21.855 publicada el 23-11-2026, entra en vigencia el 15-10-2027. Para producción se requiere SSO/OIDC, cifrado en reposo, emisión real de OTP, auditoría *append-only* en servidor con firma criptográfica y registro de actividades de tratamiento.

### Sesgos de datos

Mitigaciones ya aplicadas: tres cotizaciones sobre el umbral inicial de 1.000.000 CLP (configurable con OTP), `motivo_descarte` obligatorio, `puntaje_plazo` calculado desde fechas reales, comparativa lado a lado, campo `tamano_empresa` (`micro`, `pequeña`, `mediana`, `grande`, coherente con semilla y formulario) para medir el gasto en pymes, y catálogo con `fecha_actualizacion` que marca precios con más de 90 días como desactualizados. Queda por instrumentar la revisión de la distribución de adjudicaciones, la rúbrica de evaluación, múltiples evaluadores y métricas de equidad; el detalle está en `data-model.md` §5-8 y en el README del módulo §5.

**Trazabilidad documental:** [`spec.md`](specs/002-modulo-adquisiciones-compras/spec.md), [`plan.md`](specs/002-modulo-adquisiciones-compras/plan.md), [`research.md`](specs/002-modulo-adquisiciones-compras/research.md) y el [MER de la sección anterior](#modelo-entidad-relación), con su entregable en PNG y SVG.
