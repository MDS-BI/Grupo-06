# Módulo Adquisiciones y Compras — MVP de ERP

Trabajo grupal de **Modelación de Sistemas 2026-2**, Departamento de Ingeniería Industrial, Universidad de Concepción.

**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

![Estado: MVP](https://img.shields.io/badge/Estado-MVP-brightgreen) ![Pruebas: 321 OK](https://img.shields.io/badge/Pruebas-321%20OK-blue) ![Stack: Vite + Vanilla JS](https://img.shields.io/badge/Stack-Vite%20%2B%20Vanilla%20JS-orange) ![Metodología: Spec-Driven](https://img.shields.io/badge/Metodolog%C3%ADa-Spec--Driven-purple)

<table>
<tr>
<th>Producto y Operación</th>
<th>Arquitectura y Gobernanza</th>
</tr>
<tr>
<td valign="top">

1. [Inicio rápido y ejecución](#1-inicio-rápido-y-ejecución)
2. [Problema de negocio y solución](#2-problema-de-negocio-y-solución)
3. [Roles, permisos (RBAC) y usuarios](#3-roles-permisos-rbac-y-usuarios)
4. [Flujo funcional y reglas de negocio](#4-flujo-funcional-y-reglas-de-negocio)
5. [Guía de demostración (5 minutos)](#5-guía-de-demostración-5-minutos)
8. [Diseño UI/UX y experiencia de usuario](#8-diseño-uiux-y-experiencia-de-usuario)

</td>
<td valign="top">

6. [Modelo de datos y entidades (MER)](#6-modelo-de-datos-y-entidades-mer)
7. [Privacidad (Ley 19.628) y auditoría](#7-privacidad-ley-19628-y-auditoría)
9. [Gobernanza Spec-Driven Development](#9-gobernanza-spec-driven-development)
10. [Arquitectura técnica y persistencia](#10-arquitectura-técnica-y-persistencia)
11. [Calidad y pruebas automatizadas](#11-calidad-y-pruebas-automatizadas)
12. [Escalabilidad y evolución futura](#12-escalabilidad-y-evolución-futura)
13. [Equipo y referencias](#13-equipo-y-referencias)

</td>
</tr>
</table>

---

## 1. Inicio rápido y ejecución

### Estado del repositorio

**MVP funcional, verificado y listo para entrega.** La aplicación ya no expone el template base en la interfaz: `index.html` contiene una única navegación (**Compras**) y un indicador de sesión de solo lectura en la barra superior. El ingreso se hace desde un portal corporativo con campo dual de **correo corporativo o RUT**, clave de demostración **`Compras2026`** (no protege datos reales; los roles siguen siendo simulados), sistema inicia directamente con la semilla completa de **8 usuarios** y ofrece el botón **Activar modo presentación** para desplegar el **Directorio Interno (Acceso rápido de evaluación)** con clic directo, opción **Mostrar/Ocultar** la clave y errores junto al campo. El rol queda fijo hasta cerrar sesión. El módulo cubre US1 a US13: el ciclo solicitud → cotización → orden de compra → recepción → factura → devolución, además del panel por rol, catálogo, evaluaciones, navegación por visibilidad, gobernanza de identidades con OTP, auditoría forense y exportación CSV.

El código de soporte del template base (`src/storage.js`, `src/module-config.js` y `src/components/`) se conserva como dependencia técnica, pero sus vistas (Panel, Entidades, Documentos y Búsqueda) ya no forman parte de la interfaz. Las pruebas de integración heredadas se mantienen en el repositorio con `describe.skip` y una nota que explica el motivo. El nombre por defecto de la aplicación es **Adquisiciones y Compras**.

**Modos de datos y gobernanza (FR-037, FR-042–FR-046):** el sistema inicia directamente con la semilla completa de `semilla.json` y habilita el **Directorio Interno (Acceso rápido de evaluación)** mediante el botón **Activar modo presentación**. El botón **Cargar catálogo base de proveedores/insumos** completa los maestros por ID —agrega proveedores ausentes, conserva los ID ya editados y carga los catálogos solo si están vacíos— sin sobrescribir registros creados por el usuario (`cargarCatalogoBase()` en `src/compras/almacenamiento.js`). El ingreso acepta correo o RUT Módulo 11 y las operaciones sensibles exigen OTP: del usuario afectado al editar datos ajenos, y del propio `admin_ti` al cambiar parámetros o desbloquear excepciones.

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

## 2. Problema de negocio y solución

En muchas pymes las compras se gestionan por correo y planillas: no queda registro de quién autorizó cada compra, se paga lo que el proveedor factura aunque no coincida con lo recibido, y las facturas se aprueban tarde, incumpliendo el plazo legal de pago de 30 días.

El MVP propone un módulo de Adquisiciones y Compras integrado al ERP que ordena el ciclo completo:

```
Solicitud de compra → Cotizaciones de proveedores → Orden de compra → Recepción → Factura del proveedor
```

La solución incorpora trazabilidad de cada cambio, control por roles, enmascaramiento de datos sensibles desde el origen y un panel ejecutivo por rol, de modo que la necesidad interna quede vinculada al pago y a la evidencia de auditoría.

## 3. Roles, permisos (RBAC) y usuarios

### Roles y datos semilla

La semilla define cinco roles y ocho usuarios; la sesión se fija al ingresar y se comprueba cerrando sesión entre roles. `solicitante`, `comprador`, `jefe_compras` y `bodega` se distinguen por nombre (o por correo/RUT) porque hay dos usuarios en cada uno de los roles de jefatura y bodega; `admin_ti` ingresa solo por su rol por ser el único usuario de ese rol. La matriz canónica vive en `src/compras/visibilidad.js` y los permisos de operación en `PERMISOS`/`puede()` (`src/compras/almacenamiento.js`).

El botón **Activar modo presentación** despliega el **Directorio Interno (Acceso rápido de evaluación)** con ingreso en un clic; es la vía recomendada para alternar roles durante la demostración, cerrando sesión entre cada cambio porque el rol permanece fijo durante la sesión.

### Credenciales de prueba (extraídas de `src/compras/semilla.json`)

Los ocho RUT son válidos con el algoritmo **Módulo 11** (`validarRut()` en `src/compras/reglas.js`). La clave es común: **`Compras2026`**. El campo de acceso acepta correo o RUT; se ingresa con un clic desde el directorio o escribiendo el correo o RUT y la clave. Los ocho RUT completos se exhiben en la columna **RUT** del padrón de `admin_ti`.

| Nombre | Rol | RUT válido Módulo 11 | Correo corporativo | Centro de costo | Contraseña |
|---|---|---|---|---|---|
| Camila Rojas Soto | `solicitante` | `18.123.456-3` | `camila.rojas@pyme.cl` | `CC-ADM` Administración | `Compras2026` |
| Diego Muñoz Vera | `solicitante` | `17.234.567-0` | `diego.munoz@pyme.cl` | `CC-OPE` Operaciones | `Compras2026` |
| Francisca Herrera Díaz | `comprador` | `16.345.678-8` | `francisca.herrera@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Andrés Contreras Pérez | `jefe_compras` | `18.100.001-5` | `andres.contreras@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Valentina Lagos Fuentes | `jefe_compras` | `15.567.890-9` | `valentina.lagos@pyme.cl` | `CC-COM` Compras | `Compras2026` |
| Rodrigo Araya Mena | `bodega` | `14.678.901-3` | `bodega@pyme.cl` | `CC-BOD` Bodega | `Compras2026` |
| Paula Cárdenas Rivas | `bodega` | `19.876.543-0` | `paula.cardenas@pyme.cl` | `CC-BOD` Bodega | `Compras2026` |
| Tomás Villarroel Sepúlveda | `admin_ti` | `13.789.012-7` | `admin.ti@pyme.cl` | `CC-COM` Compras | `Compras2026` |

### Matriz de visibilidad por rol (RBAC y datos sensibles)

| Rol | Permisos principales | RUT personal ajeno (Ley 19.628) | RUT tributario de proveedores | Cuenta bancaria |
|---|---|---|---|---|
| `solicitante` | Crea y ve solo sus solicitudes; catálogo y OC/recepciones propias en solo lectura; exporta. | `••••••••-•` | Sin acceso | Sin acceso (`No disponible`) |
| `comprador` | Gestiona proveedores, cotizaciones, OC, facturas, catálogo y evaluaciones; emite OC y concilia. | `••••••••-•` | Completo | `****XXXX` (últimos 2 dígitos si la cuenta tiene ≤ 4) |
| `jefe_compras` | Aprueba solicitudes ajenas, pagos y devoluciones; evalúa y consulta trazabilidad. | `18.XXX.XXX-5` solo en auditoría | Completo | Completa, solo lectura |
| `bodega` | Registra recepciones y devoluciones; crea y ve solo sus propias solicitudes. | `••••••••-•` | Solo en recepciones y guías de despacho | Sin acceso (`No disponible`) |
| `admin_ti` | Edita datos bancarios, desbloquea proveedores, consulta y exporta trazabilidad, y crea/edita sus propias solicitudes; resto en solo lectura. No emite OC, recibe ni aprueba. | Completo | Completo | Completa, con edición y `fecha_cambio_cuenta` |

Cada usuario ve su propio RUT sin enmascarar. Atribuciones exclusivas de `admin_ti` en esta versión: **edición bancaria, desbloqueo de proveedores, consulta/exportación de trazabilidad, padrón de usuarios con suspensión/reactivación, parametrización de umbral/tolerancia, desbloqueo de excepciones y Log de Auditoría Forense**. Toda edición de identidad, cambio de estado, parámetro o desbloqueo exige un OTP de seis dígitos con vigencia de 5 minutos y un máximo de 3 intentos: en la edición de otra persona lo valida el usuario afectado; en parámetros y desbloqueo lo solicita y valida el propio `admin_ti` que ejecuta la operación. El umbral inicial de `1.000.000 CLP` neto y la tolerancia del `1 %` se pueden cambiar en caliente desde **Parámetros de compras** y se aplican de inmediato en `reglas.js` y sus consumidores. No existe exportación de respaldo JSON: los datos se conservan en `localStorage` con prefijo `erp_compras:`, el conjunto precargado es `semilla.json` y `gobernanza.js` solo mantiene un respaldo en memoria cuando `localStorage` no está disponible.

## 4. Flujo funcional y reglas de negocio

### Ciclo completo de adquisiciones

1. **Solicitud de compra** (`SC-AAAA-NNNN`): cualquiera de los cinco roles registra la necesidad con una o más líneas, centro de costo y monto estimado; el autor puede editarla mientras está en `borrador` y luego la envía.
2. **Aprobación**: un `jefe_compras` distinto del solicitante aprueba o rechaza con motivo; si el solicitante es `jefe_compras`, decide otro `jefe_compras` (segregación de funciones).
3. **Cotizaciones de proveedores**: se registran ofertas de proveedores aprobados con fecha de validez; la comparativa es lado a lado y la primera cotización mueve la solicitud a `en_cotizacion`.
4. **Orden de compra**: se emite desde la cotización seleccionada (o en compra directa bajo el umbral), copiando líneas y precios; se calculan neto, IVA y total en CLP enteros.
5. **Recepción**: bodega registra unidades aceptadas, rechazadas y dañadas por línea, sin superar lo pendiente; quien emitió la OC no puede registrar su recepción.
6. **Factura y conciliación a 3 vías**: se registra la factura contra la orden con recepciones y se compara lo comprometido (OC), lo recibido (recepción) y lo facturado (factura) con tolerancia del `1 %`; fuera de margen queda `con_discrepancia` y no se habilita su pago.
7. **Pago, devolución y cierre**: `jefe_compras` aprueba el pago de facturas conciliadas; las devoluciones (`DEV-AAAA-NNNN`) descuentan unidades aceptadas del saldo recibido y facturado, con aprobación separada cuando quien devuelve también recepcionó.

### Reglas de negocio verificables

- **RUT chileno Módulo 11**: `validarRut()` en `src/compras/reglas.js` valida formato y dígito verificador de usuarios y proveedores, y la unicidad del RUT tributario; el acceso acepta correo corporativo o RUT.
- **Umbral de `1.000.000 CLP` neto**: las solicitudes que lo igualan o superan exigen **3 cotizaciones vigentes** o una justificación de proveedor único para seleccionar una oferta. `admin_ti` puede modificar el umbral en caliente con OTP (FR-008, FR-021).
- **Conciliación a 3 vías y tolerancia del `1 %`**: OC ↔ recepción ↔ factura. Una diferencia dentro del `1 %` del neto se clasifica como `conciliada`; por sobre ese margen, como `con_discrepancia`. La tolerancia también es parametrizable con OTP (FR-016, FR-022).
- **Alertas legales a 30 días**: la condición de pago es de 30 días desde la recepción de la factura; superarla requiere acuerdo escrito inscrito (Ley 21.131). El panel alerta las facturas no aprobadas que vencen en 5 días o menos y el riesgo de pago tardío (FR-002, FR-017).
- **Cálculos, segregación y trazabilidad**: IVA 19 % en CLP enteros, imposibilidad de aprobar la propia solicitud ni de recepcionar la propia OC, historial inmutable de cada cambio de estado y cadena documental navegable entre solicitud, cotización, OC, recepción, factura y devolución.

## 5. Guía de demostración (5 minutos)

Recorrido práctico con el **modo presentación**: en cada cambio de rol, use **Cerrar sesión** y vuelva a ingresar desde el Directorio Interno con un clic.

1. **0:00 – 0:30 · Ingreso**: abrir `http://localhost:5173`, pulsar **Activar modo presentación** y elegir a **Francisca Herrera Díaz** (`comprador`). El portal no pide selector de modo ni clave adicional desde el directorio.
2. **0:30 – 1:15 · Panel**: revisar los KPI filtrados por el rol comprador, las acciones rápidas, los pendientes con códigos completos y las alertas de facturas por vencer.
3. **1:15 – 2:00 · Solicitud**: en **Solicitudes**, crear una solicitud de 3 productos, enviarla y verificar su estado. Cerrar sesión e ingresar como **Andrés Contreras Pérez** (`jefe_compras`) para aprobarla.
4. **2:00 – 3:00 · Cotizaciones y OC**: volver como comprador, registrar tres cotizaciones por encima del umbral, compararlas lado a lado, seleccionar la mejor y emitir la orden de compra.
5. **3:00 – 3:45 · Recepción**: cambiar a **Rodrigo Araya Mena** (`bodega`), registrar una recepción parcial con alguna unidad dañada y comprobar que la OC queda `recibida_parcial`.
6. **3:45 – 4:35 · Factura**: volver como comprador, ingresar la factura contra la OC recibida y observar la conciliación a 3 vías con el resultado `conciliada`/`con_discrepancia`.
7. **4:35 – 5:00 · Cierre**: como **jefe_compras**, aprobar el pago; si sobra tiempo, ingresar como **Tomás Villarroel** (`admin_ti`) para abrir el Padrón de Usuarios y el Log de Auditoría Forense, o exportar un CSV desde la vista correspondiente.

## 6. Modelo de datos y entidades (MER)

![MER Módulo Adquisiciones y Compras](docs/mer.png)

- **Enlace directo (PNG):** `https://raw.githubusercontent.com/MDS-BI/Grupo-06/main/docs/mer.png`
- **Entregable vectorial (SVG, 12 entidades semilla):** [`mer.svg`](specs/002-modulo-adquisiciones-compras/mer.svg) · `https://raw.githubusercontent.com/MDS-BI/Grupo-06/main/specs/002-modulo-adquisiciones-compras/mer.svg`

El PNG muestra las 19 entidades normalizadas y el SVG las 12 colecciones de `semilla.json`; ambos derivan de [`data-model.md`](specs/002-modulo-adquisiciones-compras/data-model.md). La imagen se genera desde el bloque Mermaid de ese documento, así siempre coinciden en contenido. Para regenerarla se requiere Python y [Graphviz](https://graphviz.org/download/). Desde la raíz del repositorio:

```bash
python docs/generar_mer.py
dot -Tpng -Gdpi=150 docs/mer.dot -o docs/mer.png
```

### Datos semilla

La primera visita carga automáticamente `src/compras/semilla.json` con datos ficticios: 8 usuarios con nombre propio, correo corporativo, RUT válido y centro de costo, todos `activo: true`, 4 centros de costo, 20 productos, 12 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación (incluidas notas de crédito), 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Las fechas se desplazan al día actual para mantener vigentes los vencimientos y plazos.

## 7. Privacidad (Ley 19.628) y auditoría

### Enmascaramiento en el origen y bancos chilenos

El enmascaramiento se aplica **en el origen** en fichas, listados, búsquedas, comparativa, panel, historial, CSV y respuestas del asistente; la única fuente es `src/compras/visibilidad.js` y `reglas.js`/`module-config.js` delegan en ella. El RUT personal ajeno se muestra `••••••••-•` para `solicitante`, `comprador` y `bodega`, y parcial (`18.XXX.XXX-5`) para `jefe_compras` solo en auditoría; `admin_ti` lo ve completo y cada usuario ve el suyo sin enmascarar. El RUT tributario de proveedores es completo para `comprador`, `jefe_compras` y `admin_ti`, visible para `bodega` solo en recepciones y guías de despacho, y oculto para `solicitante`. La cuenta bancaria es completa para `jefe_compras` y `admin_ti`, `****XXXX` para `comprador` (últimos 2 dígitos si tiene 4 o menos) y `No registrado`/`No disponible` para `solicitante` y `bodega`.

El formulario bancario usa catálogos cerrados de **doce bancos chilenos reales** y cinco tipos de cuenta (`src/compras/catalogos-bancarios.js`); al elegir **CuentaRUT (BancoEstado)** se fija ese banco y se auto-rellena la cuenta con el cuerpo numérico del RUT del proveedor, sin dígito verificador, con aviso editable. Solo `admin_ti` edita datos bancarios y cada cambio actualiza `fecha_cambio_cuenta`.

La matriz de `src/compras/visibilidad.js` y los permisos de `src/compras/almacenamiento.js` aplican esa protección con segregación de funciones sin excepciones, rol fijo por sesión, trazabilidad de cambios, Log de Auditoría Forense con hash encadenado y un asistente que nunca amplía permisos. La autenticación sigue siendo simulada (clave `Compras2026` incluida en el bundle) y todos los datos son ficticios; por eso el MVP demuestra el diseño de privacidad, no un despliegue conforme. El OTP y las notificaciones son internos. Hoy aplica la Ley 19.628; la Ley 21.719, modificada por la Ley 21.855 publicada el 23-11-2026, entra en vigencia el 15-10-2027. Para producción se requiere SSO/OIDC, cifrado en reposo, emisión real de OTP, auditoría *append-only* en servidor con firma criptográfica y registro de actividades de tratamiento.

### Gobernanza de identidades y datos (Fase 23)

- **Presentación** (`app.js`): el botón **Activar modo presentación** despliega el directorio de ocho usuarios con clic directo.
- **Padrón y consentimiento** (`vista.js`, `administracion.js`): `admin_ti` ve ocho filas con nombre, RUT completo, correo, centro de costo, estado y acciones; el nombre abre una ficha con Nombre, Correo, RUT, Rol y Centro de costo bloqueados hasta validar un **OTP de seis dígitos con vigencia de 5 minutos y máximo 3 intentos**. La solicitud genera una notificación interna al titular. El guardado valida RUT Módulo 11 y formato de correo.
- **Autorización de `admin_ti`**: al cambiar parámetros globales (umbral de cotizaciones y tolerancia de conciliación) o desbloquear excepciones, el propio `admin_ti` solicita y valida el OTP de 6 dígitos; en la edición de otra persona lo valida el titular afectado. Las cuentas suspendidas no pueden ingresar y no se permite autossuspensión ni dejar sin `admin_ti` activo.
- **Auditoría forense** (`auditoria.js`): registro *append-only* separado de `trazabilidad.js`, con actor, usuario afectado, tipo de evento, campos anterior → nuevo, resultado OTP y timestamp, **hash encadenado**, filtros, verificación de integridad y exportación CSV restringida a `admin_ti`.
- **Parámetros y excepciones** (`gobernanza.js`, `administracion.js`): umbral y tolerancia editables con OTP; desbloqueo de excepciones con permiso y token vigente.

## 8. Diseño UI/UX y experiencia de usuario

### Interfaz corporativa

La paleta base es GitHub Dark (`#0D1117` / `#161B22` / `#2F81F7`) con soporte de Modo Claro (`#F6F8FA` / `#FFFFFF` / `#0969DA`); la tipografía global es **Plus Jakarta Sans** (pesos 400/500/600/700) y el fondo del login es arquitectónico en blanco y negro (`public/login-bg.avif`) con tarjeta central elevada. El portal es limpio: **no expone selector visual de Modo Demo / Modo Real**, inicia directamente con la semilla completa de 8 usuarios y ofrece **Activar modo presentación** para desplegar el Directorio Interno. Incluye campo dual correo/RUT, clave `Compras2026`, opción **Mostrar/Ocultar** la clave y errores junto al campo. Un botón circular de cambio de tema (**Modo Oscuro / Modo Claro**, `40x40px`, `position: fixed; top: 20px; right: 20px`) con íconos SVG de sol/luna permanece sincronizado con el resto de la aplicación. El consentimiento de cookies se administra en `sessionStorage` y el Asistente IA responde únicamente dentro del ERP, con guardrails RBAC.

El **Panel filtrado por rol** muestra KPI numéricos por el rol activo, acciones rápidas con descripción legible y pendientes con acceso directo; la navegación lateral única **Compras** se agrupa en **Panel / Adquisiciones / Compras** y solo muestra las vistas permitidas por `vistasVisibles()` (`src/compras/visibilidad.js`).

### Interfaz actual

- **Acceso**: portal corporativo GitHub Dark con campo dual de **correo corporativo o RUT** y clave única `Compras2026`. El directorio de ocho usuarios se despliega con **Activar modo presentación** y cada entrada completa correo y clave (`poblarDirectorioUsuarios()` en `src/app.js`). Incluye errores junto al campo, opción **Mostrar/Ocultar**, botón circular de tema y **Cerrar sesión**.
- **Cookies de sesión**: banner con *Aceptar todas*, *Solo esenciales* y *Configurar preferencias*. El estado se guarda en `sessionStorage` bajo `compras_cookie_consent_v1` (`src/compras/cookies.js`) y se puede reabrir desde el enlace *Cookies* del footer; las preferencias de UI y analítica interna son opcionales y las esenciales siempre están activas.
- **Barra superior**: marca *Adquisiciones y Compras* con logotipo monograma SVG, indicador de sesión con usuario, rol y centro de costo, distintivo **Control de roles: administrador TI** y botón **Cerrar sesión**. El rol no cambia en vivo: para probar otro, cierre sesión e ingrese de nuevo.
- **Barra lateral**: una sola sección, **Compras**, marcada como página activa (`aria-current="page"`) y con nombre accesible también cuando el icono se colapsa. Dentro del módulo, la navegación se agrupa en **Panel / Adquisiciones / Compras** según `vistasVisibles()` de `src/compras/visibilidad.js`.
- **Pestañas del módulo**: Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones. La exportación CSV está disponible desde el módulo.
- **Panel**: pendientes por rol con contador y acceso directo, alertas de facturas por vencer, seguimiento de OC sin recepción, indicadores del mes y acciones rápidas con descripción legible.
- **Asistente IA**: tarjeta del Panel que responde saludos, agradecimientos y ayuda con el nombre y rol activos; rechaza temas fuera del ERP o sin permiso con el patrón «No puedo ayudarte a {tema}, quizás quisiste decir: {sugerencia1} o {sugerencia2}» y pide confirmación antes de ejecutar acciones sensibles.

## 9. Gobernanza Spec-Driven Development

La implementación se construyó sobre la plantilla base utilizando la metodología *Spec-Driven Development* (Speckit), siguiendo el [Plan Técnico](specs/002-modulo-adquisiciones-compras/plan.md) y la lista de [Tareas del Módulo](specs/002-modulo-adquisiciones-compras/tasks.md).

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

### Cobertura de requisitos

La especificación cubre la totalidad de los requisitos funcionales **`FR-001` a `FR-048`** y de los criterios de éxito **`SC-001` a `SC-025`**, con trazabilidad desde cada historia de usuario hasta sus tareas y pruebas en [`spec.md`](specs/002-modulo-adquisiciones-compras/spec.md) y [`tasks.md`](specs/002-modulo-adquisiciones-compras/tasks.md). La gobernanza de identidades (FR-042–FR-046, US13, SC-020–SC-023) cuenta con pruebas en `tests/unit/compras/usuarios.test.js`, `tests/unit/compras/otp.test.js`, `tests/integration/compras/usuarios.test.js`, `tests/integration/compras/auditoria-forense.test.js` y `tests/integration/compras/autenticacion.test.js`.

### Registro de decisiones

Las decisiones de diseño se registran como *Issues* con la etiqueta `decision`.

### Trazabilidad documental

[`spec.md`](specs/002-modulo-adquisiciones-compras/spec.md), [`plan.md`](specs/002-modulo-adquisiciones-compras/plan.md), [`research.md`](specs/002-modulo-adquisiciones-compras/research.md) y el [MER de la sección 6](#6-modelo-de-datos-y-entidades-mer), con su entregable en PNG y SVG.

## 10. Arquitectura técnica y persistencia

### Arquitectura modular limpia

La lógica del módulo vive en `src/compras/` con responsabilidades separadas (reglas puras, almacenamiento, visibilidad, autenticación, gobernanza, auditoría y vistas). `src/storage.js`, `src/module-config.js` y `src/components/` se conservan como dependencia técnica del template base **sin modificar su comportamiento**; sus vistas genéricas no se exponen (FR-032). No se usa framework de interfaz: HTML, CSS y JavaScript puros con Vite.

### Persistencia y reinicio

Las colecciones del módulo se guardan en `localStorage` con el prefijo `erp_compras:`; los proveedores se comparten con la entidad base (`erp_base_module:entities`). Para reiniciar los datos, limpia las claves `erp_compras:*` y `erp_base_module:entities` del almacenamiento local o ejecuta `await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras())` desde la consola con Vite abierto; después recarga la página.

### Estructura del repositorio

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

### Origen: Template base del curso (Módulo Base ERP, Vite + Vanilla JS)

El proyecto se originó a partir de una aplicación de página única (*single-page app*) con gestión de entidades y documentos, persistencia en `localStorage` y una configuración centralizada. Esa base aportó los tokens de diseño en `src/styles.css`, el logotipo monograma, el manejo de errores de configuración y parte de la persistencia.

En la plantilla original, el espacio de trabajo mostraba Panel, Entidades, Documentos y Búsqueda; esas vistas se retiraron de `index.html` al incorporar el módulo de Adquisiciones y Compras. El código de apoyo permanece disponible, pero la personalización mediante `userConfig` ya no altera las etiquetas de la interfaz del módulo: solo se usa el nombre de la aplicación y el color de acento.

#### Configuración

El objeto `userConfig` de `src/module-config.js` mantiene las opciones heredadas:

- `moduleName` — Nombre de la aplicación, título de la página y origen del monograma. Por defecto: `Adquisiciones y Compras`.
- `labels` — Terminología Entidad/Documento del template base; no afecta las pestañas del módulo.
- `customFields` — Campos adicionales del template base (`text`, `number`, `date` o `select`).
- `statusLifecycle` — Transiciones configurables de estados del template base.
- `theme.accentColor` — Color hexadecimal aplicado a la marca y los controles principales.

Si la configuración es inválida, la aplicación muestra los problemas en el banner `#config-errors` y utiliza los valores por defecto sin fallar.

#### Notas heredadas

- Las entidades y documentos del template base se persisten en `localStorage` bajo `erp_base_module:entities` y `erp_base_module:documents`.
- Al eliminar una entidad del template base, también se eliminan sus documentos asociados (*eliminación en cascada*).
- El proyecto utiliza intencionalmente HTML, CSS y JavaScript puros, sin frameworks de interfaz.

## 11. Calidad y pruebas automatizadas

### Verificación

Estado real verificado el 2026-11-25 sobre la rama `main`:

- `npx vitest run`: **321 pruebas aprobadas y 56 omitidas**, en **27 archivos aprobados y 10 omitidos** (los omitidos pertenecen al template base).
- `npm run lint`: **OK, sin errores ni advertencias**.
- `npm run format:check`: **sin diferencias** en el alcance de `.prettierignore` (núcleo base `src/storage.js` y `tests/unit/storage.test.js`).
- `npm run build`: **build de producción sin errores** (Vite 8.2.1).
- Accesibilidad WCAG 2.1 AA revisada: etiquetas asociadas, navegación por teclado en pestañas, errores junto al campo con `role="alert"`/`aria-describedby`, contraste mínimo 4,5:1 y respeto a `prefers-reduced-motion`.

La suite automatizada en Vitest cubre reglas de negocio, RBAC, enmascaramiento, OTP, auditoría forense, panel, proveedores, exportación CSV, asistente y rendimiento de listados con hasta 500 registros por colección.

Deuda declarada en [`tasks.md`](specs/002-modulo-adquisiciones-compras/tasks.md), no bloqueante para la entrega: T144/T155/T168 (recorrido manual en navegador de los escenarios 1 a 8). T101, T104, T107, T108, T109, T110, T117, T118, T119, T120, T127, T137 y T139 están cerradas. Las fases 1 a 23, incluidas T043-T050, T100, T102-T106, T107, T108, T120 y T161-T168, están cerradas.

## 12. Escalabilidad y evolución futura

### Escalabilidad

El MVP funciona 100 % en frontend sobre `localStorage` (por navegador, sin concurrencia ni transacciones). El modelo normalizado permite migrar a PostgreSQL u otro RDBMS y exponer una API REST/GraphQL conservando los nombres de colección de `semilla.json` como contrato. La migración prevista es por fases: persistencia y auditoría, autenticación real, integraciones y, por último, asistente gobernado. Las integraciones con Inventario y Contabilidad se diseñan con un outbox de eventos (`recepcion.registrada`, `factura.aprobada_pago`, `devolucion.registrada`) para no acoplar los módulos a la interfaz. Detalle en [`plan.md`](specs/002-modulo-adquisiciones-compras/plan.md) §*Escalabilidad y Desarrollo Futuro* y en [`research.md`](specs/002-modulo-adquisiciones-compras/research.md).

### Sesgos de datos

Mitigaciones ya aplicadas: tres cotizaciones sobre el umbral inicial de 1.000.000 CLP (configurable con OTP), `motivo_descarte` obligatorio, `puntaje_plazo` calculado desde fechas reales, comparativa lado a lado, campo `tamano_empresa` (`micro`, `pequeña`, `mediana`, `grande`, coherente con semilla y formulario) para medir el gasto en pymes, y catálogo con `fecha_actualizacion` que marca precios con más de 90 días como desactualizados. Queda por instrumentar la revisión de la distribución de adjudicaciones, la rúbrica de evaluación, múltiples evaluadores y métricas de equidad; el detalle está en `data-model.md` §5-8 y en el README del módulo §5.

## 13. Equipo y referencias

**Integrantes**: Bastián Domke Cifuentes, Joaquín Westermeier Manoli, Julio Castro González, Valentina Barrientos Acuña, Maximiliano Cid Cereceda, Franco García Lépez.

- Curso: **Modelación de Sistemas 2026-2**, Departamento de Ingeniería Industrial, Universidad de Concepción.
- [Plan de trabajo y cronograma](docs/plan-de-trabajo.md) · [Retroalimentación del profesor](feedback.md).
- [Especificación del módulo base](specs/001-erp-base-module/) · [Especificación de Adquisiciones y Compras](specs/002-modulo-adquisiciones-compras/spec.md).
- [MER en PNG](docs/mer.png) · [MER vectorial en SVG](specs/002-modulo-adquisiciones-compras/mer.svg) · [Graphviz](https://graphviz.org/download/).
