# Especificación de la Funcionalidad: Módulo Adquisiciones y Compras

**Rama de la funcionalidad**: 002-modulo-adquisiciones-compras  
**Creada**: 2026-10-27  
**Estado**: Borrador  
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

### Cliente y usuarios

**Cliente** (quien adopta y paga el sistema): gerencia de administración y finanzas de una pyme chilena con un área de compras de 1 a 5 personas.

| Usuario | Rol en el sistema | Necesidad principal |
|---|---|---|
| Solicitante (cualquier área) | `solicitante` | Pedir lo que necesita y saber en qué etapa está su solicitud |
| Comprador | `comprador` | Cotizar, comparar ofertas y emitir órdenes de compra rápido |
| Jefe de compras | `jefe_compras` | Aprobar solicitudes y facturas, controlar el gasto y el desempeño de proveedores |
| Encargado de bodega | `bodega` | Registrar lo que llega y lo que se rechaza |
| Administrador | `admin` | Mantener proveedores, datos bancarios, usuarios y centros de costo |
| Otros módulos del ERP | — | Inventario recibe las cantidades aceptadas; Contabilidad recibe las facturas aprobadas para pago |

### Fuera de alcance

Backend real, autenticación real (los roles se simulan), conexión con el SII o recepción automática de documentos tributarios electrónicos, registro del pago (lo hace Contabilidad), control de presupuesto por centro de costo, compras públicas (Ley 19.886) y envío real de correos.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Gestionar proveedores (Prioridad: P1)

Como administrador o comprador, quiero registrar, editar, buscar y bloquear proveedores con sus datos tributarios y de contacto, para tener un registro único y confiable de a quién se le compra.

**Por qué esta prioridad**: Sin proveedores no se puede cotizar ni emitir órdenes de compra. Es el dato maestro del módulo y la primera pieza que se puede construir directamente sobre la Entidad del template.

**Prueba Independiente**: Un usuario crea un proveedor con RUT válido, lo encuentra en la búsqueda, cambia su estado a `aprobado` y luego a `bloqueado`.

**Escenarios de Aceptación**:

1. **Dado** que el usuario está en la lista de proveedores, **cuando** crea un proveedor con RUT, razón social, giro y región, **entonces** el proveedor se guarda en estado `potencial` y aparece en la lista.
2. **Dado** que el usuario ingresa un RUT con dígito verificador inválido o ya registrado, **cuando** intenta guardar, **entonces** el sistema lo impide y explica el motivo.
3. **Dado** un proveedor con condición de pago de 45 días, **cuando** no tiene marcado `acuerdo_plazo_mayor`, **entonces** el sistema no permite guardar y explica que el máximo legal es 30 días sin acuerdo inscrito.
4. **Dado** un proveedor con órdenes de compra, **cuando** el usuario intenta eliminarlo, **entonces** el sistema lo impide y ofrece bloquearlo.
5. **Dado** un usuario con rol distinto de `admin`, **cuando** ve la ficha de un proveedor, **entonces** el número de cuenta bancaria aparece enmascarado y no es editable.

---

### Historia de Usuario 2 - Crear y aprobar solicitudes de compra (Prioridad: P1)

Como solicitante, quiero pedir productos indicando cantidad, fecha requerida y justificación, y como jefe de compras quiero aprobarlas o rechazarlas, para que toda compra parta de una necesidad autorizada.

**Por qué esta prioridad**: La solicitud aprobada es la puerta de entrada obligatoria del ciclo y el principal control contra compras no autorizadas.

**Prueba Independiente**: Un solicitante crea y envía una solicitud con dos productos; el jefe de compras la aprueba; la solicitud queda en estado `aprobada` con fecha y aprobador.

**Escenarios de Aceptación**:

1. **Dado** que el solicitante crea una solicitud con al menos un producto activo, **cuando** la envía, **entonces** queda en estado `enviada` con número correlativo `SC-AAAA-NNNN` y monto estimado calculado.
2. **Dada** una solicitud `enviada`, **cuando** el jefe de compras la aprueba, **entonces** queda `aprobada` con su nombre y la fecha.
3. **Dada** una solicitud `enviada`, **cuando** el jefe de compras la rechaza sin indicar motivo, **entonces** el sistema exige el motivo antes de guardar.
4. **Dado** que el jefe de compras es también el solicitante, **cuando** intenta aprobar su propia solicitud, **entonces** el sistema lo impide.
5. **Dada** una solicitud sin productos, **cuando** el solicitante intenta enviarla, **entonces** el sistema lo impide.

---

### Historia de Usuario 3 - Emitir órdenes de compra (Prioridad: P1)

Como comprador, quiero emitir una orden de compra a un proveedor aprobado a partir de una solicitud aprobada, para formalizar el compromiso de compra con precios, plazo de entrega y condición de pago.

**Por qué esta prioridad**: La orden de compra es el documento central del módulo y el que se construye directamente sobre el Documento del template. Con esta historia y la 1 ya existe una versión integrada de prueba.

**Prueba Independiente**: Con una solicitud aprobada de bajo monto, el comprador emite una OC por compra directa; la OC aparece con número `OC-AAAA-NNNN`, neto, IVA y total correctos, y la solicitud pasa a `adjudicada`.

**Escenarios de Aceptación**:

1. **Dada** una solicitud `aprobada` bajo el umbral de cotizaciones, **cuando** el comprador emite una OC sin cotización, **entonces** la OC queda `emitida`, con IVA = 19 % del neto, y la solicitud pasa a `adjudicada`.
2. **Dada** una solicitud sobre el umbral sin cotización seleccionada, **cuando** el comprador intenta emitir una OC directa, **entonces** el sistema lo impide y explica que se requieren cotizaciones.
3. **Dado** un proveedor `potencial` o `bloqueado`, **cuando** el comprador intenta emitirle una OC, **entonces** el sistema lo impide.
4. **Dada** una cotización ya convertida en OC, **cuando** se intenta generar una segunda OC desde ella, **entonces** el sistema lo impide.
5. **Dada** una OC `emitida` sin recepciones, **cuando** el comprador la anula, **entonces** queda `anulada` y la solicitud vuelve a `aprobada` o `en_cotizacion`.

---

### Historia de Usuario 4 - Registrar recepciones (Prioridad: P1)

Como encargado de bodega, quiero registrar qué llegó de cada orden de compra, cuánto acepto y cuánto rechazo, para que el sistema sepa si la orden está completa y para informar a Inventario.

**Por qué esta prioridad**: Sin recepción no hay forma de verificar la factura ni de actualizar el stock; es el control físico del ciclo.

**Prueba Independiente**: Sobre una OC de 10 unidades se registra una recepción de 6 aceptadas; la OC queda `recibida_parcial`. Una segunda recepción de 4 la deja `recibida_total`.

**Escenarios de Aceptación**:

1. **Dada** una OC `emitida`, **cuando** bodega registra una recepción parcial, **entonces** la OC pasa a `recibida_parcial` y se muestra lo pendiente por línea.
2. **Dada** una línea con 4 unidades pendientes, **cuando** bodega intenta aceptar 5, **entonces** el sistema lo impide.
3. **Dada** una recepción con unidades rechazadas, **cuando** no se indica motivo de rechazo, **entonces** el sistema exige el motivo.
4. **Dado** que el usuario que registra es el mismo comprador que emitió la OC, **cuando** intenta registrar la recepción, **entonces** el sistema lo impide.

---

### Historia de Usuario 5 - Panel de compras (Prioridad: P1)

Como jefe de compras, quiero un panel de inicio con acciones rápidas, pendientes y alertas, para saber de un vistazo qué requiere mi atención.

**Por qué esta prioridad**: Es la página principal que exige el enunciado y adapta el panel del template al módulo.

**Prueba Independiente**: Con datos semilla, el panel muestra solicitudes por aprobar, OC por recibir, facturas próximas a vencer y el gasto del mes, y cada acción rápida abre su pantalla.

**Escenarios de Aceptación**:

1. **Dado** que el usuario abre el módulo, **cuando** carga, **entonces** ve acciones rápidas para nueva solicitud, nueva OC, registrar recepción y registrar factura.
2. **Dadas** facturas no aprobadas que vencen en 5 días o menos, **cuando** se muestra el panel, **entonces** aparecen destacadas como alerta de plazo legal.
3. **Dado** que se crea o modifica un registro en otra pantalla, **cuando** el usuario vuelve al panel, **entonces** los contadores reflejan el cambio.

---

### Historia de Usuario 6 - Registrar y comparar cotizaciones (Prioridad: P2)

Como comprador, quiero registrar las cotizaciones de varios proveedores para una solicitud y verlas lado a lado, para elegir la mejor oferta y dejar constancia de por qué se descartaron las demás.

**Por qué esta prioridad**: Es el corazón de la parte de adquisiciones y el principal mecanismo contra el sesgo del proveedor habitual, pero el ciclo puede funcionar sin ella mediante compras directas bajo el umbral.

**Prueba Independiente**: Para una solicitud sobre el umbral se registran 3 cotizaciones; el comprador selecciona una, descarta las otras con motivo y emite la OC con los precios de la seleccionada.

**Escenarios de Aceptación**:

1. **Dada** una solicitud `aprobada`, **cuando** se registra su primera cotización, **entonces** la solicitud pasa a `en_cotizacion`.
2. **Dadas** varias cotizaciones de una solicitud, **cuando** el comprador abre la comparación, **entonces** ve por proveedor el total, plazo de entrega, condición de pago y evaluación promedio con su número de evaluaciones.
3. **Dada** una solicitud sobre el umbral con solo 2 cotizaciones, **cuando** el comprador intenta seleccionar una sin justificar proveedor único, **entonces** el sistema lo impide.
4. **Dada** una cotización, **cuando** se descarta, **entonces** se exige el motivo de descarte.
5. **Dada** una cotización con fecha de validez vencida, **cuando** se consulta, **entonces** aparece como `vencida` y no puede seleccionarse.

---

### Historia de Usuario 7 - Registrar y conciliar facturas de proveedor (Prioridad: P2)

Como jefe de compras, quiero registrar la factura del proveedor y que el sistema la compare con la orden y lo recibido, para aprobar para pago solo lo que corresponde y hacerlo dentro del plazo legal.

**Por qué esta prioridad**: Cierra el ciclo y entrega el dato a Contabilidad, pero depende de que existan OC y recepciones.

**Prueba Independiente**: Sobre una OC con 6 unidades aceptadas a 10.000 CLP neto, una factura por 60.000 CLP neto queda `conciliada`; una por 80.000 CLP neto queda `con_discrepancia`.

**Escenarios de Aceptación**:

1. **Dada** una OC con recepciones, **cuando** se registra una factura cuyo neto coincide con el valor recibido pendiente de facturar dentro de la tolerancia, **entonces** queda `conciliada` y su fecha de vencimiento se calcula desde la fecha de recepción de la factura.
2. **Dada** una factura cuyo neto excede la tolerancia, **cuando** se registra, **entonces** queda `con_discrepancia` y muestra la diferencia.
3. **Dada** una factura `con_discrepancia`, **cuando** el jefe de compras intenta aprobarla para pago, **entonces** el sistema lo impide.
4. **Dado** un folio ya registrado para el mismo proveedor y tipo de documento, **cuando** se intenta registrar de nuevo, **entonces** el sistema lo impide.
5. **Dado** un proveedor cuya cuenta bancaria cambió hace menos de 30 días, **cuando** se aprueba una factura suya, **entonces** el sistema muestra una advertencia de posible fraude.

---

### Historia de Usuario 8 - Catálogo de productos por proveedor (Prioridad: P2)

Como comprador, quiero registrar qué productos ofrece cada proveedor con su precio de referencia y plazo habitual, para estimar solicitudes y saber a quién pedir cotización.

**Por qué esta prioridad**: Mejora la calidad de las estimaciones y de la elección de proveedores, pero el ciclo funciona ingresando precios a mano.

**Prueba Independiente**: Se asocia un producto a dos proveedores con precios distintos; al crear una solicitud con ese producto, se sugiere el menor precio de referencia.

**Escenarios de Aceptación**:

1. **Dado** un proveedor y un producto, **cuando** se registra el par por segunda vez, **entonces** el sistema actualiza el registro existente en lugar de duplicarlo.
2. **Dado** un precio de referencia con más de 90 días sin actualizar, **cuando** se muestra, **entonces** aparece marcado como desactualizado.

---

### Historia de Usuario 9 - Evaluar proveedores (Prioridad: P3)

Como jefe de compras, quiero evaluar a cada proveedor al completar una orden de compra, para tener información objetiva al elegir en compras futuras.

**Por qué esta prioridad**: Aporta valor a mediano plazo y alimenta la comparación de cotizaciones, pero no es necesaria para operar el ciclo.

**Prueba Independiente**: Sobre una OC `recibida_total` entregada 2 días tarde se registra una evaluación; la nota de plazo aparece calculada como 4.

**Escenarios de Aceptación**:

1. **Dada** una OC `recibida_total`, **cuando** se evalúa, **entonces** la nota de plazo se calcula sola y el usuario ingresa calidad y servicio de 1 a 5.
2. **Dada** una OC ya evaluada, **cuando** se intenta evaluar otra vez, **entonces** el sistema lo impide.

---

### Historia de Usuario 10 - Exportar reportes (Prioridad: P3)

Como jefe de compras, quiero exportar a CSV las órdenes de compra, facturas y el gasto por centro de costo, para analizarlos fuera del sistema o entregarlos a Contabilidad.

**Por qué esta prioridad**: Útil pero prescindible en el MVP.

**Prueba Independiente**: Desde la lista de OC filtrada por mes, el usuario descarga un CSV que se abre en Excel con las mismas filas que ve en pantalla.

**Escenarios de Aceptación**:

1. **Dada** una lista filtrada, **cuando** el usuario exporta, **entonces** el CSV contiene exactamente las filas filtradas, con montos en CLP sin decimales.

---

### Casos Límite

- ¿Qué pasa si se anula una OC con cotización seleccionada? La cotización sigue `seleccionada` y puede generar una nueva OC.
- ¿Qué pasa si llega una nota de crédito? Se registra contra la misma OC y descuenta del monto facturado.
- ¿Qué pasa si el proveedor entrega más de lo pedido? Solo se acepta hasta lo pendiente; el excedente se registra como rechazado con motivo `no_corresponde`.
- ¿Qué pasa si un producto se desactiva con solicitudes abiertas? Las solicitudes existentes se mantienen; no se puede agregar a solicitudes nuevas.
- ¿Qué pasa si se bloquea un proveedor con OC abiertas? Las OC abiertas siguen su curso; no se le pueden emitir nuevas.
- ¿Qué pasa si `localStorage` está lleno o deshabilitado? La aplicación muestra un mensaje claro y no pierde lo que el usuario tenía en pantalla.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir crear, editar, buscar y cambiar de estado proveedores, validando RUT (formato y dígito verificador) y su unicidad.
- **FR-002**: El sistema DEBE impedir una condición de pago mayor a 30 días si el proveedor no tiene registrado un acuerdo de plazo mayor (Ley 21.131).
- **FR-003**: El sistema DEBE impedir eliminar proveedores con órdenes de compra; en su lugar DEBE permitir bloquearlos.
- **FR-004**: El sistema DEBE enmascarar RUT de personas naturales y números de cuenta bancaria para roles sin permiso, y DEBE registrar la fecha del último cambio de datos bancarios.
- **FR-005**: El sistema DEBE permitir crear solicitudes de compra con una o más líneas y numeración correlativa `SC-AAAA-NNNN`.
- **FR-006**: El sistema DEBE impedir que un usuario apruebe su propia solicitud y DEBE exigir motivo al rechazar.
- **FR-007**: El sistema DEBE permitir registrar cotizaciones solo para solicitudes aprobadas, con una cotización por proveedor y solicitud.
- **FR-008**: El sistema DEBE exigir al menos 3 cotizaciones, o una justificación de proveedor único, para seleccionar una cotización en solicitudes cuyo monto estimado iguale o supere UMBRAL_COTIZACIONES.
- **FR-009**: El sistema DEBE exigir motivo al descartar una cotización y DEBE marcar como vencidas las cotizaciones cuya fecha de validez pasó.
- **FR-010**: El sistema DEBE emitir órdenes de compra solo para solicitudes aprobadas y proveedores aprobados, copiando líneas y precios desde la cotización seleccionada cuando exista.
- **FR-011**: El sistema DEBE impedir más de una orden de compra no anulada por solicitud y más de una orden por cotización.
- **FR-012**: El sistema DEBE calcular subtotales, neto, IVA (19 %) y total en CLP enteros.
- **FR-013**: El sistema DEBE registrar recepciones parciales por línea, impedir aceptar más de lo pendiente y actualizar el estado de la orden automáticamente.
- **FR-014**: El sistema DEBE impedir que quien emitió una orden registre su recepción.
- **FR-015**: El sistema DEBE registrar facturas y notas de crédito solo contra órdenes con recepciones, con folio único por proveedor y tipo de documento.
- **FR-016**: El sistema DEBE conciliar cada factura contra el valor recibido pendiente de facturar y clasificarla como `conciliada` o `con_discrepancia` según TOLERANCIA_CONCILIACION.
- **FR-017**: El sistema DEBE calcular la fecha de vencimiento de cada factura desde su fecha de recepción y DEBE alertar las no aprobadas que vencen en 5 días o menos.
- **FR-018**: El sistema DEBE mostrar un panel de inicio con acciones rápidas, pendientes por rol, alertas e indicadores del período.
- **FR-019**: El sistema DEBE permitir una evaluación por orden recibida, calculando la nota de plazo a partir de las fechas.
- **FR-020**: El sistema DEBE funcionar con datos semilla completamente ficticios.
- **FR-021**: El sistema DEBE definir UMBRAL_COTIZACIONES en [NECESITA ACLARACIÓN: valor propuesto 1.000.000 CLP neto; confirmar con el grupo].
- **FR-022**: El sistema DEBE definir TOLERANCIA_CONCILIACION en [NECESITA ACLARACIÓN: valor propuesto 1 % del neto; confirmar si se prefiere un monto fijo en pesos].

### Requisitos de Integración

- **IR-001**: PRODUCTO es compartido con Inventario; Compras solo lo lee.
- **IR-002**: Las cantidades aceptadas en recepción DEBEN quedar disponibles para que Inventario actualice el stock.
- **IR-003**: Las facturas `aprobada_pago` DEBEN quedar disponibles para Contabilidad como cuentas por pagar.

### Entidades Clave

El detalle de atributos, cardinalidades y reglas está en [data-model.md](data-model.md).

- **Proveedor**: empresa o persona que vende; incluye datos tributarios, de contacto, bancarios, tamaño y estado.
- **Catálogo proveedor-producto**: qué ofrece cada proveedor y a qué precio de referencia.
- **Solicitud de compra**: necesidad interna aprobada; origen obligatorio de toda compra.
- **Cotización de proveedor**: oferta de un proveedor para una solicitud.
- **Orden de compra**: compromiso formal con un proveedor.
- **Recepción**: registro de lo efectivamente recibido y rechazado.
- **Factura de proveedor**: documento tributario que se concilia y se aprueba para pago.
- **Evaluación de proveedor**: desempeño del proveedor en una orden.
- **Usuario y centro de costo**: quién opera el sistema y a qué área se imputa cada compra.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un solicitante crea y envía una solicitud de 3 productos en menos de 2 minutos.
- **SC-002**: El ciclo completo (solicitud, 3 cotizaciones, OC, recepción y factura conciliada) se puede demostrar en menos de 5 minutos con datos semilla.
- **SC-003**: El 100 % de las órdenes sobre el umbral tienen 3 cotizaciones o una justificación registrada.
- **SC-004**: Ninguna recepción permite aceptar más unidades que las compradas, verificado con pruebas automatizadas.
- **SC-005**: El 100 % de las facturas que vencen en 5 días o menos sin aprobación aparecen en el panel.
- **SC-006**: Las listas y búsquedas responden de forma instantánea con hasta 500 registros por colección, igual que el módulo base.
- **SC-007**: Las reglas de cálculo y de estado de la sección 5 de `data-model.md` tienen pruebas unitarias que pasan.

## Suposiciones

- La empresa cliente es una pyme privada que recibe facturas afectas a IVA; boletas de honorarios y documentos exentos quedan fuera del MVP.
- Todos los montos están en pesos chilenos; no hay compras en moneda extranjera.
- Los roles se eligen desde un selector de usuario simulado; no hay inicio de sesión real.
- El módulo funciona en un solo navegador con `localStorage`; no hay sincronización entre equipos.
- Productos, usuarios y centros de costo vienen como datos semilla mientras los módulos de Inventario, RR.HH. y Contabilidad no estén conectados.
- El módulo se construye sobre el template del curso (`specs/001-erp-base-module`); ver [plan.md](plan.md).
