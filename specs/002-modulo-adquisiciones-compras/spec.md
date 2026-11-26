# Especificación de la Funcionalidad: Módulo Adquisiciones y Compras

**Rama de la funcionalidad**: 002-modulo-adquisiciones-compras  
**Creada**: 2026-10-27  
**Actualizada**: 2026-11-25  
**Estado**: Especificación aprobada; implementación completada (**cerrada con nota**). Las tareas de deuda funcional T127, T137 y T139 están cerradas y sus pruebas pasan; el recorrido manual de los escenarios 1 a 8 de `quickstart.md` queda como **validación humana externa**, no como trabajo pendiente. Avance 2026-11-24: mejoras UI/UX del módulo (KPI, acciones rápidas legibles, pendientes/flujo, tablas, badges, modo oscuro, IBM Plex Sans, íconos SVG laterales y encabezado `Resumen General`) y ajustes de sesión: el rol queda fijo durante la sesión para los cinco roles, sin control para cambiarlo en vivo. Se habilitó `crear_solicitud` para los cinco roles y se actualizaron los nombres semilla de `jefe_compras`. El estado canónico de las Fases 16–23 y la deuda conocida están en [`tasks.md`](tasks.md); `spec.md`, `plan.md`, `quickstart.md` y el `README.md` del módulo solo lo referencian.
**Entrada**: Descripción del grupo: "Construir, sobre el módulo base del curso, un módulo de Adquisiciones y Compras para una pyme chilena que cubra el ciclo completo: solicitud de compra, cotizaciones de proveedores, orden de compra, recepción y factura del proveedor, junto con la gestión y evaluación de proveedores."

## Propósito

### Problema

En muchas pymes las compras se gestionan por correo, WhatsApp y planillas: alguien pide algo de palabra, el encargado cotiza con el proveedor de siempre, la orden se manda por correo y nadie confirma con certeza qué llegó ni si la factura cobra lo mismo que se pidió. Las consecuencias son concretas:

- No queda registro de quién autorizó cada compra ni de por qué se eligió a un proveedor.
- Se paga lo que el proveedor factura, aunque no coincida con lo recibido.
- Las facturas se aprueban tarde y la empresa incumple el plazo legal de pago de 30 días (Ley 21.131), lo que genera intereses y daña la relación con proveedores pequeños.
- No hay datos para comparar proveedores ni para saber cuánto gasta cada área.

### Solución propuesta

Un módulo de Adquisiciones y Compras integrado al ERP que ordena el ciclo completo en un solo lugar:

```
Solicitud de compra → Cotizaciones de proveedores → Orden de compra → Recepción → Factura del proveedor
```

Cada paso exige al anterior (no hay orden de compra sin solicitud aprobada, no hay factura sin recepción), separa funciones entre quien pide, quien aprueba, quien compra y quien recibe, y concilia automáticamente la factura con la orden y la recepción. Además mantiene un registro de proveedores con su catálogo de precios y su evaluación de desempeño.

### Cliente, Usuarios y Claves de Integración

Para asegurar el control de acceso y la integración fluida con otros módulos del ERP (Inventario, Contabilidad, RR.HH.), el módulo define las siguientes claves y niveles de acceso:

**Claves de Integración (Keys):**

- `id_producto`: Vincula con el **Módulo de Inventario**.
- `id_proveedor`: Vincula con el **Módulo de Contabilidad/Finanzas**.
- `id_usuario`: Vincula con el **Módulo de RRHH/Usuarios**.

**Roles en el sistema:**

| Usuario                      | Rol técnico    | Nivel de Acceso y Propósito                                                                                                                |
| :--------------------------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Solicitante (cualquier área) | `solicitante`  | **Restringido:** Crea y ve solo sus propias solicitudes; consulta en solo lectura las OC y recepciones originadas en ellas, y el catálogo. No ve RUT de proveedores ni cuentas bancarias.                                          |
| Comprador                    | `comprador`    | **Ejecutor:** Cotiza, emite Órdenes de Compra (OC), registra y concilia facturas, mantiene proveedores y catálogo y evalúa proveedores. Crea y edita sus propias solicitudes y ve las demás, junto con recepciones y devoluciones, en solo lectura. Ve el RUT tributario completo y la cuenta como `****XXXX`. |
| Jefe de Compras              | `jefe_compras` | **Aprobador:** Aprueba o rechaza las solicitudes de otros usuarios, aprueba el pago de facturas y las devoluciones, evalúa proveedores y consulta la trazabilidad. Crea y edita sus propias solicitudes, que debe aprobar otro `jefe_compras`. Ve el resto en solo lectura, con datos bancarios completos, pero no los edita. |
| Encargado de bodega          | `bodega`       | **Restringido (Físico):** Registra recepciones y devoluciones de OC emitidas; ve las OC en solo lectura. Crea, edita y ve solo sus propias solicitudes. Ve el RUT tributario solo en recepciones y guías de despacho, nunca cuentas. |
| Administrador                | `admin_ti`     | **Administrador del sistema:** Edita datos bancarios, desbloquea proveedores, administra y suspende usuarios, parametriza el umbral de cotizaciones y la tolerancia de conciliación previa autorización OTP del titular, y consulta la auditoría forense; crea y edita sus propias solicitudes; ve el resto del módulo en solo lectura. No emite OC, no registra recepciones ni aprueba solicitudes, pagos ni devoluciones. |

Los cinco roles pueden crear solicitudes de compra (`crear_solicitud`). Cada usuario edita solo las suyas; la aprobación es exclusiva de un `jefe_compras` distinto del solicitante (regla 8). El detalle por vista está en la [Matriz de visibilidad por rol](#matriz-de-visibilidad-por-rol-fr-033) (FR-033).

**Usuarios semilla (Modo Demo, 7 personas chilenas con nombre propio y RUT válido Módulo 11):**

| ID | Nombre | Rol | RUT (Módulo 11) | Correo corporativo | Contraseña |
|---|---|---|---|---|---|
| u-solicitante-1 | Camila Rojas Soto | solicitante | 18.123.456-3 | camila.rojas@pyme.cl | Compras2026 |
| u-solicitante-2 | Diego Muñoz Vera | solicitante | 17.234.567-0 | diego.munoz@pyme.cl | Compras2026 |
| u-comprador-1 | Francisca Herrera Díaz | comprador | 16.345.678-8 | francisca.herrera@pyme.cl | Compras2026 |
| u-jefe-1 | Andrés Contreras Pérez | jefe_compras | 18.100.001-5 | andres.contreras@pyme.cl | Compras2026 |
| u-jefe-2 | Valentina Lagos Fuentes | jefe_compras | 15.567.890-9 | valentina.lagos@pyme.cl | Compras2026 |
| u-bodega-1 | Rodrigo Araya Mena | bodega | 14.678.901-3 | bodega@pyme.cl | Compras2026 |
| u-admin-1 | Tomás Villarroel Sepúlveda | admin_ti | 13.789.012-7 | admin.ti@pyme.cl | Compras2026 |

El rol queda fijo durante la sesión: se elige al ingresar (FR-037) y, para usar otro rol, hay que cerrar sesión e ingresar de nuevo. El RUT completo de estas siete personas se muestra en la columna **RUT** del **Padrón de Usuarios · Administración TI** (FR-043).

### Privacidad y visibilidad RBAC de RUT y datos sensibles

Estas reglas son vinculantes para todas las vistas, listados, modales, búsquedas, aprobaciones, historial, auditoría, respuestas del asistente y exportaciones, y se aplican en el origen de los datos antes de renderizar o exportar (`visibilidad.js`). El cambio de rol modifica sustancialmente las pestañas disponibles, los botones de acción y el enmascaramiento de campos sensibles: dos roles nunca comparten la misma vista sin restricciones.

**RUT personal de empleados (Ley 19.628):**

| Rol | RUT personal de otros empleados | RUT propio |
| --- | --- | --- |
| `solicitante`, `comprador`, `bodega` | Completamente oculto: `••••••••-•`. Solo se muestran nombre, cargo y centro de costo. | Visible en el indicador/perfil de sesión. |
| `jefe_compras` | Parcialmente enmascarado (`18.XXX.XXX-5`) solo en vistas de auditoría; oculto en listados y aprobaciones. | Visible en el indicador/perfil de sesión. |
| `admin_ti` | Completo y visible en la columna **RUT** del Padrón de Usuarios; la edición exige primero el consentimiento del titular mediante OTP (FR-043, FR-044). | Visible en el indicador/perfil de sesión. |

**RUT tributario y datos bancarios de proveedores:**

| Rol | RUT tributario de proveedores | Cuentas bancarias |
| --- | --- | --- |
| `solicitante` | Sin acceso al directorio de proveedores; solo opera sobre el catálogo de ítems/servicios. | Sin acceso. |
| `bodega` | Visible solo en guías de despacho y recepciones para validar entregas contra la OC. | Sin acceso. |
| `comprador` | Completo, para cotizar y emitir OC. | Enmascarado (`****XXXX`; cuentas cortas conservan solo los últimos 2 dígitos). |
| `jefe_compras` | Completo. | Completo (solo lectura). |
| `admin_ti` | Completo. | Completo (edición y `fecha_cambio_cuenta`). |

El campo `cuenta_visible` sigue exactamente esta matriz: número completo para `jefe_compras` y `admin_ti`, `****XXXX` para `comprador` (con últimos 2 dígitos para cuentas de 4 o menos), `No registrado` cuando no hay cuenta y `No disponible` cuando el rol no tiene acceso a una cuenta existente. Los campos `banco`, `tipo_cuenta`, `numero_cuenta` y `fecha_cambio_cuenta` se omiten en `vistaProveedor()` para `solicitante` y `bodega`; `comprador` recibe solo `numero_cuenta` enmascarada. El RUT personal de empleados se rige por la tabla anterior y nunca se mezcla con el RUT tributario de proveedores. En trazabilidad, el campo `detalle` se persiste ya con la representación parcial del RUT (`18.XXX.XXX-5`) y la cuenta (`****XXXX`) como salvaguarda del historial inmutable; la columna `RUT usuario` del CSV se calcula al exportar con la matriz para el rol activo, por lo que `admin_ti` ve el RUT completo en esa columna y ningún rol obtiene el número de cuenta completo desde el historial. `sanitizarRutsEnTexto()` detecta RUT con puntos y guion en texto libre y aplica la matriz que corresponda: la de empleados para los RUT declarados y la de proveedores para el resto. `vistaProveedor()` copia solo campos no sensibles del registro original y agrega `taxId`, `banco`, `tipo_cuenta`, `numero_cuenta` y `fecha_cambio_cuenta` únicamente cuando el rol tiene permiso. La única definición de `enmascararRut()` está en `visibilidad.js` (`••••••••-•` oculto, `XX.XXX.XXX-K` / `18.XXX.XXX-5` parcial de jefatura, completo para `admin_ti`); `reglas.js` solo la re-exporta. El padrón de usuarios de Administración TI y los encabezados de auditoría resuelven el RUT con esas mismas funciones.

**Consentimiento del titular y auditoría forense:** aunque `admin_ti` puede *ver* el RUT completo en el padrón, no puede *modificar* nombre, correo, RUT, rol ni centro de costo de otro usuario sin que el titular autorice la operación con un código OTP de 6 dígitos vigente (FR-044). La solicitud genera una notificación interna para el titular; en Modo Demo se muestra además la ayuda visual con el código para permitir pruebas sin servidor de correo. Cada alta, edición, suspensión, reactivación y cambio de parámetros queda registrado en el Log de Auditoría Forense con usuario afectado, campos modificados, timestamp y resultado de la validación OTP (FR-045); el historial es inmutable y solo `admin_ti` puede consultarlo y exportarlo.

### Fuera de alcance

Backend real, conexión con el SII o recepción automática de documentos tributarios electrónicos, registro del pago (lo hace Contabilidad), control de presupuesto por centro de costo, compras públicas (Ley 19.886), envío real de correos y la gestión de contactos de proveedor (CONTACTO_PROVEEDOR: alta, edición y contacto principal), que queda modelada en [data-model.md](data-model.md) pero fuera del MVP. La columna y el buscador por **Contacto** del listado de proveedores no usan esa entidad hija: provienen de los campos maestros directos de `PROVEEDOR` (`email` y `telefono`, el contacto general descrito en `data-model.md` §3.3). La autenticación sigue siendo simulada (clave genérica `Compras2026`); Modo Real exige correo corporativo y contraseña válida solo para seleccionar el usuario semilla, sin validar identidad real.

## Clarifications

### Session 2026-11-03

- Q: ¿Qué monto neto debe usarse como `UMBRAL_COTIZACIONES` para exigir tres cotizaciones o una justificación de proveedor único? (FR-021) → A: **1.000.000 CLP neto**. Una solicitud con monto estimado igual o superior a ese valor exige tres cotizaciones o la justificación de proveedor único antes de seleccionar una oferta y emitir la orden de compra (FR-008, US6, escenario 4).
- Q: ¿Cómo debe definirse `TOLERANCIA_CONCILIACION` para clasificar una factura como conciliada o con discrepancia? (FR-022) → A: **1 % del neto** de la factura. Una diferencia dentro de ese margen clasifica la factura como `conciliada` y por sobre él como `con_discrepancia`.
- Q: ¿Qué roles pueden ver el RUT tributario de proveedores y los datos bancarios? (FR-004) → A: El RUT tributario es completo para `comprador`, `jefe_compras` y `admin_ti`; `bodega` lo ve solo en recepciones y guías de despacho; `solicitante` no tiene acceso. La cuenta bancaria es completa para `jefe_compras` y `admin_ti`, `****XXXX` para `comprador` y oculta para `solicitante` y `bodega`. Solo `admin_ti` puede editarla y cada cambio actualiza `fecha_cambio_cuenta`. El RUT personal de empleados se rige por la tabla de privacidad: completo para `admin_ti`, parcial en auditoría para `jefe_compras`, oculto para los demás roles y siempre sin enmascarar cuando es propio.
- Q: ¿Qué formato CSV deben usar las exportaciones para abrirse correctamente en Excel en español? (FR-024) → A: **UTF-8 con marca de orden de bytes (BOM) al inicio y separador de columnas `;`**. Así se conservan tildes, eñes y símbolos y no se juntan las columnas (US10, escenario 6; SC-010). El detalle técnico se mantiene en `plan.md`.
- Q: ¿Qué roles pueden usar la exportación CSV? (FR-024) → A: Heredan el permiso de la vista; cada rol exporta solo los listados que ya puede ver.

### Session 2026-11-17

- Q: ¿Deben escribirse todas las historias de usuario de la funcionalidad 002 en un mismo formato conservando toda la información existente en `spec.md`? → A: Sí; normalizar US1-US11 al formato canónico de `**Como/necesito/para**`, `**Por qué esta prioridad**`, `**Prueba Independiente**` y `**Escenarios de Aceptación**` con pasos **Dado/Cuando/Entonces**, sin eliminar contenido.

### Session 2026-11-19

- Q: ¿Cuál es el flujo completo acordado para productos dañados, devoluciones y su protección de datos y auditoría? (FR-025 a FR-030) → A: Las unidades dañadas detectadas al recibir se registran como rechazadas con motivo `danado`: no cuentan como recibidas, no entran al valor a facturar y quedan pendientes en la OC para reposición (US4, escenarios 5 y 6). Si el daño se detecta después de aceptar, se registra una devolución con motivo `defectuoso` que descuenta el saldo recibido y el monto facturado y, cuando corresponda, genera una nota de crédito; nunca se paga lo dañado (US11, escenarios 7 y 8). En todo el flujo el enmascaramiento se aplica en el origen (FR-025), cada cambio de estado queda trazable con usuario, fecha y acción (FR-027), la cadena solicitud → cotización → OC → recepción → factura → devolución es navegable (FR-028), los documentos con historial se anulan con motivo sin borrarse (FR-029) y los cambios bancarios se registran con la representación autorizada por la matriz de `visibilidad.js`, nunca con el número completo (FR-030).
- Q: ¿Qué vistas debe exponer la aplicación y qué ocurre con las vistas genéricas del template base? (FR-032) → A: La aplicación debe mostrar exclusivamente las vistas del módulo de Adquisiciones y Compras: Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones. Las vistas genéricas del template base —Entidades, Documentos y Búsqueda— no se muestran, no se enlazan desde la navegación y no son accesibles desde ninguna acción del módulo.

### Session 2026-11-23

- Q: ¿Se puede cambiar de rol durante una sesión? (FR-034, FR-036, FR-037) → A: **Fijo para los cinco roles (actualizado 2026-11-24).** Al iniciar sesión, el rol queda fijo para todos los roles: la barra superior muestra indicador de sesión con usuario/rol y **Cerrar sesión**, y `setRolActivo()` no cambia el rol de una sesión iniciada. Para usar otro rol se cierra sesión y se ingresa de nuevo.
- Q: ¿Cómo se rediseñan los permisos y la navegación por rol? (FR-004, FR-014, FR-033 a FR-036) → A: `admin_ti` pasa a ser **administrador del sistema** y no operador de compras: conserva la edición de datos bancarios, el desbloqueo de proveedores y la consulta y exportación de la trazabilidad, y ve todo lo demás en solo lectura; pierde emitir OC, registrar recepciones y aprobar solicitudes, pagos y devoluciones. La segregación de funciones (regla 8) se aplica **sin excepciones** a la aprobación de solicitudes, al registro de recepciones y a la aprobación de devoluciones. Las dos excepciones de la sección «Suposiciones» (comprador que cotiza/emite OC de su propia solicitud y comprador que concilia facturas de OC que emitió) se aceptan como riesgo asumido de pyme, mitigado por la aprobación segregada y la trazabilidad. Cada rol ve y opera según la matriz de visibilidad (FR-033); la barra lateral se agrupa en Panel / Adquisiciones / Compras (FR-034); el panel muestra pendientes e indicadores propios de cada rol (FR-035); las acciones rápidas muestran una descripción legible, se elimina la tarjeta "Sesión activa" y el encabezado muestra la sección actual (FR-036). El comprador concilia facturas de OC que él emitió como riesgo asumido de pyme (data-model §6). Resoluciones de consistencia: solo `admin_ti` desbloquea proveedores (vuelven a `aprobado`) y el comprador puede bloquearlos; solo el `comprador` emite OC; el solicitante ve el precio de referencia del catálogo, pero no las cotizaciones; bodega registra las devoluciones y `jefe_compras` las aprueba; en trazabilidad, `admin_ti` consulta y exporta (el historial es inmutable) y `jefe_compras` solo consulta.
- Q: ¿Qué roles pueden crear solicitudes de compra? (FR-005, FR-006, FR-033) → A: **Los cinco roles** (`solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`) tienen `crear_solicitud`. Cada usuario crea y edita solo sus propias solicitudes; los roles que ya veían las solicitudes ajenas (`comprador`, `jefe_compras` y `admin_ti`) las siguen viendo en solo lectura o para aprobarlas, y `solicitante` y `bodega` ven solo las suyas. La aprobación sigue siendo exclusiva de un `jefe_compras` distinto del solicitante (regla 8): si quien crea la solicitud es `jefe_compras`, debe aprobarla otro `jefe_compras`, por lo que la semilla agrega un segundo usuario `jefe_compras`. La decisión y sus alternativas descartadas están en `research.md`.
- Q: ¿Cómo ingresa el segundo `jefe_compras` si ese rol no pide nombre? (FR-037) → A: `jefe_compras` pasa a pedir nombre al ingresar, igual que `solicitante` y `comprador`, y se muestra con su nombre en la sesión y en la trazabilidad; así se distinguen los dos usuarios `jefe_compras` de la semilla. `bodega` y `admin_ti` siguen ingresando y mostrándose solo por su rol.
- Q: ¿Dónde ve cada rol el estado de las solicitudes que creó? (FR-035) → A: Como los cinco roles pueden crear solicitudes, el panel de **todos los roles** muestra el pendiente **"Mis solicitudes"** con el estado de las solicitudes propias del usuario, además de los pendientes propios de su rol.
- Q: ¿Se permite que un comprador cotice y emita la OC de una solicitud que él mismo creó? → A: Sí, como **riesgo asumido de pyme** (conflicto de interés), documentado en data-model §6. Se mitiga porque la solicitud la aprueba un `jefe_compras` distinto del solicitante antes de cotizar y porque cada paso queda en la trazabilidad.

### Session 2026-11-25

- Q: ¿Cómo se unifica la visibilidad de RUT de empleados, RUT tributario de proveedores y datos bancarios? (FR-004, FR-025, SC-009) → A: `src/compras/visibilidad.js` es la única fuente canónica. El RUT personal ajeno es `••••••••-•` para `solicitante`, `comprador` y `bodega`; `18.XXX.XXX-5` para `jefe_compras` solo en auditoría; completo para `admin_ti`; y cada usuario ve el suyo. El RUT tributario es completo para `comprador`, `jefe_compras` y `admin_ti`, visible para `bodega` solo en recepciones y guías de despacho, y oculto para `solicitante`. La cuenta es completa para `jefe_compras` y `admin_ti`, `****XXXX` para `comprador` y sin dígitos para `solicitante` y `bodega`. Las máscaras parciales que antes se usaban para roles sin acceso quedan eliminadas en favor de `••••••••-•` o de la ausencia del campo. La matriz se aplica en tablas, modales, búsquedas, trazabilidad, CSV y respuestas del asistente.
- Q: ¿Qué bancos y tipos de cuenta se ofrecen en el formulario de Datos Bancarios? (FR-038) → A: Un catálogo único de doce instituciones chilenas —`BancoEstado`, `Banco de Chile`, `Banco Santander Chile`, `Banco BCI`, `Scotiabank Chile`, `Banco Itaú Chile`, `Banco BICE`, `Banco Security`, `Banco Falabella`, `Banco Ripley`, `Banco Consorcio` y `Coopeuch / Tenpo / Mercado Pago (Prepago)`— y cinco tipos de cuenta —`Cuenta Corriente`, `Cuenta Vista / Chequera Electrónica`, `CuentaRUT (BancoEstado)`, `Cuenta de Ahorro` y `Cuenta Prepago`. Ambos campos son listas desplegables; los alias históricos se normalizan al nombre canónico y se rechazan valores fuera del catálogo.
- Q: ¿Qué ocurre al elegir `CuentaRUT (BancoEstado)`? (FR-039) → A: Con un proveedor seleccionado se fija el banco `BancoEstado` y se auto-rellena el número de cuenta con el cuerpo numérico del RUT, sin puntos ni dígito verificador (por ejemplo, `76.543.210-3` → `76543210`). Se muestra el aviso editable «Auto-completado desde el RUT del proveedor sin dígito verificador»; el usuario puede corregir el número, pero CuentaRUT solo es válida en `BancoEstado`.
- Q: ¿Cómo debe verse y buscarse el listado de proveedores, y qué pasa en Modo Real? (FR-040, FR-041) → A: El listado completo muestra siempre Razón Social, RUT Tributario, Rubro, Contacto, Banco y cuenta (enmascarada o visible según RBAC), Estado y Acciones. El buscador superior admite razón social, nombre de fantasía, RUT, rubro, contacto y región, con ancho suficiente para leer el placeholder completo, y sincroniza su texto con el selector `Proveedor *` del formulario de Datos Bancarios. El dato **Contacto** se resuelve desde los campos maestros de `PROVEEDOR` (`email`/`telefono`), no desde la entidad hija `CONTACTO_PROVEEDOR`, que queda fuera del MVP. En Modo Real el botón **Cargar catálogo base de proveedores/insumos** completa los catálogos maestros sin borrar registros creados por el usuario.

## Estado de las Fases 16–23 (2026-11-25)

El registro detallado del estado de las Fases 16–23 y de la deuda conocida está en [`tasks.md`](tasks.md) como **fuente canónica**; aquí solo se mantiene este resumen con referencia cruzada. Las fases 16 a 23 están **cerradas con nota**: navegación y visibilidad por rol, panel FR-035, matriz RBAC unificada de datos sensibles (Fase 21), catálogos bancarios y listado de proveedores (Fase 22) y gobernanza de identidades y datos (Fase 23) quedan implementados y verificados. La verificación automatizada registró 27 archivos aprobados y 10 omitidos, 320 pruebas aprobadas y 56 omitidas, sin errores de `lint`, `format:check` ni `build`. El recorrido manual de los escenarios 1 a 8 de `quickstart.md` queda únicamente como validación humana externa.

## Escenarios de Usuario y Pruebas _(obligatorio)_

_Nota de Integración: Para asegurar la trazabilidad y seguridad, este módulo utiliza identificadores únicos (`id_producto`, `id_proveedor`, `id_usuario`) que conectan con los módulos de Inventario, Contabilidad y RR.HH. Los roles de acceso definen qué información es visible según la matriz unificada de `visibilidad.js`: RUT personal de empleados, RUT tributario de proveedores y cuentas bancarias._

### Historia de Usuario 1 - Gestionar proveedores (Prioridad: P1)

**Como** Comprador (y el Administrador TI para datos bancarios y desbloqueo), **necesito** mantener un registro único, validado y seguro de nuestros proveedores, **para** tener la tranquilidad de que estamos haciendo negocios con entidades legales formales y evitar fraudes o pagos a cuentas incorrectas.

**Por qué esta prioridad**: Sin proveedores no se puede cotizar ni emitir órdenes de compra. Es el dato maestro del módulo y genera el `id_proveedor`.

**Prueba Independiente**: Un usuario crea un proveedor con RUT válido, lo encuentra en la búsqueda, cambia su estado a `aprobado` y luego a `bloqueado`.

**Escenarios de Aceptación**:

1. **Dado** que el usuario está en la lista de proveedores, **cuando** crea un proveedor con RUT, razón social, giro y región, **entonces** el proveedor se guarda en estado `potencial` y aparece en la lista generando un `id_proveedor`.
2. **Dado** que el usuario ingresa un RUT con dígito verificador inválido o ya registrado, **cuando** intenta guardar, **entonces** el sistema lo impide y sugiere usar el registro existente.
3. **Dado** un proveedor con condición de pago de 45 días, **cuando** no tiene marcado `acuerdo_plazo_mayor`, **entonces** el sistema no permite guardar (cumplimiento Ley 21.131).
4. **Dado** un proveedor con órdenes de compra, **cuando** el usuario intenta eliminarlo, **entonces** el sistema lo impide para proteger la integridad de los datos y ofrece bloquearlo.
5. **Dado** un usuario `comprador`, **cuando** ve la ficha de un proveedor, **entonces** el RUT tributario aparece completo y la cuenta como `****4333` sin ser editable; **dado** un usuario `bodega`, **entonces** ve el RUT solo en recepciones y guías de despacho y no ve cuenta; **dado** un usuario `solicitante`, **entonces** no ve RUT ni cuenta.
6. **Dado** un proveedor en estado `bloqueado`, **cuando** un usuario `admin_ti` lo desbloquea, **entonces** el proveedor vuelve a `aprobado` y el cambio queda registrado en la trazabilidad.
7. **Dado** un usuario `comprador`, **cuando** abre la ficha de un proveedor `bloqueado`, **entonces** no dispone de la acción de desbloquear; y **dado** un usuario `admin_ti`, **cuando** abre la lista de proveedores, **entonces** no puede crear proveedores ni editar sus datos generales (solo datos bancarios y desbloqueo).
8. **Dado** el listado de proveedores con la semilla base, **cuando** un usuario con acceso lo abre, **entonces** ve los 12 registros con Razón Social, RUT Tributario, Rubro, Contacto, Banco y cuenta según su rol, Estado legible (`Activo`, `En evaluación` o `Suspendido`) y Acciones; **cuando** escribe en el buscador superior, **entonces** puede leer el placeholder completo y la búsqueda reconoce razón social, nombre de fantasía, RUT, rubro, contacto y región. El dato **Contacto** se toma de los campos maestros `email`/`telefono` del proveedor, no de `CONTACTO_PROVEEDOR` (fuera del MVP).
9. **Dado** un usuario `admin_ti` en el formulario de Datos Bancarios, **cuando** abre los desplegables de banco y tipo de cuenta, **entonces** ve los doce bancos chilenos y los cinco tipos de cuenta del catálogo, sin valores libres fuera de él.
10. **Dado** un proveedor seleccionado, **cuando** elige `CuentaRUT (BancoEstado)`, **entonces** el banco queda fijo en `BancoEstado`, la cuenta se auto-completa con el RUT sin dígito verificador, aparece el aviso «Auto-completado desde el RUT del proveedor sin dígito verificador» y el número sigue siendo editable; **cuando** elige otro tipo de cuenta, **entonces** el aviso desaparece.
11. **Dado** un ingreso en Modo Real con los catálogos vacíos, **cuando** pulsa **Cargar catálogo base de proveedores/insumos**, **entonces** los catálogos maestros quedan disponibles sin sobrescribir los registros creados por el usuario.

---

### Historia de Usuario 2 - Crear y aprobar solicitudes de compra (Prioridad: P1)

**Como** usuario de cualquier área y de cualquiera de los cinco roles (solicitante, comprador, Jefe de Compras, bodega o administrador TI), **necesito** pedir los materiales que me faltan indicando cantidad y justificación, y que un Jefe de Compras distinto de mí pueda revisarlos, **para** que las compras nazcan de una necesidad real y no se atrasen por correos perdidos.

**Por qué esta prioridad**: La solicitud aprobada es la puerta de entrada y el principal control contra compras no autorizadas. Vincula el `id_producto` y el `id_usuario`.

**Prueba Independiente**: Un solicitante crea y envía una solicitud con dos productos; el Jefe de Compras la aprueba; la solicitud queda en estado `aprobada`.

**Escenarios de Aceptación**:

1. **Dado** que el solicitante crea una solicitud con al menos un producto activo, **cuando** la envía, **entonces** queda en estado `enviada` con correlativo `SC-AAAA-NNNN` y monto estimado.
2. **Dada** una solicitud `enviada`, **cuando** el Jefe de Compras la aprueba, **entonces** queda `aprobada` registrando su nombre y fecha.
3. **Dada** una solicitud `enviada`, **cuando** el Jefe de Compras la rechaza, **entonces** el sistema exige escribir un motivo de rechazo.
4. **Dado** que el Jefe de Compras es también el solicitante, **cuando** intenta aprobar su propia solicitud, **entonces** el sistema se lo impide (segregación de funciones).
5. **Dada** una solicitud sin productos, **cuando** el solicitante intenta enviarla, **entonces** el sistema lo impide.
6. **Dada** una solicitud `enviada` de otro usuario, **cuando** un usuario `admin_ti` la abre, **entonces** la ve en solo lectura y no dispone de las acciones de aprobar ni rechazar.
7. **Dado** un usuario con cualquiera de los cinco roles, **cuando** crea una solicitud con al menos un producto activo y la envía, **entonces** queda `enviada` a su nombre y solo él puede editarla mientras esté en `borrador`.
8. **Dado** un usuario `bodega` o `solicitante`, **cuando** abre la vista Solicitudes, **entonces** ve solo sus propias solicitudes; y **dado** un usuario `comprador` o `admin_ti`, **cuando** abre una solicitud ajena, **entonces** la ve en solo lectura.
9. **Dada** una solicitud `enviada` creada por un `jefe_compras`, **cuando** otro usuario `jefe_compras` la aprueba o rechaza, **entonces** el sistema lo permite y registra al segundo como aprobador; **cuando** lo intenta el mismo `jefe_compras` que la creó, **entonces** el sistema se lo impide (regla 8).

---

### Historia de Usuario 3 - Emitir órdenes de compra (Prioridad: P1)

**Como** Comprador, **necesito** transformar una solicitud aprobada en un documento formal de compra (OC) de manera automática, **para** comprometer precios y plazos con el proveedor sin transcribir datos a mano.

**Por qué esta prioridad**: La OC es el documento central del módulo. Integra la solicitud con el `id_proveedor`.

**Prueba Independiente**: Con una solicitud aprobada bajo monto, el comprador emite una OC; aparece con número `OC-AAAA-NNNN`, neto, IVA y total, y la solicitud pasa a `adjudicada`.

**Escenarios de Aceptación**:

1. **Dada** una solicitud `aprobada` bajo el umbral de cotizaciones, **cuando** el comprador emite una OC directa, **entonces** la OC queda `emitida` (con IVA=19%) y la solicitud pasa a `adjudicada`.
2. **Dada** una solicitud sobre el umbral sin cotización seleccionada, **cuando** el comprador intenta emitir OC directa, **entonces** el sistema exige cotizaciones previas.
3. **Dado** un proveedor en estado `bloqueado`, **cuando** el comprador intenta emitirle una OC, **entonces** el sistema cancela la operación por riesgo.
4. **Dada** una cotización ya convertida en una OC no anulada, **cuando** se intenta generar una segunda OC desde ella, **entonces** el sistema lo impide para evitar duplicidad.
5. **Dada** una OC `emitida` sin recepciones, **cuando** el comprador la anula con motivo, **entonces** queda `anulada`, la solicitud vuelve a `en_cotizacion` si tiene cotizaciones o a `aprobada` si no las tiene, y el cambio queda registrado conforme a FR-027 a FR-030.
6. **Dada** una solicitud que ya tiene una OC no anulada (directa o desde cotización), **cuando** se intenta emitir otra OC para la misma solicitud, **entonces** el sistema lo impide; solo se permite reemitir después de anular la primera sin recepciones.

---

### Historia de Usuario 4 - Registrar recepciones (Bodega) (Prioridad: P1)

**Como** Encargado de Bodega, **necesito** contrastar físicamente lo que trae el camión contra la Orden de Compra, **para** asegurar que paguemos solo lo recibido y alertar al inventario.

**Por qué esta prioridad**: Es el control físico del ciclo. Genera el evento para actualizar el Módulo de Inventario mediante el `id_producto` y la cantidad aceptada.

**Prueba Independiente**: Sobre una OC de 10 unidades, se registran 6 aceptadas; la OC queda `recibida_parcial`. Luego 4 unidades más la dejan `recibida_total`.

**Escenarios de Aceptación**:

1. **Dada** una OC `emitida`, **cuando** bodega registra una recepción parcial, **entonces** la OC pasa a `recibida_parcial` mostrando lo pendiente.
2. **Dada** una línea con 4 unidades pendientes, **cuando** bodega intenta aceptar 5, **entonces** el sistema lo impide.
3. **Dada** una recepción con rechazos, **cuando** el bodeguero no indica el motivo, **entonces** el sistema lo exige obligatoriamente.
4. **Dado** que el usuario que intenta registrar la recepción es quien emitió la OC, cualquiera sea su rol, **cuando** intenta registrarla, **entonces** el sistema se lo deniega sin excepciones (regla 8, separación de compras y bodega).
5. **Dada** una OC `emitida`, **cuando** bodega detecta al recibir unidades dañadas, **entonces** las registra como rechazadas con motivo `danado`, no las cuenta como recibidas, no las incluye en el valor a facturar y las deja pendientes en la OC para reposición.
6. **Dada** una recepción con unidades rechazadas por motivo `danado`, **cuando** se consulta el valor a facturar de la OC, **entonces** dicho valor excluye las unidades dañadas y la OC mantiene la cantidad pendiente para reposición.
7. **Dado** un usuario `admin_ti`, **cuando** abre la vista de Recepciones, **entonces** ve las recepciones en solo lectura y no puede registrar ninguna.

---

### Historia de Usuario 5 - Panel de pendientes y alertas por rol (Prioridad: P1)

**Como** usuario del módulo (solicitante, comprador, Jefe de Compras, bodega o administrador TI), **necesito** ver al ingresar solo lo que me corresponde atender y lo que está por vencer, **para** priorizar mi trabajo diario y no dejar pasar plazos legales ni solicitudes detenidas.

**Por qué esta prioridad**: Es la pantalla de entrada del módulo y convierte el registro pasivo de datos en trabajo accionable. Sin ella, cada rol debe revisar listas completas para descubrir qué le toca; con ella se cumple el requisito de alertas de vencimiento (FR-017) y el criterio de éxito SC-005.

**Prueba Independiente**: Un Jefe de Compras con dos solicitudes enviada y una factura que vence en 3 días abre el panel, ve esos tres pendientes con acceso directo y, al aprobar una solicitud, el contador baja sin recargar la página.

**Escenarios de Aceptación**:

1. **Dado** un usuario con un rol activo, **cuando** abre el panel de inicio, **entonces** ve solo los pendientes e indicadores que corresponden a su rol según FR-035, con su contador y un acceso directo a cada registro. Las acciones rápidas son botones ubicados en la sección "Acciones rápidas" del panel, etiquetados con una descripción legible para el usuario (p. ej., "Crear solicitud de compra") y nunca con el identificador interno del permiso (p. ej., `crear_solicitud`), que abren la vista destino con el filtro ya aplicado.
2. **Dada** una factura no aprobada que vence en 5 días o menos, **cuando** el usuario abre el panel, **entonces** aparece una alerta destacada —bloque con borde de color de alerta, texto "Vence en N días" y enlaces al proveedor y al folio— ubicada antes de la lista de pendientes, con los días restantes.
3. **Dado** un solicitante, **cuando** revisa el panel, **entonces** solo ve sus propias solicitudes y no los pendientes de otros usuarios ni datos de otras áreas (acceso restringido).
4. **Dadas** órdenes de compra emitidas sin recepción registrada por más de 7 días, **cuando** el encargado de bodega o el comprador abre el panel, **entonces** el sistema las lista como pendientes de seguimiento.
5. **Dado** un período seleccionado (mes actual), **cuando** el panel carga, **entonces** muestra los indicadores del período que FR-035 asigna a su rol, calculados con los datos existentes.
6. **Dado** que no hay pendientes para el rol, **cuando** el usuario abre el panel, **entonces** ve un estado vacío con texto explícito y solo acciones que su rol puede ejecutar (p. ej., crear una solicitud u orden); para `bodega` y `admin_ti` el estado vacío informa que no hay pendientes y solo invita a crear una solicitud de compra, el único documento del ciclo que esos roles pueden crear.
7. **Dado** que la aplicación se abre en un navegador, **cuando** se revisan la navegación lateral y el contenido principal, **entonces** solo aparecen las vistas del módulo de Adquisiciones y Compras, agrupadas en Panel / Adquisiciones / Compras según FR-034 y filtradas por el rol activo, y no se muestran ni se puede navegar a las vistas genéricas Entidades, Documentos ni Búsqueda del template base.
8. **Dado** cada uno de los cinco roles, **cuando** abre el panel, **entonces** ve exactamente los pendientes e indicadores asignados a su rol en FR-035 y ninguno de los asignados a otros roles.
9. **Dado** un usuario de cualquiera de los cinco roles que creó solicitudes, **cuando** abre el panel, **entonces** ve el pendiente **"Mis solicitudes"** con el estado de cada una de sus solicitudes y un acceso directo, sin solicitudes de otros usuarios.

---

### Historia de Usuario 6 - Cotizaciones y comparativa side-by-side (Prioridad: P1)

**Como** Comprador, **necesito** registrar las cotizaciones de distintos proveedores para una solicitud aprobada y compararlas lado a lado, **para** elegir de forma justificada y auditable la mejor oferta antes de emitir la orden de compra.

**Por qué esta prioridad**: Es el mecanismo de control de precios y la antesala obligatoria de la OC sobre el umbral. Sin cotizaciones no se puede demostrar por qué se eligió a un proveedor. Vincula el `id_proveedor` y el `id_producto` de la solicitud y alimenta la emisión de OC de US3.

**Prueba Independiente**: Sobre una solicitud aprobada, el comprador registra tres cotizaciones de proveedores distintos, las ve comparadas lado a lado y selecciona una, dejando las demás descartadas con su motivo.

**Escenarios de Aceptación**:

1. **Dada** una solicitud `aprobada` o `en_cotizacion`, **cuando** el comprador registra una cotización de un proveedor aprobado con fecha de validez, **entonces** se guarda con precios, plazo de entrega y condición de pago; si la solicitud estaba `aprobada`, pasa a `en_cotizacion`.
2. **Dado** que ya existe una cotización para esa solicitud y proveedor, **cuando** se intenta registrar otra, **entonces** el sistema lo impide (una cotización por proveedor y solicitud) y tampoco acepta proveedores bloqueados.
3. **Dadas** varias cotizaciones, **cuando** el comprador abre la comparativa, **entonces** ve de forma side-by-side el precio, plazo de entrega, condición de pago y la evaluación promedio de cada proveedor.
4. **Dada** una solicitud cuyo monto estimado es igual o superior a `UMBRAL_COTIZACIONES` (1.000.000 CLP neto), **cuando** el comprador intenta seleccionar una cotización con menos de 3 cotizaciones `recibidas` vigentes y sin `justificacion_proveedor_unico`, **entonces** el sistema rechaza la selección hasta que se cumpla una de las dos vías.
5. **Dada** una cotización cuya `fecha_validez` ya pasó, **cuando** se intenta seleccionar, **entonces** aparece como `vencida` y no puede elegirse.
6. **Dado** que el comprador descarta una cotización, **cuando** no ingresa `motivo_descarte`, **entonces** el sistema lo exige.
7. **Dado** que se selecciona una cotización, **cuando** se guarda, **entonces** las demás quedan como no seleccionadas y solo una puede estar `seleccionada` por solicitud.

---

### Historia de Usuario 7 - Registrar y conciliar facturas (Prioridad: P2)

**Como** Comprador, **necesito** registrar la factura del proveedor y cruzarla con la Orden y lo recibido en Bodega, y **como** Jefe de Compras aprobar su pago, **para** autorizar el pago a Contabilidad solo si los montos coinciden y hacerlo en plazo.

**Por qué esta prioridad**: Cierra el ciclo de compras y prepara el pase de datos hacia el Módulo de Contabilidad.

**Prueba Independiente**: Sobre una OC recibida de 10.000 CLP neto, una factura por igual valor queda `conciliada`; una por 15.000 CLP queda `con_discrepancia`.

**Escenarios de Aceptación**:

1. **Dada** una OC con recepciones, **cuando** se registra una factura que coincide con el valor recibido, **entonces** queda `conciliada` y se calcula su fecha de vencimiento legal.
2. **Dada** una factura cuyo cobro excede la tolerancia, **cuando** se registra, **entonces** queda bloqueada en `con_discrepancia`.
3. **Dada** una factura `con_discrepancia`, **cuando** se intenta aprobarla para pago, **entonces** el sistema lo impide.
4. **Dado** un folio de factura ya registrado para ese proveedor, **cuando** se intenta ingresar nuevamente, **entonces** el sistema evita la duplicidad.
5. **Dado** un proveedor cuya cuenta bancaria cambió hace menos de 30 días, **cuando** se aprueba su factura, **entonces** el sistema emite una alerta de posible riesgo de fraude.
6. **Dada** una factura `conciliada`, **cuando** un usuario `comprador` la abre, **entonces** no dispone de la acción de aprobar el pago (exclusiva de `jefe_compras`); y **cuando** la abre un usuario `admin_ti`, **entonces** la ve en solo lectura.

---

### Historia de Usuario 8 - Catálogo de productos por proveedor (Prioridad: P2)

**Como** Comprador, **necesito** mantener por cada proveedor el catálogo de productos que ofrece, con precio de referencia y plazo de entrega, **para** cotizar más rápido y usar precios actualizados sin pedirlos por correo cada vez.

**Por qué esta prioridad**: Acelera y estandariza las cotizaciones y líneas de solicitud, pero no bloquea el ciclo de compra. Depende de que existan proveedores (US1) y productos maestros de Inventario. Vincula `id_proveedor` con `id_producto` en modo solo lectura.

**Prueba Independiente**: Un comprador agrega un producto al catálogo de un proveedor con precio y plazo, lo busca, actualiza el precio y el sistema marca como desactualizada una referencia con más de 90 días.

**Escenarios de Aceptación**:

1. **Dado** un proveedor y un producto activo, **cuando** el comprador agrega la relación, **entonces** se guarda una única entrada proveedor-producto con precio de referencia, plazo de entrega y fecha de actualización.
2. **Dado** un producto ya asociado a ese proveedor, **cuando** se intenta agregar de nuevo, **entonces** el sistema lo impide.
3. **Dado** un precio de referencia con más de 90 días desde su actualización, **cuando** se consulta el catálogo, **entonces** aparece marcado como desactualizado.
4. **Dado** que el solicitante crea una línea de solicitud, **cuando** el producto está en el catálogo, **entonces** el sistema sugiere el menor precio de referencia vigente.
5. **Dado** un producto desactivado en Inventario, **cuando** se consulta el catálogo, **entonces** no se ofrece para nuevas líneas.

---

### Historia de Usuario 9 - Evaluación de desempeño de proveedores (Prioridad: P2)

**Como** Comprador o Jefe de Compras, **necesito** evaluar el desempeño de cada proveedor por orden recibida, **para** decidir con datos a quién seguir comprando y mostrar ese historial al comparar cotizaciones.

**Por qué esta prioridad**: Convierte el histórico de órdenes en información de decisión. Depende de las recepciones de US4 y alimenta la comparativa de US6 y la ficha del proveedor de US1.

**Prueba Independiente**: Sobre una OC recibida con 6 días de atraso, el Jefe de Compras registra una evaluación, obtiene `nota_plazo = 3` y el promedio aparece en la ficha del proveedor.

**Escenarios de Aceptación**:

1. **Dada** una OC en estado `recibida_total` o `cerrada`, **cuando** el comprador o el Jefe de Compras registra una evaluación, **entonces** se guarda con sus puntajes y comentario.
2. **Dado** que ya existe una evaluación para esa OC, **cuando** se intenta registrar otra, **entonces** el sistema lo impide (una evaluación por OC).
3. **Dado** el atraso entre la fecha comprometida y la fecha de recepción, **cuando** se calcula la nota, **entonces** se aplica la escala: 0 días → 5; 1-3 → 4; 4-7 → 3; 8-14 → 2; más de 14 → 1.
4. **Dado** un proveedor con evaluaciones, **cuando** se abre su ficha o la comparativa de cotizaciones, **entonces** se muestra el promedio actualizado.
5. **Dada** una OC no recibida, **cuando** se intenta evaluar, **entonces** el sistema lo impide.

---

### Historia de Usuario 10 - Exportación de reportes en CSV (Prioridad: P3)

**Como** usuario del módulo (solicitante, comprador, Jefe de Compras, bodega o administrador), **necesito** exportar a CSV los listados de compras y proveedores que ya puedo ver, **para** compartir la información con Contabilidad o analizarla en una planilla sin pedir extracciones manuales.

**Por qué esta prioridad**: Es una salida de conveniencia sobre datos ya existentes y no bloquea el ciclo de compras. Depende de que los listados y el panel de US5 estén implementados.

**Prueba Independiente**: Un Jefe de Compras exporta el listado de órdenes del período y obtiene un archivo CSV con encabezados y una fila por OC, respetando los filtros y el rol activo.

**Escenarios de Aceptación**:

1. **Dado** un listado visible para el rol, **cuando** se elige exportar, **entonces** se descarga un CSV con encabezados y una fila por registro del filtro vigente.
2. **Dado** un usuario con rol `solicitante`, **cuando** exporta solicitudes, **entonces** el CSV contiene solo sus propias solicitudes.
3. **Dado** un listado sin registros, **cuando** se exporta, **entonces** se genera un CSV solo con encabezados o se avisa que no hay datos, sin error.
4. **Dado** un dato con coma, comillas o salto de línea, **cuando** se exporta, **entonces** el CSV lo escapa correctamente.
5. **Dado** un usuario sin permiso para ver un listado, **cuando** intenta exportarlo, **entonces** la opción no está disponible.
6. **Dado** un listado exportado, **cuando** se abre en una planilla de cálculo, **entonces** el archivo usa la codificación y el separador definidos en [plan.md](plan.md) y muestra correctamente tildes, eñes y símbolos del español.

---

### Historia de Usuario 11 - Registrar devoluciones y notas de crédito (Prioridad: P2)

**Como** Encargado de Bodega, **necesito** registrar devoluciones contra una Orden de Compra ya recibida y facturada, y **como** Jefe de Compras aprobarlas, **para** descontar de lo facturado aquello que no cumple y no pagar de más al proveedor.

**Por qué esta prioridad**: Cierra el hueco entre la recepción (US4) y la conciliación de facturas (US7). El caso límite de la nota de crédito no tiene flujo definido; sin esta historia, una devolución posterior a la recepción no se refleja en el saldo por pagar. Depende de que existan OC con recepciones y facturas registradas.

**Prueba Independiente**: Sobre una OC `recibida_total` facturada por 100.000 CLP neto, se registra una devolución de 20.000 CLP por defectuosos; el saldo facturado pendiente baja a 80.000 CLP y una factura posterior por ese monto queda `conciliada`.

**Escenarios de Aceptación**:

1. **Dada** una OC con unidades aceptadas, **cuando** bodega registra una devolución indicando línea, cantidad y motivo, **entonces** el sistema genera un documento con correlativo `DEV-AAAA-NNNN` y descuenta la cantidad del saldo recibido y facturado.
2. **Dada** una línea con unidades ya devueltas, **cuando** se intenta devolver más de lo aceptado pendiente de devolver, **entonces** el sistema lo impide; el saldo pendiente se calcula como valor recibido menos facturas, notas de crédito y devoluciones aprobadas.
3. **Dada** una factura ya registrada, **cuando** se ingresa una nota de crédito del mismo proveedor, **entonces** se descuenta del monto facturado y no se permite que el crédito supere dicho monto.
4. **Dada** una nota de crédito sin OC o sin factura asociada, **cuando** se intenta registrar, **entonces** el sistema lo impide y exige el documento de origen.
5. **Dado** un folio de nota de crédito ya registrado para ese proveedor, **cuando** se intenta ingresar nuevamente, **entonces** el sistema evita la duplicidad.
6. **Dado** que una devolución reduce el saldo pendiente a cero, **cuando** se aprueba, **entonces** la OC queda `cerrada`, sus facturas se marcan como `saldada=true` sin pasar a `aprobada_pago` por el monto descontado, y una factura ya aprobada registra `credito_a_favor`.
7. **Dado** que quien registró una recepción intenta registrar la devolución de esa OC, **cuando** se guarda, **entonces** queda `pendiente_aprobacion` y solo la aprueba un `jefe_compras` distinto de quien registró la devolución y que tampoco haya registrado la recepción asociada; un aprobador que no cumpla es rechazado (segregación de funciones).
8. **Dada** una OC con unidades aceptadas y facturadas, **cuando** el daño se detecta después de la aceptación, **entonces** bodega registra una devolución con motivo `defectuoso` que descuenta la cantidad del saldo recibido y del monto facturado.
9. **Dada** una devolución con motivo `defectuoso` registrada, **cuando** se consulta el saldo pendiente, **entonces** el saldo recibido y facturado refleja el descuento y no se factura ni paga lo devuelto.

---

### Historia de Usuario 12 - Navegación y visibilidad por rol (Prioridad: P1)

**Como** usuario del módulo (cualquiera de los cinco roles), **necesito** ver en la navegación y en cada vista solo lo que mi rol puede operar o consultar, **para** encontrar mi trabajo sin recorrer vistas ajenas, no ver acciones que no me corresponden y respetar la segregación de funciones.

**Por qué esta prioridad**: Es el control de acceso visible del módulo. Sin él, roles como `admin_ti` pueden operar el ciclo de compras y se rompe la segregación de funciones (regla 8); además la navegación mezcla vistas que el rol no usa.

**Prueba Independiente**: Se recorre la aplicación con cada uno de los cinco roles y se comprueba, vista por vista, que la barra lateral, las acciones disponibles y los registros visibles coinciden con la matriz de visibilidad (FR-033).

**Escenarios de Aceptación**:

1. **Dado** un rol activo, **cuando** el usuario abre la aplicación, **entonces** la barra lateral muestra Panel y los grupos Adquisiciones y Compras solo con las vistas que la matriz marca como ✏️ o 👁️ para ese rol; un grupo sin vistas visibles no aparece.
2. **Dado** un rol con 👁️ sobre una vista, **cuando** la abre, **entonces** ve y puede exportar los registros, pero no dispone de acciones para crear, editar, aprobar ni anular.
3. **Dado** un rol con — sobre una vista, **cuando** intenta llegar a ella mediante un enlace interno, una acción rápida o la cadena documental, **entonces** el sistema no la muestra e informa que su rol no tiene acceso.
4. **Dado** un usuario `solicitante`, **cuando** abre Órdenes de compra o Recepciones, **entonces** ve solo las originadas en sus propias solicitudes.
5. **Dado** un usuario `admin_ti`, **cuando** recorre el módulo, **entonces** solo puede editar datos bancarios, desbloquear proveedores, consultar y exportar la trazabilidad y crear y editar sus propias solicitudes; todo lo demás lo ve en solo lectura.
6. **Dado** un documento con historial, **cuando** lo abre un usuario `solicitante`, `comprador` o `bodega`, **entonces** no ve el historial de eventos; **cuando** lo abre un `jefe_compras`, **entonces** lo consulta sin poder exportarlo; y **cuando** lo abre un `admin_ti`, **entonces** lo consulta y puede exportarlo.
7. **Dada** cualquier vista del módulo, **cuando** el usuario la abre, **entonces** el encabezado muestra la sección actual (p. ej., "Compras › Órdenes de compra").
8. **Dado** el panel de inicio, **cuando** se muestran las acciones rápidas, **entonces** cada una tiene una descripción legible para el usuario y ninguna muestra el identificador interno del permiso.
9. **Dada** una sesión iniciada, **cuando** el usuario revisa la pantalla, **entonces** no aparece la tarjeta "Sesión activa"; la barra superior muestra indicador de sesión y **Cerrar sesión**, sin control de cambio de rol para ningún rol.
10. **Dada** una sesión iniciada, **cuando** el usuario busca cómo usar otro rol, **entonces** no existe un selector para cambiarlo; debe cerrar sesión e ingresar de nuevo con el otro rol, y la aplicación abre el Panel de ese rol (FR-037).

---

### Historia de Usuario 13 - Administrar usuarios con consentimiento OTP y auditoría forense (Prioridad: P1)

**Como** Administrador TI, **necesito** consultar el padrón completo de usuarios, suspender o reactivar cuentas y modificar sus datos personales y los parámetros del módulo solo después de obtener el consentimiento verificable del titular, **para** cumplir la Ley 19.628 sin impedir la administración y dejar evidencia forense de cada cambio.

**Por qué esta prioridad**: `admin_ti` necesita ver el RUT completo para administrar cuentas, pero ese acceso no habilita la modificación silenciosa de datos personales. La verificación OTP y el registro forense convierten una operación sensible en una acción consentida, auditable y reversible en su seguimiento, sin depender de un servidor de correo en la demostración.

**Prueba Independiente**: Se ingresa como `admin_ti`, se abre el Padrón de Usuarios, se intenta editar un usuario sin OTP (debe estar bloqueado), se solicita el código, se comprueba la notificación interna y la ayuda de Modo Demo, se valida un código erróneo y luego uno vigente, se editan los datos con un RUT inválido y luego válido, se suspende y reactiva una cuenta, se cambia el umbral y se revisa el Log de Auditoría Forense.

**Escenarios de Aceptación**:

1. **Dado** un usuario `admin_ti` en su panel, **cuando** abre el Padrón de Usuarios, **entonces** ve siete filas con Nombre, Rol, RUT completo, Correo corporativo, Centro de costo, Estado y Acciones, y cada nombre es un hipervínculo azul `#2F81F7` con subrayado al hover que abre el modal de detalle.
2. **Dado** el modal de detalle de otro usuario, **cuando** se abre, **entonces** Nombre, Correo corporativo, RUT, Rol y Centro de costo están deshabilitados en solo lectura y el guardado está inactivo.
3. **Dado** el modal bloqueado, **cuando** `admin_ti` pulsa **Solicitar autorización del titular (Código OTP)**, **entonces** se genera un código aleatorio de 6 dígitos con expiración, se crea una notificación interna dirigida al usuario titular y, solo en Modo Demo, se muestra una ayuda visual con el código generado.
4. **Dado** un código OTP incorrecto, expirado o ya usado, **cuando** se valida, **entonces** se rechaza con un mensaje junto al campo y los campos siguen bloqueados.
5. **Dado** un código OTP vigente, **cuando** se valida, **entonces** se habilitan los campos y el guardado, y el código queda inutilizado para nuevas ediciones.
6. **Dado** el formulario habilitado, **cuando** se guarda con un RUT que no pasa Módulo 11 o un correo sin formato corporativo, **entonces** se rechaza el cambio con el error junto al campo y el registro original permanece intacto.
7. **Dado** un cambio guardado correctamente, **cuando** se consulta el Log de Auditoría Forense, **entonces** aparece un registro inmutable con actor, usuario afectado, campos modificados con valores anterior y nuevo, timestamp y resultado de la validación OTP.
8. **Dado** un usuario activo, **cuando** `admin_ti` lo suspende, **entonces** su estado cambia a `Suspendido`, no puede iniciar sesión y una sesión abierta suya se cierra; **cuando** se reactiva, **entonces** puede volver a ingresar.
9. **Dado** `admin_ti`, **cuando** intenta suspender su propia cuenta o la del único `admin_ti` activo, **entonces** la operación se rechaza y el padrón queda sin cambios.
10. **Dado** un cambio de umbral de cotizaciones o tolerancia de conciliación, **cuando** se valida el OTP y se guarda un valor numérico positivo, **entonces** las reglas de negocio lo aplican de inmediato, el valor persiste entre sesiones y el cambio queda en el Log de Auditoría Forense.
11. **Dado** un registro de discrepancia o un proveedor bloqueado, **cuando** `admin_ti` solicita el desbloqueo de la excepción y valida un OTP vigente, **entonces** la operación se aplica y queda registrada en la auditoría forense.

---

### Casos Límite

**Privacidad y enmascaramiento**

- ¿Qué pasa si un listado, una aprobación o un CSV muestra el RUT personal de otro empleado? Se muestra `••••••••-•` para `solicitante`, `comprador` y `bodega`; `jefe_compras` solo lo ve parcial (`18.XXX.XXX-5`) en auditoría; `admin_ti` lo ve completo; cada usuario ve el suyo sin enmascarar (FR-004).
- ¿Qué pasa si un proveedor es persona natural o jurídica? La distinción ya no cambia la regla: el RUT tributario es completo para `comprador`, `jefe_compras` y `admin_ti`, visible para `bodega` solo en recepciones y guías de despacho, y `••••••••-•` para `solicitante` en ficha, listados, comparativa, panel y exportaciones (FR-004, FR-025).
- ¿Qué pasa si el número de cuenta tiene 4 dígitos o menos? Para `comprador` se conservan solo los últimos 2 (`**34`, `*23`, `**`); para `solicitante` y `bodega` no se muestra ningún dígito; para `jefe_compras` y `admin_ti` se muestra completo.
- ¿Qué pasa si el proveedor no tiene datos bancarios registrados? `cuenta_visible` es "No registrado" para todos los roles que acceden a la ficha. Si existe cuenta pero el rol no tiene acceso, `cuenta_visible` es "No disponible" para `solicitante` y `bodega`, y esos roles no reciben `banco`, `tipo_cuenta`, `numero_cuenta` ni `fecha_cambio_cuenta`; `comprador` recibe solo `numero_cuenta` enmascarada.
- ¿Qué pasa si `jefe_compras` intenta editar los datos bancarios? El sistema lo impide aunque pueda verlos completos; solo `admin_ti` puede editarlos y cada cambio actualiza `fecha_cambio_cuenta`.
- ¿Qué pasa si un rol sin permiso intenta ver, editar o exportar datos sensibles? La operación se rechaza y la exportación CSV contiene solo la representación autorizada por la matriz (`••••••••-•`, `****XXXX` o ausencia del campo), nunca el valor completo.
- ¿Qué pasa si un rol sin permiso intenta recuperar el valor por canales indirectos (tooltips, mensajes de error, historial de trazabilidad FR-027 a FR-030, HTML, respuestas del asistente o almacenamiento del navegador)? El enmascaramiento se aplica en el origen, de modo que el valor completo no llega a ese rol.
- ¿Qué pasa si un rol sin permiso busca por RUT o cuenta completa? La búsqueda por RUT tributario solo está disponible para `comprador`, `jefe_compras`, `admin_ti` y para `bodega` en recepciones; el resultado nunca confirma dígitos fuera de la representación autorizada.
- ¿Qué pasa si se cierra sesión y se ingresa con otro usuario o rol? El rol no cambia dentro de una sesión (FR-037); al ingresar de nuevo la matriz se recalcula para el nuevo rol y no quedan valores completos visibles de la sesión anterior.
- ¿Qué pasa si la cuenta cambió hace menos de 30 días y se aprueba una factura? La alerta de fraude muestra solo la representación autorizada (`****XXXX` para `comprador`, sin cuenta para `solicitante` y `bodega`) y la fecha del cambio, nunca el número completo.
- ¿Qué pasa si los datos semilla incluyen proveedores, contactos o cuentas? Todos son ficticios; no se usan RUT, nombres, correos, teléfonos ni cuentas de personas o empresas reales.

**Operación y datos**

- ¿Qué pasa si se anula una OC con cotización seleccionada? La cotización sigue `seleccionada` y puede generar una nueva OC.
- ¿Qué pasa si llega una nota de crédito? Se registra contra la misma OC y descuenta del monto facturado.
- ¿Qué pasa si el proveedor entrega más de lo pedido? Solo se acepta hasta lo pendiente; el excedente se registra como rechazado con motivo `no_corresponde`.
- ¿Qué pasa si un producto se desactiva con solicitudes abiertas? Las solicitudes existentes se mantienen; no se puede agregar a solicitudes nuevas.
- ¿Qué pasa si se bloquea un proveedor con OC abiertas? Las OC abiertas siguen su curso; no se le pueden emitir nuevas.
- ¿Qué pasa si `localStorage` está lleno o deshabilitado? La aplicación muestra un mensaje específico que identifica el error de almacenamiento y no pierde lo que el usuario tenía en pantalla.

**Productos dañados**

- ¿Qué pasa si toda la entrega llega dañada? Se registra el 100 % de las unidades como rechazadas con motivo `danado`, la OC mantiene el saldo pendiente para reposición y el valor a facturar de esa entrega es cero.
- ¿Qué pasa si el daño se detecta con la factura ya aprobada para pago? Se registra una devolución con motivo `defectuoso` que descuenta el saldo recibido y facturado; el monto aprobado para pago se ajusta y la diferencia queda como crédito a favor o pendiente de nota de crédito, sin pagar lo dañado.
- ¿Qué pasa si el proveedor no repone lo dañado? La OC se cierra con saldo pendiente, dejando registrada la cantidad no repuesta, y no se factura ni paga lo dañado.

**Permisos y navegación**

- ¿Qué pasa si se intenta cambiar de rol con la sesión iniciada? No es posible: la barra superior solo muestra el usuario y el rol actuales, y `setRolActivo()` no modifica el rol de una sesión iniciada. Para usar otro rol se cierra sesión y se ingresa de nuevo; la aplicación abre el Panel del nuevo rol (FR-034, FR-037).
- ¿Qué pasa si quien crea la solicitud es `jefe_compras`? No puede aprobarla ni rechazarla; debe hacerlo otro usuario `jefe_compras`. La semilla incluye un segundo usuario `jefe_compras` para que el caso pueda demostrarse (FR-006, regla 8).
- ¿Qué pasa si quien crea la solicitud es `comprador`, `bodega` o `admin_ti`? Solo puede crearla, editarla mientras esté en `borrador` y enviarla; la aprueba un `jefe_compras` y los demás pasos del ciclo siguen la matriz (FR-033).
- ¿Qué pasa si una acción rápida apunta a una vista o acción que el rol no tiene? La acción rápida no se muestra.
- ¿Qué pasa con documentos emitidos por `admin_ti` antes de este rediseño (datos semilla o historial)? Se conservan con el `rol_usuario` registrado en su momento, y la regla 8 se les aplica igual: quien emitió una OC no puede registrar su recepción.

## Requisitos _(obligatorio)_

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir crear, editar, buscar y cambiar de estado proveedores, validando RUT (formato y dígito verificador) y su unicidad.
- **FR-002**: El sistema DEBE impedir una condición de pago mayor a 30 días si el proveedor no tiene registrado un acuerdo de plazo mayor (Ley 21.131).
- **FR-003**: El sistema DEBE impedir eliminar proveedores con órdenes de compra; en su lugar DEBE permitir bloquearlos.
- **FR-004**: El sistema DEBE aplicar la matriz unificada de `src/compras/visibilidad.js`: (1) **RUT personal de empleados**: completo solo para `admin_ti`; parcial (`18.XXX.XXX-5`) para `jefe_compras` únicamente en auditoría; oculto (`••••••••-•`) para `solicitante`, `comprador` y `bodega` cuando es ajeno; cada usuario ve el propio. (2) **RUT tributario de proveedores**: completo para `comprador`, `jefe_compras` y `admin_ti`; visible para `bodega` solo en recepciones y guías de despacho; oculto para `solicitante`. (3) **Cuentas bancarias**: completas para `jefe_compras` y `admin_ti`; `****XXXX` para `comprador`; sin dígitos para `solicitante` y `bodega`. Los campos `banco`, `tipo_cuenta`, `numero_cuenta` y `fecha_cambio_cuenta` no se entregan a `solicitante` ni `bodega`; `comprador` recibe solo `numero_cuenta` enmascarada. Solo `admin_ti` puede editar los datos bancarios y desbloquear proveedores; cada cambio bancario actualiza `fecha_cambio_cuenta`. `admin_ti` es el administrador del sistema: no emite OC, no registra recepciones ni aprueba solicitudes, pagos ni devoluciones, y ve el resto del módulo en solo lectura, salvo sus propias solicitudes, que crea y edita como cualquier rol (FR-005, FR-033). La aplicación de la matriz en todos los canales se rige por FR-025 y su registro por FR-030.
- **FR-005**: El sistema DEBE permitir crear solicitudes de compra con una o más líneas y numeración correlativa `SC-AAAA-NNNN` a usuarios de los cinco roles (`solicitante`, `comprador`, `jefe_compras`, `bodega` y `admin_ti`). Cada usuario DEBE poder editar solo sus propias solicitudes; `solicitante` y `bodega` DEBEN ver solo las suyas, y `comprador`, `jefe_compras` y `admin_ti` ven además las ajenas según la matriz (FR-033).
- **FR-006**: El sistema DEBE permitir aprobar o rechazar solicitudes solo a un usuario `jefe_compras` distinto del solicitante, DEBE impedir que un usuario apruebe su propia solicitud y DEBE exigir motivo al rechazar. Si el solicitante es `jefe_compras`, la solicitud DEBE aprobarla o rechazarla otro usuario `jefe_compras`; los datos semilla DEBEN incluir dos usuarios `jefe_compras` para demostrarlo.
- **FR-007**: El sistema DEBE permitir registrar cotizaciones solo para solicitudes `aprobada` o `en_cotizacion`, con proveedores aprobados, fecha de validez obligatoria y una cotización por proveedor y solicitud. La primera cotización mueve la solicitud de `aprobada` a `en_cotizacion`.
  - **Escenarios verificables (US6, 1/2/4)**: (a) dada una solicitud `aprobada`, al registrar una cotización válida se guarda y la solicitud pasa a `en_cotizacion`; (b) dada una cotización existente para el mismo par solicitud/proveedor, al intentar otra se rechaza; (c) dada una solicitud con monto estimado ≥ `UMBRAL_COTIZACIONES`, al seleccionar con menos de tres cotizaciones vigentes y sin justificación de proveedor único se rechaza.
- **FR-008**: El sistema DEBE exigir al menos 3 cotizaciones, o una justificación de proveedor único, para seleccionar una cotización en solicitudes cuyo monto estimado iguale o supere UMBRAL_COTIZACIONES.
- **FR-009**: El sistema DEBE exigir motivo al descartar una cotización y DEBE marcar como vencidas las cotizaciones cuya fecha de validez pasó.
- **FR-010**: El sistema DEBE emitir órdenes de compra solo para solicitudes aprobadas y proveedores aprobados, copiando líneas y precios desde la cotización seleccionada cuando exista.
- **FR-011**: El sistema DEBE impedir más de una orden de compra no anulada por solicitud y más de una orden de compra no anulada por cotización; una OC directa solo se permite bajo `UMBRAL_COTIZACIONES`. Al anular una OC sin recepciones, la solicitud vuelve a `en_cotizacion` si tiene cotizaciones o a `aprobada` si no las tiene, y puede reemitirse.
  - **Escenarios verificables (US3, 2/4/5/6)**: (a) dada una solicitud ≥ `UMBRAL_COTIZACIONES`, la emisión directa sin cotización seleccionada se rechaza; (b) dada una cotización ya convertida en OC no anulada, la segunda OC desde esa cotización se rechaza; (c) dada una solicitud con OC no anulada, otra OC para la misma solicitud se rechaza; (d) dada una OC `emitida` sin recepciones, su anulación con motivo permite reemitir.
- **FR-012**: El sistema DEBE calcular subtotales, neto, IVA (19 %) y total en CLP enteros.
- **FR-013**: El sistema DEBE registrar recepciones parciales por línea, impedir aceptar más de lo pendiente y actualizar el estado de la orden automáticamente.
- **FR-014**: El sistema DEBE impedir que quien emitió una orden registre su recepción, sin excepciones para ningún rol (regla 8).
- **FR-015**: El sistema DEBE registrar facturas y notas de crédito solo contra órdenes con recepciones, con folio único por proveedor y tipo de documento.
- **FR-016**: El sistema DEBE conciliar cada factura contra el valor recibido pendiente de facturar y clasificarla como `conciliada` o `con_discrepancia` según TOLERANCIA_CONCILIACION.
- **FR-017**: El sistema DEBE calcular la `fecha_vencimiento` de cada factura desde su `fecha_recepcion` (fecha de recepción del documento, registrada al crear la factura) aplicando la condición de pago de la orden de compra de origen, y DEBE alertar las facturas no aprobadas que vencen en 5 días o menos.
- **FR-018**: El sistema DEBE mostrar un panel de inicio con acciones rápidas, pendientes por rol, alertas e indicadores del período, según FR-035 (contenido por rol) y FR-036 (presentación).
- **FR-019**: El sistema DEBE permitir una evaluación por orden recibida, calculando la nota de plazo a partir de las fechas.
- **FR-020**: El sistema DEBE funcionar con datos semilla completamente ficticios.
- **FR-021**: El sistema DEBE usar `UMBRAL_COTIZACIONES = 1.000.000 CLP neto` para exigir tres cotizaciones o una justificación de proveedor único.
- **FR-022**: El sistema DEBE usar `TOLERANCIA_CONCILIACION = 1 % del neto` de la factura; una diferencia dentro de ese margen se clasifica como `conciliada` y por sobre él como `con_discrepancia`.
- **FR-023**: El sistema DEBE mantener un catálogo proveedor-producto único por par, con precio de referencia, plazo de entrega y fecha de actualización; DEBE marcar como desactualizados los precios con más de 90 días y sugerir el menor precio vigente al crear líneas de solicitud.
- **FR-024**: El sistema DEBE permitir exportar a CSV los listados y reportes que cada rol ya puede ver, usando UTF-8 con BOM y separador `;` (definidos en [plan.md](plan.md) y [contracts/exportacion-e-integracion.md](contracts/exportacion-e-integracion.md)), respetando los filtros y permisos del rol activo, con escapado correcto de comas, comillas y saltos de línea. La exportación de historial genera `trazabilidad.csv` y solo está disponible para `admin_ti`.
- **FR-025**: El sistema DEBE aplicar la matriz de `visibilidad.js` en el origen de los datos a RUT personales de empleados, RUT tributarios de proveedores y números de cuenta, de modo que cada rol reciba solo la representación autorizada en vistas, modales, búsquedas, tooltips, mensajes de error, historial, auditoría, respuestas del asistente y CSV. Ningún rol sin permiso DEBE recibir el valor completo ni una máscara que confirme dígitos no autorizados.
- **FR-026**: El sistema DEBE permitir registrar unidades dañadas en la recepción como rechazadas con motivo `danado`, de modo que no cuenten como recibidas ni entren al valor a facturar y queden pendientes en la OC para reposición. Cuando el daño se detecte después de aceptar, DEBE registrar una devolución con motivo `defectuoso` conforme a FR-031, que descuente el saldo recibido y facturado.
- **FR-027**: El sistema DEBE registrar, para todo cambio de estado de solicitud, cotización, orden de compra, recepción, factura y devolución, quién lo realizó, cuándo ocurrió y qué acción se ejecutó.
- **FR-028**: El sistema DEBE permitir navegar, desde cualquier documento, la cadena completa solicitud, cotización, orden de compra, recepción, factura y devolución.
- **FR-029**: El sistema DEBE impedir la eliminación de documentos con historial y DEBE permitir solo su anulación con motivo registrado.
- **FR-030**: El sistema DEBE registrar cada cambio de datos bancarios con la representación autorizada por la matriz (`****XXXX` para `comprador`, sin cuenta para `solicitante` y `bodega`), nunca con el número completo.
- **FR-031**: El sistema DEBE permitir registrar devoluciones de unidades aceptadas contra una OC con recepciones, indicando línea, cantidad y motivo, con correlativo `DEV-AAAA-NNNN`; DEBE impedir devolver más de lo aceptado pendiente de devolver, descontar la cantidad del saldo recibido y facturado, cerrar la OC cuando el saldo pendiente llegue a cero y marcar sus facturas como `saldada=true` sin promoverlas a `aprobada_pago` por el monto descontado (una factura ya aprobada registra `credito_a_favor`). Si quien registró una recepción intenta registrar la devolución, DEBE dejarla `pendiente_aprobacion` y exigir la aprobación de un `jefe_compras` distinto de quien registró la devolución y que tampoco haya registrado la recepción asociada. El saldo pendiente es valor recibido menos facturas, notas de crédito y devoluciones aprobadas.
  - **Escenarios verificables (US11, 1/2/6/7)**: (a) dada una OC recibida, una devolución válida descuenta el saldo y genera `DEV-AAAA-NNNN`; (b) dada una línea con devoluciones previas, exceder lo aceptado pendiente se rechaza; (c) dado saldo pendiente en cero, la OC pasa a `cerrada` y las facturas quedan `saldada=true`; (d) dado un registrador que también recepcionó, la devolución queda pendiente y un aprobador que no sea `jefe_compras` distinto y no receptor es rechazado.
- **FR-032**: La aplicación DEBE mostrar exclusivamente las vistas del módulo de Adquisiciones y Compras (Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones). NO DEBE mostrar, enlazar desde la navegación ni permitir acceder mediante acciones internas a las vistas genéricas del template base (Entidades, Documentos y Búsqueda). Las vistas se agrupan según FR-034.
- **FR-033**: El sistema DEBE aplicar la [Matriz de visibilidad por rol](#matriz-de-visibilidad-por-rol-fr-033) a cada vista y acción: ✏️ significa que el rol opera (con el alcance indicado en la celda); 👁️, que solo ve y exporta lo visible, sin crear, editar, aprobar ni anular; —, que la vista no aparece ni es accesible por ningún enlace, acción rápida o cadena documental. La restricción DEBE validarse tanto en la interfaz como en cada operación.
- **FR-034**: La barra lateral DEBE organizarse en Panel / **Adquisiciones** (Proveedores, Catálogo, Evaluaciones) / **Compras** (Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones), según data-model §1. Cada rol DEBE ver solo las vistas que la matriz (FR-033) le asigna como ✏️ o 👁️; un grupo sin vistas visibles NO DEBE mostrarse. Como el rol queda fijo durante la sesión (FR-037), la navegación NO DEBE cambiar de rol en vivo: para usar otro rol se cierra sesión y se ingresa de nuevo, y al ingresar la aplicación DEBE abrir el Panel del rol con su barra lateral.
- **FR-035**: El panel de inicio DEBE mostrar a cada rol solo los pendientes e indicadores siguientes (los indicadores se calculan según data-model §8):

  | Rol            | Pendientes                                                                                                           | Indicadores                                          |
  | -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
  | `solicitante`  | Mis solicitudes                                                                                                      | —                                                    |
  | `comprador`    | Mis solicitudes; solicitudes aprobadas sin cotizar, OC sin recepción, facturas con discrepancia                      | Facturas con discrepancia                            |
  | `jefe_compras` | Mis solicitudes; aprobaciones pendientes: solicitudes de otros usuarios por aprobar, facturas conciliadas por aprobar pago y devoluciones por aprobar | Gasto del período, Facturas en riesgo de pago tardío |
  | `bodega`       | Mis solicitudes; OC esperando entrega, recepciones parciales                                                         | Tasa de rechazo en recepción                         |
  | `admin_ti`     | Mis solicitudes; cambios bancarios de los últimos 30 días, alertas de fraude (facturas no aprobadas de proveedores con cambio de cuenta hace menos de 30 días) | —                                                    |

   **Mis solicitudes** aparece en el panel de los cinco roles y muestra el estado de las solicitudes creadas por el usuario de la sesión, con acceso directo a cada una; nunca incluye solicitudes de otros usuarios. La alerta de vencimiento de FR-017 se muestra solo a los roles con acceso a Facturas.

   **Estado 2026-11-25**: implementado para los cinco roles en `src/compras/panel.js` y verificado en `tests/integration/compras/catalogo-panel.test.js` (T137 y T139 cerrados).
- **FR-036**: La interfaz DEBE: (a) mostrar en cada acción rápida una descripción legible para el usuario y nunca el identificador interno del permiso; (b) no mostrar la tarjeta "Sesión activa", ya que el usuario y el rol se ven en el indicador de sesión de la barra superior (FR-037); (c) mostrar en el encabezado la sección actual (grupo y vista). **Estado 2026-11-25**: (a), (b) y (c) implementados y verificados en la interfaz; la validación por matriz FR-033 quedó completada con T127 y T137 (ver estado de fases).
- **FR-037**: El sistema DEBE mostrar un portal de inicio de sesión centralizado en `src/compras/autenticacion.js` con un único conmutador **Modo Demo** / **Modo Real**. **Modo Demo**: carga las 12 colecciones de `semilla.json` y permite revelar el directorio de acceso rápido de un clic con los 7 usuarios (`u-solicitante-1`, `u-solicitante-2`, `u-comprador-1`, `u-jefe-1`, `u-jefe-2`, `u-bodega-1`, `u-admin-1`) mediante el botón **Activar modo presentación**; al volver al ingreso el directorio queda oculto de nuevo. **Modo Real**: el directorio permanece oculto aunque el modo presentación esté activo, se exige un identificador (correo corporativo **o** RUT chileno validado con Módulo 11) y contraseña válida, y las colecciones transaccionales se inician vacías conservando los catálogos base, sin mezclar datos con el Modo Demo. La clave genérica única (`Compras2026`) permite ingresar con cualquier usuario semilla; la pantalla no valida identidad real. El nombre se solicita al ingresar solo a `solicitante`, `comprador` y `jefe_compras` —este último para distinguir a los dos usuarios `jefe_compras` de la semilla—; `bodega` y `admin_ti` ingresan identificados solo por su rol. La identidad se resuelve desde el identificador escrito o desde la entrada elegida del directorio. Un usuario suspendido NO DEBE poder iniciar sesión. Al iniciar sesión, el rol DEBE quedar fijo para los cinco roles: indicador de sesión con usuario, rol y centro de costo, una etiqueta informativa de solo lectura en el encabezado que indica el rol activo y, cuando el rol es `admin_ti`, el acceso de gobernanza («Control de roles: administrador TI»), sin selector editable en vivo, y **Cerrar sesión**, y `setRolActivo()` NO DEBE cambiar el rol de una sesión iniciada. No existe control para cambiar de rol en vivo; para usar otro rol se cierra sesión y se ingresa de nuevo.
- **FR-038**: El formulario de Datos Bancarios DEBE ofrecer `Banco *` como lista desplegable con exactamente `BancoEstado`, `Banco de Chile`, `Banco Santander Chile`, `Banco BCI`, `Scotiabank Chile`, `Banco Itaú Chile`, `Banco BICE`, `Banco Security`, `Banco Falabella`, `Banco Ripley`, `Banco Consorcio` y `Coopeuch / Tenpo / Mercado Pago (Prepago)`. El campo `Tipo de cuenta` DEBE ofrecer como lista desplegable exactamente `Cuenta Corriente`, `Cuenta Vista / Chequera Electrónica`, `CuentaRUT (BancoEstado)`, `Cuenta de Ahorro` y `Cuenta Prepago`. Los alias históricos DEBEN normalizarse al nombre canónico y los valores fuera del catálogo DEBEN rechazarse.
- **FR-039**: Al seleccionar `CuentaRUT (BancoEstado)` con un proveedor elegido, el sistema DEBE fijar el banco en `BancoEstado`, auto-rellenar `Número de cuenta *` con el cuerpo numérico del RUT del proveedor sin puntos ni dígito verificador y mostrar el texto `Auto-completado desde el RUT del proveedor sin dígito verificador`. El número DEBE seguir siendo editable y `CuentaRUT (BancoEstado)` DEBE rechazarse con cualquier otro banco. Al cambiar a otro tipo de cuenta DEBE ocultarse el aviso sin borrar el número editable.
- **FR-040**: La vista Proveedores DEBE mostrar siempre el listado completo de proveedores con las columnas Razón Social, RUT tributario, Rubro, Contacto, Banco y cuenta enmascarada o visible según la matriz de FR-004, Estado legible (`Activo`, `En evaluación`, `Suspendido`) y Acciones. El dato **Contacto** se resuelve desde los campos maestros `email`/`telefono` de `PROVEEDOR` (contacto general); la entidad hija normalizada `CONTACTO_PROVEEDOR` queda fuera del MVP. El buscador superior DEBE admitir razón social, nombre de fantasía, RUT, rubro, contacto y región, tener ancho suficiente para leer su placeholder completo y sincronizar su texto con el selector `Proveedor *` del formulario de Datos Bancarios. La semilla DEBE incluir al menos ocho proveedores chilenos sintéticos y realistas (12 cargados en la semilla estándar) con razón social, nombre de fantasía, RUT válido Módulo 11, giro/rubro, correo, teléfono, dirección comercial, estado, calificación promedio y datos bancarios configurados.
- **FR-041**: En Modo Real el sistema DEBE mantener disponible el botón **Cargar catálogo base de proveedores/insumos** (o catálogos maestros precargados). Al pulsarlo DEBE completar los catálogos maestros y proveedores semilla faltantes sin sobrescribir ni eliminar los registros creados por el usuario.
- **FR-042**: El conmutador **Modo Demo / Modo Real** DEBE ser único, persistir la selección en el almacenamiento local del módulo y determinar la visibilidad del directorio: en Modo Demo el botón **Activar modo presentación** revela las credenciales de los siete usuarios para exhibirlas durante una demo; en Modo Real el directorio NO DEBE revelarse aunque se active la presentación. El campo de identificación DEBE aceptar correo corporativo o RUT chileno con dígito verificador válido (Módulo 11) y mostrar el error junto al campo cuando el identificador no corresponda a un usuario habilitado.
- **FR-043**: El panel de `admin_ti` DEBE mostrar la sección **Padrón de Usuarios · Administración TI** con los siete usuarios y las columnas Nombre, Rol, **RUT** (completo), Correo corporativo, Centro de costo, Estado y Acciones. Cada nombre DEBE ser un hipervínculo que abre el modal de detalle y edición del usuario, con estilo azul `#2F81F7` y subrayado al pasar el cursor. `admin_ti` DEBE poder suspender y reactivar cuentas; un usuario suspendido NO DEBE iniciar sesión ni conservar una sesión abierta; `admin_ti` NO DEBE suspender su propia cuenta ni dejar al sistema sin ningún `admin_ti` activo.
- **FR-044**: Al abrir la ficha de otro usuario, los campos Nombre, Correo corporativo, RUT, Rol y Centro de costo DEBEN iniciar bloqueados en solo lectura. El botón **Solicitar autorización del titular (Código OTP)** DEBE generar un código aleatorio de 6 dígitos con fecha de expiración, crear una notificación interna dirigida al usuario titular de la cuenta y, únicamente en Modo Demo, mostrar una ayuda visual con el código generado para permitir pruebas sin servidor de correo. Solo tras validar un código vigente de 6 dígitos DEBEN habilitarse la edición y el guardado; el guardado DEBE validar RUT con Módulo 11 y formato de correo corporativo, rechazando valores inválidos, duplicados o cambios sobre la propia cuenta sin autorización. Un código expirado, erróneo o reutilizado DEBE rechazarse y dejar los campos bloqueados.
- **FR-045**: El sistema DEBE mantener un **Log de Auditoría Forense** inmutable, consultable y exportable solo por `admin_ti`, que registre cada alta, edición, suspensión, reactivación y cambio de parámetros con actor, usuario afectado, campos modificados (valor anterior y nuevo en la representación autorizada por FR-004), timestamp y resultado de la validación OTP. Todo registro DEBE conservarse aun cuando el usuario sea suspendido. `admin_ti` DEBE poder desbloquear excepciones —registros de discrepancia o cuentas bloqueadas— solo después de una validación OTP vigente, con registro forense de la operación.
- **FR-046**: `admin_ti` DEBE poder parametrizar dinámicamente el umbral de cotizaciones (por defecto `1.000.000 CLP` neto) y la tolerancia de conciliación (por defecto `1 %`), previa validación OTP del titular de la solicitud de cambio. Los nuevos valores DEBEN aplicarse de inmediato a las reglas de negocio, conservarse entre sesiones, validarse como numéricos positivos y quedar registrados en el Log de Auditoría Forense.

#### Matriz de visibilidad por rol (FR-033)

Leyenda: ✏️ opera · 👁️ solo lectura · — no ve. En la fila Panel, 👁️ significa consultar el panel y usar únicamente las acciones rápidas permitidas por FR-036; no habilita operaciones sobre entidades.

| Vista              | `solicitante`                   | `comprador`                           | `jefe_compras`                       | `bodega`       | `admin_ti`                                 |
| ------------------ | ------------------------------- | ------------------------------------- | ------------------------------------ | -------------- | ------------------------------------------ |
| Panel              | 👁️                              | 👁️                                    | 👁️                                   | 👁️             | 👁️                                         |
| ------------------ | ------------------------------- | ------------------------------------- | ------------------------------------ | -------------- | ------------------------------------------ |
| Solicitudes        | ✏️ crea y ve solo propias       | ✏️ crea propias · 👁️ ajenas           | ✏️ crea propias · aprueba / rechaza ajenas | ✏️ crea y ve solo propias | ✏️ crea propias · 👁️ ajenas       |
| Cotizaciones       | —                               | ✏️                                    | 👁️                                   | —              | 👁️                                         |
| Órdenes de compra  | 👁️ las de sus solicitudes       | ✏️                                    | 👁️                                   | 👁️             | 👁️                                         |
| Recepciones        | 👁️ las de sus solicitudes       | 👁️                                    | 👁️                                   | ✏️             | 👁️                                         |
| Facturas           | —                               | ✏️ registra y concilia                | ✏️ aprueba pago                      | —              | 👁️                                         |
| Devoluciones       | —                               | 👁️                                    | ✏️ aprueba                           | ✏️ registra    | 👁️                                         |
| Proveedores        | —                               | ✏️ RUT completo · cuenta `****XXXX`   | 👁️ RUT y cuenta completos            | —              | ✏️ solo datos bancarios y desbloqueo       |
| Catálogo           | 👁️                              | ✏️                                    | 👁️                                   | —              | 👁️                                         |
| Evaluaciones       | —                               | ✏️                                    | ✏️                                   | —              | 👁️                                         |
| Trazabilidad       | —                               | —                                     | 👁️ consulta                          | —              | ✏️ consulta y exporta                      |

La matriz cubre 11 superficies: las 10 vistas navegables de FR-032 más Trazabilidad, que no es una vista de la barra lateral sino una superficie consultable desde la cadena documental (FR-028). En Solicitudes, cada usuario edita solo las solicitudes que creó; "ajenas" son las de otros usuarios. La aprobación de una solicitud creada por un `jefe_compras` corresponde a otro `jefe_compras` (FR-006). En Trazabilidad, ✏️ significa consultar y exportar: el historial es inmutable y nadie edita sus eventos. La navegación de la cadena documental se mantiene para cada rol sobre los documentos que ya puede ver; lo que se restringe es el historial de eventos. SC-015 verifica las 55 combinaciones resultantes (5 roles × 11 superficies).

### Requisitos de Integración

- **IR-001**: PRODUCTO es compartido con Inventario; Compras solo lo lee.
- **IR-002**: Las cantidades aceptadas en recepción DEBEN quedar disponibles para que Inventario actualice el stock.
- **IR-003**: Las facturas `aprobada_pago` DEBEN quedar disponibles para Contabilidad como cuentas por pagar.

### Entidades Clave

El detalle de atributos, cardinalidades y reglas está en [data-model.md](data-model.md).

- **Proveedor**: empresa o persona que vende; incluye datos tributarios, de contacto (`email`/`telefono` maestros, que alimentan la columna **Contacto**), bancarios, tamaño y estado. La semilla base tiene 12 proveedores chilenos sintéticos con RUT válido, nombre de fantasía, rubro, calificación promedio y datos bancarios del catálogo nacional.
- **Catálogo proveedor-producto**: qué ofrece cada proveedor y a qué precio de referencia.
- **Solicitud de compra**: necesidad interna aprobada; origen obligatorio de toda compra.
- **Cotización de proveedor**: oferta de un proveedor para una solicitud.
- **Orden de compra**: compromiso formal con un proveedor.
- **Recepción**: registro de lo efectivamente recibido y rechazado.
- **Factura de proveedor**: documento tributario que se concilia y se aprueba para pago.
- **Devolución**: documento `DEV-AAAA-NNNN` que devuelve unidades aceptadas de una orden de compra y descuenta el saldo recibido y facturado.
- **Producto**: bien o servicio que se compra; dato maestro compartido con Inventario, que Compras solo lee (IR-001).
- **Contacto de proveedor** (`CONTACTO_PROVEEDOR`): persona de contacto dentro de un proveedor; su gestión queda fuera del MVP (ver "Fuera de alcance"). El **Contacto** mostrado en el listado y reconocido por el buscador no proviene de esta entidad hija, sino de los campos maestros `email`/`telefono` de `PROVEEDOR`.
- **Evaluación de proveedor**: desempeño del proveedor en una orden.
- **Usuario y centro de costo**: quién opera el sistema y a qué área se imputa cada compra.
- **Historial de trazabilidad**: registro de quién, cuándo y qué acción se ejecutó sobre solicitudes, cotizaciones, órdenes de compra, recepciones, facturas y devoluciones; permite navegar la cadena documental completa y conserva las anulaciones con su motivo y los cambios bancarios con la representación autorizada por la matriz de `visibilidad.js`.


### Actualización de implementación (2026-11-24)

- **UI/UX aplicada**: jerarquía visual en KPI, acciones rápidas con descripción legible e icono, pendientes/flujo con accesos directos, tablas con contenedor responsive y badges semánticos; modo oscuro con `data-theme` y persistencia en `localStorage`; tipografía IBM Plex Sans.
- **Estándares de interfaz final**: paleta GitHub Dark `#0D1117` / `#161B22` / `#2F81F7`; barra lateral con íconos SVG lineales; Asistente IA local con guardrails RBAC y de dominio ERP.
- **Sesión**: indicador compacto de usuario/rol; rol fijo para los cinco roles durante la sesión, sin "Vista de rol".
- **Permisos base**: `crear_solicitud` habilitado para los cinco roles en `almacenamiento.js`; semilla con nombres para ambos `jefe_compras`.
- **Estado del rediseño**: la Fase 16 (FR-033/FR-034/SC-015-SC-017) está cerrada; la navegación agrupada por visibilidad y el encabezado están implementados. La restricción en operaciones no-UI (T127) y la cobertura completa de **Mis solicitudes** en el panel (T137/T139) quedan cerradas, conforme al estado canónico de las Fases 16–23 registrado en [`tasks.md`](tasks.md).
- **Actualización 2026-11-25 (Fase 22)**: catálogos bancarios y de tipos de cuenta chilenos centralizados, auto-relleno de CuentaRUT desde el RUT del proveedor, tabla de proveedores con columnas y buscador ampliados, 12 proveedores semilla completos con RUT Módulo 11 y botón de carga del catálogo base operativo en Modo Real (FR-038–FR-041, US1 escenarios 8–11).
- **Actualización 2026-11-25 (Fase 23)**: siete usuarios con nombre propio y RUT Módulo 11, conmutador Modo Demo / Modo Real con ingreso dual por correo o RUT, padrón administrable con enlaces clicables, suspensión de cuentas, consentimiento OTP del titular para editar datos y parámetros, y Log de Auditoría Forense (FR-042–FR-046, US13, SC-020–SC-023).
- **Verificación reciente**: `npx vitest run --reporter=dot`: 27 archivos aprobados y 10 omitidos, 320 pruebas aprobadas y 56 omitidas; `npm run lint`, `npm run format:check` y `npm run build` OK.

## Criterios de Éxito _(obligatorio)_

### Resultados Medibles

- **SC-001**: Un solicitante crea y envía una solicitud de 3 productos en menos de 2 minutos. Protocolo: se mide con cronómetro desde que se abre la vista Solicitudes hasta que se confirma el envío, usando datos semilla, 3 productos activos y un navegador de escritorio; la medición se registra en `quickstart.md` y se valida en la demostración de T090, no en la prueba de rendimiento de T089.
- **SC-002**: El ciclo completo (solicitud, 3 cotizaciones, OC, recepción y factura conciliada) se puede demostrar en menos de 5 minutos con datos semilla.
- **SC-003**: El 100 % de las órdenes sobre el umbral tienen 3 cotizaciones o una justificación registrada.
- **SC-004**: Ninguna recepción permite aceptar más unidades que las compradas, verificado con pruebas automatizadas.
- **SC-005**: El 100 % de las facturas que vencen en 5 días o menos sin aprobación aparecen en el panel.
- **SC-006**: Con hasta 500 registros por colección, las listas y búsquedas responden en **menos de 2 segundos**, medidos con `performance.now()` en `tests/integration/compras/rendimiento.test.js`. El umbral es medible y reproducible en la suite automatizada.
- **SC-007**: Las reglas de cálculo y de estado de la sección 5 de `data-model.md` tienen pruebas unitarias que pasan.
- **SC-008**: La exportación CSV de un listado de hasta 500 registros se completa en menos de 1 segundo y preserva los filtros y permisos del rol.
- **SC-009**: El 100 % de las combinaciones de los cinco roles con los tres datos sensibles (RUT personal de empleado ajeno, RUT tributario de proveedor y cuenta bancaria) coincide con la matriz de `visibilidad.js` en tablas, modales, búsquedas, trazabilidad, asistente y CSV: 0 % de exposición del valor completo o de dígitos no autorizados, verificado por `tests/unit/compras/visibilidad-sensible.test.js` y las pruebas de proveedores, exportación (unitaria) y asistente.
- **SC-010**: El 100 % de los archivos exportados con la codificación definida en [plan.md](plan.md) se abre en una planilla de cálculo en español sin caracteres corruptos (tildes, ñ y símbolos), verificado con datos acentuados.
- **SC-011**: El 100 % de las unidades dañadas registradas con motivo `danado` o devueltas con motivo `defectuoso` queda excluido del valor a facturar y del saldo pagado, verificado con entregas parciales, entregas totalmente dañadas y facturas ya aprobadas para pago.
- **SC-012**: El 100 % de los cambios de estado de solicitud, cotización, OC, recepción, factura y devolución registra quién, cuándo y qué acción, y desde cualquier documento se puede navegar la cadena completa sin búsquedas manuales, verificado con una prueba de auditoría de punta a punta.
- **SC-013**: El 100 % de las pantallas del módulo (Panel, Proveedores, Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones, Catálogo y Evaluaciones) tiene una etiqueta asociada a cada campo, se puede operar solo con teclado, muestra los mensajes de error junto al campo afectado y cumple un contraste mínimo de 4,5:1 en texto normal (WCAG 2.1 AA), verificado en una revisión de accesibilidad de cada pantalla.
- **SC-014**: El 100 % de la navegación y del contenido visible de la aplicación corresponde a vistas del módulo de Adquisiciones y Compras; no aparece ninguna vista genérica del template base (Entidades, Documentos o Búsqueda), verificado al abrir la aplicación y revisar la barra lateral y las acciones disponibles.
- **SC-015**: El 100 % de las 55 combinaciones rol × superficie (5 roles × 11 superficies: las 10 vistas navegables de FR-032 más Trazabilidad) se comporta según la matriz de visibilidad (FR-033): opera, solo lectura o no ve, verificado con pruebas automatizadas.
- **SC-016**: `admin_ti` no puede ejecutar ninguna de las cinco operaciones de compra que pierde (emitir OC, registrar recepciones, aprobar pagos, aprobar devoluciones y aprobar solicitudes), y ningún rol puede registrar la recepción de una OC que emitió, verificado con pruebas automatizadas.
- **SC-017**: El 0 % de las acciones rápidas muestra un identificador interno de permiso y el 100 % de las vistas muestra su sección en el encabezado, verificado al recorrer la aplicación con los cinco roles.
- **SC-018**: El 100 % de los valores de banco y tipo de cuenta persistidos pertenece al catálogo chileno de FR-038 y el 100 % de las cuentas `CuentaRUT (BancoEstado)` usa `BancoEstado` y el cuerpo numérico del RUT del proveedor cuando se auto-completan, verificado con `tests/unit/compras/catalogos-bancarios.test.js` y las pruebas de integración de proveedores y vista.
- **SC-019**: La semilla contiene 12 proveedores chilenos sintéticos con RUT válido Módulo 11 y datos completos, y el listado siempre muestra las siete columnas de FR-040 con 12 filas iniciales, verificado con `tests/integration/compras/proveedores.test.js` y `tests/integration/compras/vista.test.js`.
- **SC-020**: El 100 % de los siete usuarios semilla tiene nombre propio chileno y RUT válido Módulo 11, y el Padrón de Usuarios muestra el RUT completo sin enmascarar solo para `admin_ti`, verificado con `tests/unit/compras/usuarios.test.js` y `tests/integration/compras/usuarios.test.js`.
- **SC-021**: El 0 % de los campos personales se puede modificar sin un código OTP vigente de 6 dígitos, y el 100 % de los códigos expirados, erróneos o reutilizados se rechaza, verificado con `tests/unit/compras/otp.test.js`.
- **SC-022**: El 100 % de las altas, ediciones, suspensiones, reactivaciones, desbloqueos y cambios de parámetros queda registrado en el Log de Auditoría Forense con los seis datos exigidos por FR-045, verificado con `tests/integration/compras/auditoria-forense.test.js`.
- **SC-023**: El conmutador Modo Demo / Modo Real mantiene separados los datos de cada modo, el directorio solo se revela en Modo Demo y el 100 % de los ingresos por correo o RUT Módulo 11 válido resuelve al usuario correcto, verificado con `tests/integration/compras/autenticacion.test.js`.

## Suposiciones

- La empresa cliente es una pyme privada que recibe facturas afectas a IVA; boletas de honorarios y documentos exentos quedan fuera del MVP.
- Todos los montos están en pesos chilenos; no hay compras en moneda extranjera.
- La identidad se resuelve desde el correo corporativo o el RUT validado con Módulo 11 que escriba el usuario, o desde el directorio revelado por el modo presentación en Modo Demo (FR-037, FR-042); el rol queda fijo durante la sesión y no hay autenticación real. La clave genérica `Compras2026` está en el código y permite ingresar con cualquier usuario semilla habilitado: se acepta porque los datos son 100 % ficticios (data-model §6). El código OTP y la notificación interna son simulados y solo se muestran en Modo Demo para permitir la demostración sin servidor de correo (FR-044).
- El módulo funciona en un solo navegador con `localStorage`; no hay sincronización entre equipos.
- Productos, usuarios y centros de costo vienen como datos semilla mientras los módulos de Inventario, RR.HH. y Contabilidad no estén conectados.
- La codificación y el separador de los archivos CSV exportados son los definidos en [plan.md](plan.md); un cambio de esa codificación se realiza en el plan y no en esta especificación.
- El módulo se construye sobre el template del curso (`specs/001-erp-base-module`); ver [plan.md](plan.md).
- El permiso de solo lectura (👁️) incluye exportar a CSV lo que el rol ve (FR-024), salvo el historial de trazabilidad, que solo exporta `admin_ti`.
- El comprador puede bloquear proveedores; solo `admin_ti` puede desbloquearlos, y un proveedor desbloqueado vuelve a `aprobado`.
- Únicas excepciones documentadas a la regla 8 (además de las operaciones permitidas por la matriz FR-033): el comprador concilia facturas de OC que él mismo emitió. En una pyme se acepta como riesgo asumido, mitigado porque la recepción la registra bodega y la aprobación del pago es exclusiva de `jefe_compras` (data-model §6).
- El comprador puede cotizar y emitir la OC de una solicitud que él mismo creó. Se acepta como riesgo asumido (conflicto de interés), mitigado porque la solicitud la aprueba un `jefe_compras` distinto y todo queda en la trazabilidad (data-model §6).
- Los bancos y tipos de cuenta disponibles son los de uso corriente en Chile y se tratan como catálogo cerrado; los alias históricos de la semilla se normalizan, pero no se inventan instituciones nuevas (FR-038).
- El número de CuentaRUT derivado del RUT es un valor de ejemplo editable, no una validación bancaria real; la responsabilidad de la exactitud sigue siendo de `admin_ti` (FR-039).
