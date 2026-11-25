# Documentación del Módulo Adquisiciones y Compras

**Funcionalidad**: `002-modulo-adquisiciones-compras`  
**Alcance**: MVP 100 % frontend sobre el template del curso; persiste en `localStorage` con datos semilla ficticios.  
**MER entregable**: [`mer.svg`](mer.svg) (vectorial, fondo blanco, 12 entidades, claves y cardinalidades).

Este README reúne los entregables documentales de la pauta: ejecución y uso, perfiles y datos sensibles, decisiones metodológicas con Spec-Driven Development (SDD), escalabilidad, integraciones futuras y sesgos de datos. No modifica `src/storage.js` ni archivos compartidos de otros equipos.

---

## 1. Instrucciones de ejecución y uso

### 1.1 Requisitos previos

- Node.js y npm compatibles con las versiones declaradas en `package.json` (Vite 8 y Vitest 4).
- Navegador de escritorio moderno con `localStorage` disponible.
- No se requiere backend, base de datos ni conexión a internet después de instalar dependencias.

### 1.2 Pasos exactos

Desde la raíz del repositorio:

```bash
npm install
npm run dev
```

Vite muestra la URL local; por defecto es:

```text
http://localhost:5173
```

En la pantalla de acceso se pueden usar tres caminos:

1. **Correo corporativo**: escribir uno de los correos de la tabla siguiente y la clave genérica `Compras2026`.
2. **Directorio de acceso rápido**: pulsar la entrada del usuario deseado y usar la misma clave.
3. **Acceso por rol** (legado, conservado para la demostración): elegir el rol, escribir el nombre cuando el formulario lo pide y usar `Compras2026`. Solicitante, Comprador y Jefe de Compras piden nombre; Bodega y Administrador TI ingresan solo con el rol.

El botón **Mostrar** permite verificar la clave. **Cerrar sesión** vuelve al portal sin borrar los datos. El rol queda fijo durante toda la sesión: para probar otro rol hay que cerrar sesión e ingresar de nuevo. No existe un control para cambiar de rol en vivo.

### 1.3 Credenciales de los 7 usuarios de `semilla.json`

La clave es común para todos: **`Compras2026`**. Es una clave de demostración, no protege datos reales.

| # | ID semilla | Nombre | Correo | Rol técnico | Centro de costo | ¿Pide nombre al ingresar? |
|---|---|---|---|---|---|---|
| 1 | `u-solicitante-1` | Ana Pérez | `ana.perez@example.com` | `solicitante` | `cc-001` · `CC-ADM` Administración | Sí |
| 2 | `u-solicitante-2` | Luis Soto | `luis.soto@example.com` | `solicitante` | `cc-002` · `CC-OPE` Operaciones | Sí |
| 3 | `u-comprador-1` | Carla Díaz | `carla.diaz@example.com` | `comprador` | `cc-003` · `CC-COM` Compras | Sí |
| 4 | `u-jefe-1` | Marcela Rojas | `jefe.compras@example.com` | `jefe_compras` | `cc-003` · `CC-COM` Compras | Sí |
| 5 | `u-bodega-1` | Encargado de Bodega | `bodega@example.com` | `bodega` | `cc-004` · `CC-BOD` Bodega | No |
| 6 | `u-admin-1` | Administrador TI | `admin.ti@example.com` | `admin_ti` | `cc-003` · `CC-COM` Compras | No |
| 7 | `u-jefe-2` | Jorge Muñoz | `jorge.munoz@example.com` | `jefe_compras` | `cc-003` · `CC-COM` Compras | Sí |

Los dos usuarios `jefe_compras` existen para demostrar la segregación de funciones: un jefe no puede aprobar su propia solicitud, por lo que debe aprobarla el otro jefe.

### 1.4 Primera visita y reinicio

La primera visita carga automáticamente `src/compras/semilla.json`: 7 usuarios, 4 centros de costo, 20 productos, 8 proveedores, 10 solicitudes, 7 cotizaciones, 8 órdenes de compra, 5 recepciones, 7 documentos de facturación, 2 devoluciones, 10 referencias de catálogo y 2 evaluaciones. Las fechas se desplazan al día actual para mantener vigentes plazos y vencimientos.

Para volver al estado inicial:

1. Borrar del navegador las claves `erp_compras:*` y `erp_base_module:entities`; o
2. Con Vite abierto, ejecutar en la consola:

   ```js
   await import('/src/compras/almacenamiento.js').then((m) => m.reiniciarCompras());
   ```

3. Recargar la página.

### 1.5 Comandos de verificación

| Comando | Resultado esperado |
|---|---|
| `npm run dev` | Servidor Vite activo; portal de acceso y módulo de Adquisiciones y Compras. |
| `npm run lint` | 0 errores y 0 advertencias. |
| `npm test -- --run` | 260 pruebas aprobadas en 18 archivos y 56 omitidas (las omitidas pertenecen al template base). |
| `npm run build` | Build de producción sin errores. |
| `npm run preview` | Build servido en `http://localhost:4173`. |
| `npm run format:check` | Sin diferencias en el alcance de `.prettierignore`. |

El guion de validación paso a paso está en [`quickstart.md`](quickstart.md).

### 1.6 Recorrido mínimo de uso

1. Ingresar como **Ana Pérez** y crear/enviar una solicitud de tres líneas.
2. Cerrar sesión e ingresar como **Marcela Rojas**; aprobar la solicitud ajena.
3. Cerrar sesión e ingresar como **Carla Díaz**; registrar cotizaciones, seleccionar una y emitir la orden de compra.
4. Cerrar sesión e ingresar como **Encargado de Bodega**; registrar la recepción parcial, incluyendo una unidad dañada con motivo `danado`.
5. Cerrar sesión e ingresar como **Carla Díaz**; registrar la factura y verificar la conciliación dentro del 1 %.
6. Cerrar sesión e ingresar como **Jorge Muñoz**; aprobar el pago de la factura conciliada.
7. Abrir la tarjeta **Asistente IA de Compras** en el Panel para consultar estados o ejecutar acciones guiadas según el rol activo.

---

## 2. Perfiles de usuario, datos sensibles y riesgos

### 2.1 Modelo RBAC

La fuente de verdad es `PERMISOS` y `puede()` en `src/compras/almacenamiento.js`. La visibilidad de vistas y superficies se describe en la matriz FR-033 de [`spec.md`](spec.md); la interfaz y cada operación validan el rol de la sesión.

| Acción | Roles autorizados (`PERMISOS`) |
|---|---|
| `crear_solicitud` | `solicitante`, `comprador`, `jefe_compras`, `bodega`, `admin_ti` |
| `aprobar_solicitud` | `jefe_compras` |
| `gestionar_proveedores` | `comprador` |
| `editar_datos_bancarios` | `admin_ti` |
| `desbloquear_proveedor` | `admin_ti` |
| `emitir_oc` | `comprador` |
| `gestionar_cotizaciones` | `comprador` |
| `registrar_recepcion` | `bodega` |
| `registrar_factura` | `comprador` |
| `conciliar_factura` | `comprador` |
| `aprobar_pago` | `jefe_compras` |
| `registrar_devolucion` | `bodega` |
| `aprobar_devolucion` | `jefe_compras` |
| `gestionar_catalogo` | `comprador` |
| `evaluar_proveedor` | `comprador`, `jefe_compras` |
| `consultar_trazabilidad` | `jefe_compras`, `admin_ti` |
| `exportar_trazabilidad` | `admin_ti` |
| `exportar` | los cinco roles, solo sobre lo que cada uno puede ver |

**Perfiles en lenguaje de negocio**:

- **Solicitante**: crea y ve solo sus solicitudes; consulta en solo lectura el catálogo y las OC/recepciones originadas en sus solicitudes.
- **Comprador**: opera proveedores, cotizaciones, OC, recepciones ajenas en solo lectura, facturas, catálogo y evaluaciones; registra y concilia facturas. Ve el RUT tributario completo y la cuenta como `****XXXX`.
- **Jefe de compras**: aprueba o rechaza solicitudes ajenas, aprueba pagos y devoluciones, evalúa proveedores y consulta trazabilidad. Ve datos bancarios completos, pero no los edita.
- **Encargado de bodega**: registra recepciones y devoluciones; crea y ve solo sus propias solicitudes; ve OC en solo lectura.
- **Administrador TI**: administra datos bancarios, desbloquea proveedores y consulta/exporta trazabilidad. Ve el resto en solo lectura, salvo sus propias solicitudes. **No** emite OC, registra recepciones ni aprueba solicitudes, pagos o devoluciones.

La lista anterior de permisos es la implementada en código. Cuando una descripción histórica de `spec.md` mencione una facultad que no aparece en `PERMISOS`, prevalece la matriz de permisos vigente y se documenta la diferencia como deuda conocida.

### 2.2 Segregación de funciones

- Quien solicita no aprueba su propia solicitud. Si el solicitante es `jefe_compras`, debe aprobar otro `jefe_compras`.
- Quien emite la OC no registra su recepción.
- Estas reglas se aplican **sin excepciones**, incluido `admin_ti`.
- El rol queda fijo durante la sesión (FR-037), de modo que una misma sesión no puede crear con un rol y aprobar con otro.

### 2.3 Matriz de visibilidad de datos sensibles

La regla única está en `src/compras/visibilidad.js`; `reglas.js` conserva solo adaptadores de compatibilidad.

| Dato sensible | `solicitante` | `comprador` | `jefe_compras` | `bodega` | `admin_ti` |
| --- | --- | --- | --- | --- | --- |
| RUT personal de otro empleado | `••••••••-•` | `••••••••-•` | `18.XXX.XXX-5` solo en auditoría | `••••••••-•` | Completo |
| RUT tributario de proveedores | Sin acceso | Completo | Completo | Solo en recepciones y guías de despacho | Completo |
| Cuenta bancaria | `No disponible` | `****XXXX` | Completa (solo lectura) | `No disponible` | Completa (edición) |

- El RUT personal propio se ve sin enmascarar en el indicador/perfil para los cinco roles.
- `vistaProveedor()` entrega `rut_visible` y `cuenta_visible` ya calculados; para `solicitante` y `bodega` no incluye `banco`, `tipo_cuenta`, `numero_cuenta` ni `fecha_cambio_cuenta`.
- Si la cuenta tiene 4 dígitos o menos se conservan solo los últimos 2 para `comprador`; sin cuenta se muestra **No registrado** y con cuenta sin acceso **No disponible**.
- La matriz se aplica **en el origen de los datos**: ficha, listados, modales, búsquedas, comparativa, panel, tooltips, mensajes de error, historial, CSV y respuestas del asistente. Un rol sin permiso nunca recibe el valor completo ni dígitos no autorizados.
- Únicamente `admin_ti` puede editar banco y cuenta. Cada cambio actualiza `fecha_cambio_cuenta` y genera un evento de trazabilidad con la representación autorizada por la matriz, nunca el número completo.
- El panel alerta facturas no aprobadas de proveedores con cambio de cuenta en los últimos 30 días (riesgo de fraude por suplantación).

### 2.4 Umbral de cotizaciones

- `UMBRAL_COTIZACIONES = 1.000.000 CLP neto`.
- Una solicitud con `monto_estimado >= 1.000.000` debe tener **al menos 3 cotizaciones registradas** o una `justificacion_proveedor_unico` no vacía antes de seleccionar una oferta y emitir la OC.
- Una compra directa sin cotización solo se permite por debajo del umbral.
- Los precios del catálogo con más de **90 días** sin actualizarse se marcan como desactualizados y no se sugieren como precio mínimo vigente.

### 2.5 Conciliación y tolerancia

- `TOLERANCIA_CONCILIACION = 1 % del neto de la factura`.
- Conciliación de tres vías: OC + recepciones no anuladas − devoluciones no anuladas − facturas/notas de crédito anteriores de la misma OC.
- Si la diferencia es **≤ 1 % del neto**, la factura queda `conciliada`; si la supera, queda `con_discrepancia`.
- Solo una factura `conciliada` puede pasar a `aprobada_pago`, y solo `jefe_compras` puede hacerlo.
- Montos en CLP enteros; IVA de 19 %.
- `fecha_vencimiento = fecha_recepcion + condicion_pago_dias de la OC`. El panel alerta vencimientos a 5 días o menos.
- Plazo máximo de pago: 30 días corridos desde la recepción de la factura (Ley 21.131); más de 30 días exige acuerdo escrito e inscrito (`acuerdo_plazo_mayor = true`).

### 2.6 Daño, devoluciones y notas de crédito

- Daño detectado **al recibir**: unidades rechazadas con motivo `danado`; no cuentan como recibidas, no entran al valor a facturar y quedan pendientes de reposición.
- Daño detectado **después de aceptar**: devolución con motivo `defectuoso` y correlativo `DEV-AAAA-NNNN` que descuenta el saldo recibido y facturado.
- Si quien registra la devolución es quien recibió la mercadería, se exige aprobación de un `jefe_compras` distinto.
- Las notas de crédito se registran como documentos de facturación y descuentan el saldo; el folio es único por proveedor y tipo de documento.
- Si el saldo llega a cero, la OC pasa a `cerrada` y la factura queda `saldada`, sin pasar a `aprobada_pago` por el monto descontado.

### 2.7 Trazabilidad

- Cada cambio de estado de solicitud, cotización, orden, recepción, factura y devolución genera un evento con entidad, id, acción, estado anterior/nuevo, usuario, rol, detalle y fecha/hora.
- Los documentos con historial **no se eliminan**: solo se anulan con `motivo_anulacion`.
- La cadena documental solicitud → cotización → OC → recepción → factura → devolución es navegable desde cualquier documento.
- `jefe_compras` consulta la trazabilidad; `admin_ti` la consulta y exporta. El historial es inmutable.
- El asistente IA usa la misma matriz RBAC: rechaza acciones no autorizadas indicando qué roles sí pueden ejecutarlas y registra el intento como `registrarEvento('asistente', permiso, 'intento_denegado', …)` cuando corresponde.

### 2.8 Asistente IA de Compras

- Está 100 % en frontend (`src/compras/asistente.js`), sin API keys ni backend; consulta y opera los servicios reales del módulo.
- Muestra usuario, rol y centro de costo activos, el indicador **Modo Restringido por Rol · Solo ERP**, historial, limpieza de conversación y tres sugerencias por rol.
- Las acciones sensibles usan tarjetas de confirmación (**Confirmar acción** / **Cancelar**).
- Fuera del dominio responde exactamente:

  > Solo estoy autorizado para asistir en operaciones y consultas del módulo de Adquisiciones y Compras del ERP.

- Es una ayuda operativa, no una autoridad paralela: nunca amplía los permisos de la sesión.

---

## 3. Registro de decisiones metodológicas (SDD)

El trabajo siguió *Spec-Driven Development*: la especificación se escribió y aprobó antes del código, el plan derivó contratos y modelo de datos, las tareas se generaron desde esos artefactos y la implementación se verificó contra pruebas y checklists.

| # | Decisión | Justificación | Alternativa descartada | Artefacto |
|---|---|---|---|---|
| D01 | MVP solo frontend con semilla JSON y `localStorage`. | Coincide con el template del curso; permite demostrar el ciclo sin infraestructura. | Backend y base de datos reales: fuera de alcance de la pauta. | `spec.md`, `data-model.md`, `contracts/almacenamiento-compras.md` |
| D02 | Reemplazar el borrador de Ventas/CRM por Adquisiciones y Compras. | El módulo asignado era compras; el borrador se había subido por error. | Mantener el borrador de Ventas. | `data-model.md` §9 |
| D03 | Normalizar las 11 historias de usuario al formato **Como / necesito / para**, con **Por qué esta prioridad**, **Prueba Independiente** y escenarios **Dado / Cuando / Entonces**. | Hace verificables las historias sin perder contenido previo. | Historias con formato mixto. | `spec.md`, clarificación 2026-11-17 |
| D04 | Centralizar permisos en `PERMISOS` y `puede()`; validar en interfaz **y** operación. | Evita que una restricción visual sea la única barrera. | Permisos dispersos por componente. | `src/compras/almacenamiento.js`, `src/compras/visibilidad.js`, `spec.md` FR-033 |
| D05 | Rol fijo durante la sesión; `setRolActivo()` no cambia una sesión iniciada. | La trazabilidad debe saber con qué rol se actuó; evita cambiar de identidad a mitad de un flujo. | Selector de rol en vivo. | `spec.md` FR-037, clarificación 2026-11-23 |
| D06 | Los cinco roles pueden crear solicitudes, pero solo `jefe_compras` distinto al solicitante aprueba. | Se eliminó el cuello de botella del solicitante sin romper la segregación. | Aprobar la propia solicitud o restringir creación a un rol. | `spec.md` FR-005/FR-006, `research.md` |
| D07 | `admin_ti` es administrador del sistema, no operador de compras. | Reduce riesgo interno; conserva solo edición bancaria, desbloqueo y trazabilidad. | Administrador con acceso operativo total. | `data-model.md` v1.3, clarificación 2026-11-23 |
| D08 | MER de 12 entidades semilla; líneas de documento como arreglos anidados y trazabilidad como superficie transversal. | El entregable pedía las entidades reales de `semilla.json`; las tablas de detalle del modelo normalizado se explican en notas. | Dibujar 20+ entidades e inundar el diagrama. | [`mer.svg`](mer.svg), `data-model.md` §2-4 |
| D09 | Parámetros acordados por escrito: 1.000.000 CLP neto, tolerancia 1 %, pago a 30 días, CSV UTF-8 con BOM y `;`. | Evita interpretaciones distintas entre spec, código y pruebas. | Valores implícitos en el código. | `spec.md` clarificación 2026-11-03, `src/module-config.js` |
| D10 | Enmascaramiento en el origen y una sola configuración de roles visibles/editables. | Un rol sin permiso nunca recibe el dato completo, ni siquiera en CSV o errores. | Enmascarar solo en la vista. | `spec.md` FR-025/FR-030, `src/module-config.js` |
| D11 | Daño en recepción = rechazo `danado`; daño posterior = devolución `defectuosa` con nota de crédito cuando corresponda. | Nunca se paga lo dañado y se conserva la cadena documental. | Reemplazar la unidad sin rastro o anular documentos. | `spec.md` FR-026/FR-031, clarificación 2026-11-19 |
| D12 | Asistente IA local y restringido, sin API keys; rechazo exacto fuera de dominio y confirmación para acciones. | Cumple la pauta de IA corporativa sin salir del ERP ni inventar permisos. | LLM externo con credenciales o backend propio. | `src/compras/asistente.js`, `tests/integration/compras/asistente.test.js` |
| D13 | Interfaz con navegación agrupada, acciones rápidas legibles, modo oscuro, foco visible y respeto a `prefers-reduced-motion`. | Accesibilidad y claridad para roles no técnicos. | Controles con claves internas y textos crípticos. | `src/styles.css`, `spec.md` FR-036, SC-013 |
| D14 | Registrar deuda abierta en lugar de ocultarla. | El curso exige trazabilidad del proceso, no solo del producto final. | Marcar todo como terminado. | `plan.md`, `tasks.md`, `quickstart.md` §Coberturapendiente |

**Estado metodológico**: Fase 16 cerrada; Fase 17 con navegación agrupada, solo lectura y encabezado implementados, con T127 abierta en servicios; Fase 18 con permisos por historia verificados, con T137/T139 abiertas por FR-035; Fase 19 con semilla, contratos y documentación sincronizados y suite automatizada en verde; Fase 20 cerrada. Siguen documentados además los ítems T101/T109/T110/T118 del modelo y el recorrido manual de los escenarios de `quickstart.md`. El estado canónico se replica en `spec.md`, `plan.md`, `tasks.md` y `quickstart.md`.

---

## 4. Escalabilidad y desarrollo futuro

### 4.1 Situación actual y límites

- `localStorage` es por navegador y por usuario de equipo; no hay concurrencia, transacciones ni bloqueo optimista.
- La autenticación es simulada: la clave `Compras2026` está en el código y los roles no son identidad real.
- Los eventos de trazabilidad viven en la misma clave de almacenamiento que los documentos; son inmutables por convención de la aplicación, no por una base de datos append-only.
- El asistente solo puede operar sobre los servicios del frontend; no consulta sistemas externos.

### 4.2 Evolución hacia backend/API

1. **Contrato primero**: conservar los nombres de colección y los identificadores de `semilla.json` como contrato de API (`usuarios`, `proveedores`, `solicitudes`, `ordenes`, …). El MER entregable ya usa ese vocabulario.
2. **Persistencia**: migrar a PostgreSQL u otro RDBMS con el modelo normalizado de `data-model.md`; tablas de detalle separadas, FK reales, restricciones únicas y tipos `DECIMAL` para CLP.
3. **API**: exponer endpoints REST o GraphQL con validación en servidor de umbral, tolerancia, estados y RBAC. El frontend conserva las reglas para feedback inmediato, pero el servidor es la autoridad.
4. **Seguridad**: SSO/OIDC, roles y permisos en el token, secretos en un vault, auditoría append-only, rate limiting y cifrado de datos sensibles en reposo.
5. **Consistencia**: transacciones para emitir OC desde cotización, conciliar factura y registrar devolución; control de concurrencia con `version` o `updatedAt`.
6. **Observabilidad**: métricas de ciclo de compra, discrepancias, vencimientos y distribución de adjudicaciones; trazas correlacionadas con `id_evento`.
7. **Asistente**: mover el razonamiento a un servicio con gobernanza, manteniendo el modo restringido, la confirmación de acciones y el registro de intentos denegados; nunca exponer credenciales en el bundle.

La migración puede hacerse por fases: primero persistencia y auditoría, después autenticación real, luego integraciones y finalmente el asistente gobernado. Las pruebas de `tests/integration/compras/` sirven como especificación ejecutable durante la migración.

### 4.3 Integración con Inventario y Contabilidad

| Integración | Clave de enlace | Flujo futuro |
|---|---|---|
| Inventario | `id_producto` / `productos.id` | Inventario es dueño del maestro de productos; Compras solo lee. Las cantidades `cantidad_aceptada` de `recepciones.lineas[]` generan movimientos de entrada; las devoluciones generan movimientos inversos. |
| Inventario → Compras | reposición automática | Cuando el stock baje del mínimo, Inventario propone solicitudes de compra; siguen requiriendo aprobación de `jefe_compras`. |
| Contabilidad | `proveedores`, `centros_costo`, `facturas` | Una factura `aprobada_pago` genera la cuenta por pagar; Contabilidad registra el pago y cierra el saldo. Las notas de crédito y devoluciones ajustan el saldo. |
| RR.HH. | `id_usuario`, `usuarios`, `centros_costo` | Fichas maestras externas; Compras consume rol, vigencia y centro de costo. |
| SII / DTE | `tipo_documento`, `folio`, `proveedor.rut` | Recepción automática de documentos tributarios; hoy fuera de alcance y las facturas se ingresan manualmente. |

El patrón recomendado es un **outbox de eventos** (`recepcion.registrada`, `factura.aprobada_pago`, `devolucion.registrada`) para que Inventario y Contabilidad reaccionen sin acoplarse a la UI. Cada evento conserva usuario, rol y fecha, en coherencia con la trazabilidad actual.

### 4.4 Desarrollo futuro priorizado

1. Cerrar navegación agrupada por visibilidad, filtros y modo solo lectura por vista (FR-033 a FR-036).
2. Cerrar T101, T109, T110 y T118: cierre de OC con saldo pendiente, `credito_a_favor`, anulaciones con motivo y estados alineados de devolución.
3. Ampliación de paneles de alertas y reportes por centro de costo, proveedor y categoría; exportación CSV con los permisos vigentes.
4. Notificaciones de vencimiento y cambios bancarios recientes.
5. Flujos de aprobación multinivel y reemplazo de la clave genérica por autenticación real.
6. Escalabilidad del asistente a consultas analíticas gobernadas, siempre sobre datos del ERP.

---

## 5. Sesgos de datos y mitigaciones

Los datos son ficticios, pero las reglas están pensadas para no transferir sesgos del mundo real a la selección de proveedores ni a la evaluación.

| Sesgo o riesgo | Cómo se manifiesta | Mitigación implementada o prevista |
|---|---|---|
| Proveedor habitual | Ordenar por volumen histórico deja siempre primero al proveedor grande y antiguo. | Regla de 3 cotizaciones sobre el umbral; la comparativa muestra precio, plazo, condición de pago y evaluación histórica **junto con el número de OC evaluadas**. |
| Evaluación subjetiva | Notas de calidad/servicio dependen del criterio de cada evaluador. | `puntaje_plazo` se calcula desde fechas reales, no se ingresa manualmente; se recomienda rúbrica y múltiples evaluadores en la versión futura. |
| Registro incompleto | Solo guardar la cotización ganadora impide auditar la decisión. | `motivo_descarte` obligatorio (`precio`, `plazo`, `calidad`, `condiciones`, `otro`) y trazabilidad de selección. |
| Sesgo por menor precio | Elegir siempre lo más barato ignora plazo, calidad y riesgo. | Comparativa side-by-side con precio, plazo, pago y evaluación; justificación de proveedor único cuando no hay 3 ofertas. |
| Sesgo contra pymes | Las micro y pequeñas empresas sufren más los pagos tardíos y quedan fuera de licitaciones por su historial de volumen. | `tamano_empresa` permite medir el gasto en micro/pequeñas; plazo de pago vigilado por Ley 21.131; se recomienda revisar distribución de adjudicaciones. |
| Precios desactualizados | Un precio antiguo puede hacer que un proveedor parezca caro o barato sin causa real. | Catálogo con `fecha_actualizacion`; más de 90 días se marca desactualizado; al crear solicitudes se sugiere el menor precio **vigente**. |
| Sesgo de sesión/rol | Cambiar de rol en vivo permitiría a una persona crear y aprobar. | Rol fijo por sesión y dos jefes en la semilla para demostrar aprobación ajena. |
| Datos personales | RUT de empleados, RUT tributario y cuenta pueden exponer a personas naturales. | Matriz única en `visibilidad.js` aplicada en origen, visibilidad restringida por rol y canal, y cambios bancarios auditados con la representación autorizada. |
| Datos sintéticos mal interpretados | Los nombres, RUT y correos parecen reales. | Todos los datos son ficticios y se documentan como tales en spec, quickstart y este README. |

**Marco normativo de referencia**: Ley 19.628 y Ley 21.719 sobre protección de datos personales, Ley 21.131 de pago a 30 días. Las compras públicas (Ley 19.886 / Mercado Público) quedan fuera de alcance porque el cliente es una pyme privada.

---

## 6. Entregables y trazabilidad documental

| Documento | Contenido |
|---|---|
| [`spec.md`](spec.md) | Problema, usuarios, historias de usuario, requisitos FR-001 a FR-037 y criterios de éxito. |
| [`plan.md`](plan.md) | Arquitectura, fases, pruebas y deuda técnica. |
| [`research.md`](research.md) | Alternativas evaluadas y justificación de decisiones. |
| [`data-model.md`](data-model.md) | Modelo normalizado, atributos, reglas de negocio y cardinalidades de detalle. |
| [`mer.svg`](mer.svg) | **Entregable gráfico**: 12 entidades semilla, PK/FK/UK y tabla de cardinalidades, fondo blanco. |
| [`quickstart.md`](quickstart.md) | Guion de demostración y verificación extremo a extremo. |
| [`tasks.md`](tasks.md) | Desglose por fases e historias, con estado de cada tarea. |
| [`contracts/`](contracts/) | Contratos de almacenamiento, exportación CSV, permisos e integración. |

Este README es el índice del entregable documental y no sustituye a los contratos ejecutables ni a las pruebas; los complementa para su uso en informes y presentaciones.
