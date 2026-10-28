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

### Cliente, Usuarios y Claves de Integración

Para asegurar el control de acceso y la integración fluida con otros módulos del ERP (Inventario, Contabilidad, RR.HH.), el módulo define las siguientes claves y niveles de acceso:

**Claves de Integración (Keys):**
* `id_producto`: Vincula con el **Módulo de Inventario**.
* `id_proveedor`: Vincula con el **Módulo de Contabilidad/Finanzas**.
* `id_usuario`: Vincula con el **Módulo de RRHH/Usuarios**.

**Roles en el sistema:**
| Usuario | Rol técnico | Nivel de Acceso y Propósito |
| :--- | :--- | :--- |
| Solicitante (cualquier área) | `solicitante` | **Restringido:** Solo ve y crea sus propias solicitudes. |
| Comprador | `comprador` | **Ejecutor:** Cotiza, emite Órdenes de Compra (OC) y mantiene el catálogo de proveedores. No ve datos bancarios completos. |
| Jefe de compras | `jefe_compras` | **Aprobador:** Autoriza solicitudes, aprueba facturas y gestiona excepciones comerciales. |
| Encargado de bodega | `bodega` | **Restringido (Físico):** Solo interactúa con el registro de recepciones de una OC emitida. |
| Administrador | `admin_ti` | **Acceso total:** Puede auditar logs, desbloquear proveedores y ver datos sensibles (ej. cuentas bancarias completas sin enmascarar). |

### Fuera de alcance

Backend real, autenticación real (los roles se simulan), conexión con el SII o recepción automática de documentos tributarios electrónicos, registro del pago (lo hace Contabilidad), control de presupuesto por centro de costo, compras públicas (Ley 19.886) y envío real de correos.

## Escenarios de Usuario y Pruebas *(obligatorio)*

*Nota de Integración: Para asegurar la trazabilidad y seguridad, este módulo utiliza identificadores únicos (`id_producto`, `id_proveedor`, `id_usuario`) que conectan con los módulos de Inventario, Contabilidad y RR.HH. Los roles de acceso definen qué información es visible (ej. enmascaramiento de datos bancarios para roles no administrativos).*

### Historia de Usuario 1 - Gestionar proveedores (Prioridad: P1)
**Como** Administrador o Comprador, **necesito** mantener un registro único, validado y seguro de nuestros proveedores, **para** tener la tranquilidad de que estamos haciendo negocios con entidades legales formales y evitar fraudes o pagos a cuentas incorrectas.

**Por qué esta prioridad**: Sin proveedores no se puede cotizar ni emitir órdenes de compra. Es el dato maestro del módulo y genera el `id_proveedor`.

**Prueba Independiente**: Un usuario crea un proveedor con RUT válido, lo encuentra en la búsqueda, cambia su estado a `aprobado` y luego a `bloqueado`.

**Escenarios de Aceptación**:
1. **Dado** que el usuario está en la lista de proveedores, **cuando** crea un proveedor con RUT, razón social, giro y región, **entonces** el proveedor se guarda en estado `potencial` y aparece en la lista generando un `id_proveedor`.
2. **Dado** que el usuario ingresa un RUT con dígito verificador inválido o ya registrado, **cuando** intenta guardar, **entonces** el sistema lo impide y sugiere usar el registro existente.
3. **Dado** un proveedor con condición de pago de 45 días, **cuando** no tiene marcado `acuerdo_plazo_mayor`, **entonces** el sistema no permite guardar (cumplimiento Ley 21.131).
4. **Dado** un proveedor con órdenes de compra, **cuando** el usuario intenta eliminarlo, **entonces** el sistema lo impide para proteger la integridad de los datos y ofrece bloquearlo.
5. **Dado** un usuario con rol distinto de `admin`, **cuando** ve la ficha de un proveedor, **entonces** el número de cuenta bancaria aparece enmascarado (ej. `****5678`) y no es editable.

---

### Historia de Usuario 2 - Crear y aprobar solicitudes de compra (Prioridad: P1)
**Como** Solicitante de cualquier área, **necesito** pedir los materiales que me faltan indicando cantidad y justificación, y que mi jefatura pueda revisarlos, **para** que las compras nazcan de una necesidad real y no se atrasen por correos perdidos.

**Por qué esta prioridad**: La solicitud aprobada es la puerta de entrada y el principal control contra compras no autorizadas. Vincula el `id_producto` y el `id_usuario`.

**Prueba Independiente**: Un solicitante crea y envía una solicitud con dos productos; el jefe de compras la aprueba; la solicitud queda en estado `aprobada`.

**Escenarios de Aceptación**:
1. **Dado** que el solicitante crea una solicitud con al menos un producto activo, **cuando** la envía, **entonces** queda en estado `enviada` con correlativo `SC-AAAA-NNNN` y monto estimado.
2. **Dada** una solicitud `enviada`, **cuando** el jefe de compras la aprueba, **entonces** queda `aprobada` registrando su nombre y fecha.
3. **Dada** una solicitud `enviada`, **cuando** el jefe de compras la rechaza, **entonces** el sistema exige escribir un motivo de rechazo.
4. **Dado** que el jefe de compras es también el solicitante, **cuando** intenta aprobar su propia solicitud, **entonces** el sistema se lo impide (segregación de funciones).
5. **Dada** una solicitud sin productos, **cuando** el solicitante intenta enviarla, **entonces** el sistema lo impide.

---

### Historia de Usuario 3 - Emitir órdenes de compra (Prioridad: P1)
**Como** Comprador, **necesito** transformar una solicitud aprobada en un documento formal de compra (OC) de manera automática, **para** comprometer precios y plazos con el proveedor sin transcribir datos a mano.

**Por qué esta prioridad**: La OC es el documento central del módulo. Integra la solicitud con el `id_proveedor`.

**Prueba Independiente**: Con una solicitud aprobada bajo monto, el comprador emite una OC; aparece con número `OC-AAAA-NNNN`, neto, IVA y total, y la solicitud pasa a `adjudicada`.

**Escenarios de Aceptación**:
1. **Dada** una solicitud `aprobada` bajo el umbral de cotizaciones, **cuando** el comprador emite una OC directa, **entonces** la OC queda `emitida` (con IVA=19%) y la solicitud pasa a `adjudicada`.
2. **Dada** una solicitud sobre el umbral sin cotización seleccionada, **cuando** el comprador intenta emitir OC directa, **entonces** el sistema exige cotizaciones previas.
3. **Dado** un proveedor en estado `bloqueado`, **cuando** el comprador intenta emitirle una OC, **entonces** el sistema cancela la operación por riesgo.
4. **Dada** una cotización ya convertida en OC, **cuando** se intenta generar una segunda OC desde ella, **entonces** el sistema lo impide para evitar duplicidad.
5. **Dada** una OC `emitida` sin recepciones, **cuando** el comprador la anula, **entonces** queda `anulada` dejando registro de auditoría.

---

### Historia de Usuario 4 - Registrar recepciones (Bodega) (Prioridad: P1)
**Como** Encargado de Bodega, **necesito** contrastar físicamente lo que trae el camión contra la Orden de Compra, **para** asegurar que paguemos solo lo recibido y alertar al inventario.

**Por qué esta prioridad**: Es el control físico del ciclo. Genera el evento para actualizar el Módulo de Inventario mediante el `id_producto` y la cantidad aceptada.

**Prueba Independiente**: Sobre una OC de 10 unidades, se registran 6 aceptadas; la OC queda `recibida_parcial`. Luego 4 unidades más la dejan `recibida_total`.

**Escenarios de Aceptación**:
1. **Dada** una OC `emitida`, **cuando** bodega registra una recepción parcial, **entonces** la OC pasa a `recibida_parcial` mostrando lo pendiente.
2. **Dada** una línea con 4 unidades pendientes, **cuando** bodega intenta aceptar 5, **entonces** el sistema lo impide.
3. **Dada** una recepción con rechazos, **cuando** el bodeguero no indica el motivo, **entonces** el sistema lo exige obligatoriamente.
4. **Dado** que el usuario que registra es el mismo comprador que emitió la OC, **cuando** intenta registrar la recepción, **entonces** el sistema se lo deniega (separación de compras y bodega).

---

### Historia de Usuario 7 - Registrar y conciliar facturas (Prioridad: P2)
**Como** Jefe de Compras, **necesito** cruzar la factura del proveedor con la Orden y lo recibido en Bodega, **para** autorizar el pago a Contabilidad solo si los montos coinciden y hacerlo en plazo.

**Por qué esta prioridad**: Cierra el ciclo de compras y prepara el pase de datos hacia el Módulo de Contabilidad.

**Prueba Independiente**: Sobre una OC recibida de 10.000 CLP neto, una factura por igual valor queda `conciliada`; una por 15.000 CLP queda `con_discrepancia`.

**Escenarios de Aceptación**:
1. **Dada** una OC con recepciones, **cuando** se registra una factura que coincide con el valor recibido, **entonces** queda `conciliada` y se calcula su fecha de vencimiento legal.
2. **Dada** una factura cuyo cobro excede la tolerancia, **cuando** se registra, **entonces** queda bloqueada en `con_discrepancia`.
3. **Dada** una factura `con_discrepancia`, **cuando** se intenta aprobarla para pago, **entonces** el sistema lo impide.
4. **Dado** un folio de factura ya registrado para ese proveedor, **cuando** se intenta ingresar nuevamente, **entonces** el sistema evita la duplicidad.
5. **Dado** un proveedor cuya cuenta bancaria cambió hace menos de 30 días, **cuando** se aprueba su factura, **entonces** el sistema emite una alerta de posible riesgo de fraude.

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
