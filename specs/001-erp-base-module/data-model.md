# Modelo de Datos: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

## Entidad: Entity (registro de datos maestros)

Representa el dato maestro central del módulo (p. ej., cliente, proveedor, artículo) con su identidad fiscal, contacto y condiciones comerciales.

| Campo        | Tipo   | Descripción                                                                                                                                        | Restricciones                                                       |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| id           | string | Identificador interno único del registro de entidad                                                                                                | Obligatorio, generado automáticamente                               |
| entity_id    | string | Identificador público usado para vincular documentos a esta entidad                                                                                | Obligatorio, generado automáticamente, único                        |
| name         | string | Nombre o razón social de la entidad                                                                                                                | Obligatorio, no vacío                                               |
| code         | string | Código o clave de negocio que identifica la entidad                                                                                                | Obligatorio, no vacío                                               |
| taxId        | string | Identificación fiscal de la entidad (p. ej., RFC, NIT, CUIT)                                                                                       | Opcional; se almacena recortada cuando se proporciona               |
| email        | string | Correo electrónico principal de contacto                                                                                                           | Opcional; debe tener formato de correo válido si se proporciona     |
| phone        | string | Teléfono de contacto                                                                                                                               | Opcional                                                            |
| address      | string | Dirección fiscal o comercial                                                                                                                       | Opcional                                                            |
| category     | string | Clasificación opcional como tipo, grupo o clase                                                                                                    | Opcional                                                            |
| description  | string | Descripción corta o notas                                                                                                                          | Opcional                                                            |
| targetDate   | string | Fecha objetivo opcional en formato YYYY-MM-DD; los módulos personalizados definen su significado (p. ej., fecha de vencimiento, fecha de revisión) | Opcional, debe ser una fecha de calendario válida si se proporciona |
| creditLimit  | number | Límite de crédito extendido a la entidad en la moneda configurada                                                                                  | Opcional, debe ser un número no negativo                            |
| paymentTerms | string | Condiciones de pago acordadas (p. ej., contado, neto 30)                                                                                           | Opcional                                                            |
| createdAt    | string | Marca de tiempo de cuándo se creó la entidad                                                                                                       | Obligatorio                                                         |
| updatedAt    | string | Marca de tiempo de la última actualización de la entidad                                                                                           | Obligatorio                                                         |

## Entidad: Document (registro transaccional)

Representa un documento transaccional vinculado a una entidad (p. ej., pedido, factura, contrato), identificado por serie y folio y con desglose económico.

| Campo        | Tipo   | Descripción                                                                      | Restricciones                                                                                |
| ------------ | ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| id           | string | Identificador único del documento                                                | Obligatorio, generado automáticamente                                                        |
| entity_id    | string | Identificador de la entidad a la que pertenece este documento                    | Obligatorio, debe referenciar el entity_id de una entidad existente                          |
| series       | string | Serie del documento (p. ej., FAC, A, NV) que agrupa folios consecutivos          | Opcional                                                                                     |
| folio        | number | Folio consecutivo que, junto con la serie, forma el número oficial del documento | Obligatorio, debe ser un entero positivo                                                     |
| startDate    | string | Fecha de inicio en formato YYYY-MM-DD                                            | Obligatorio, debe ser una fecha de calendario válida                                         |
| endDate      | string | Fecha de fin en formato YYYY-MM-DD                                               | Obligatorio, debe ser una fecha de calendario válida, debe ser igual o posterior a startDate |
| quantity     | number | Cantidad asociada al documento                                                   | Opcional, debe ser un entero positivo                                                        |
| subtotal     | number | Importe antes de descuentos e impuestos                                          | Opcional, debe ser un número no negativo                                                     |
| discount     | number | Descuento aplicado sobre el subtotal                                             | Opcional, debe ser un número no negativo y no puede superar el subtotal                      |
| taxAmount    | number | Impuesto calculado para el documento                                             | Opcional, debe ser un número no negativo                                                     |
| totalAmount  | number | Importe total del documento en la moneda configurada                             | Opcional, debe ser un número no negativo                                                     |
| currency     | string | Código de moneda para los importes del documento (p. ej., MXN, USD, EUR)         | Opcional                                                                                     |
| paymentTerms | string | Condiciones de pago del documento (p. ej., contado, neto 30)                     | Opcional                                                                                     |
| notes        | string | Notas u observaciones libres del documento                                       | Opcional                                                                                     |
| status       | string | Estado del documento como borrador, pendiente, aprobado o cancelado              | Opcional                                                                                     |
| createdAt    | string | Marca de tiempo de cuándo se creó el documento                                   | Obligatorio                                                                                  |
| updatedAt    | string | Marca de tiempo de la última actualización del documento                         | Obligatorio                                                                                  |

## Entidad: ModuleConfig

Objeto de configuración cargado al arrancar que adapta el módulo base en un módulo específico.

| Campo           | Tipo   | Descripción                                                                                                                                                                                               | Restricciones                                                                    |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| moduleName      | string | Nombre visible del módulo adaptado                                                                                                                                                                        | Obligatorio, no vacío                                                            |
| labels          | object | Mapeos de términos como `{ entity: "Cliente", entities: "Clientes", document: "Pedido de Venta", documents: "Pedidos de Venta" }`                                                                         | Opcional; retrocede a Entidad/Documento                                          |
| customFields    | array  | Definiciones de campos por tipo de registro: `{ target: "entity"\|"document", key, label, type: "text"\|"number"\|"date"\|"select", required: boolean, options?: string[] }`                              | Opcional; las claves NO DEBEN chocar con nombres de campos base                  |
| statusLifecycle | object | Estados ordenados y transiciones permitidas para documentos, p. ej., `{ statuses: ["cotización", "pedido", "facturado"], transitions: { cotización: ["pedido"], pedido: ["facturado"], facturado: [] } }` | Opcional                                                                         |
| theme           | object | Opciones de marca, p. ej., `{ accentColor: "#0f62fe" }`; aplicado como propiedad personalizada de CSS en todo el marco del espacio de trabajo                                                             | Opcional; accentColor debe ser un color CSS válido o retrocede al predeterminado |

## Reglas de ModuleConfig

- La configuración se carga una vez al arrancar y se aplica en todas las pantallas.
- Cuando la configuración está ausente, se aplican los valores predeterminados integrados: etiquetas Entidad/Documento, sin campos personalizados, estado de texto libre, color de acento predeterminado.
- Los valores inválidos o conflictivos deben informarse con claridad en lugar de fallar silenciosamente.
- Las claves de campos personalizados no deben chocar con los nombres de campos base (`id`, `entity_id`, `name`, `code`, `taxId`, `email`, `phone`, `address`, `category`, `description`, `targetDate`, `creditLimit`, `paymentTerms`, `series`, `folio`, `startDate`, `endDate`, `quantity`, `subtotal`, `discount`, `taxAmount`, `totalAmount`, `currency`, `notes`, `status`).
- Los valores de campos personalizados se persisten junto a los campos base sin cambios de esquema en el almacenamiento.
- Un ciclo de vida configurado reemplaza la entrada de estado de texto libre; sin uno, el estado permanece como texto libre.

## Reglas de Validación

### Entidad

- Una entidad debe incluir un nombre no vacío.
- Una entidad debe incluir un código no vacío.
- La identificación fiscal, teléfono, dirección, categoría, descripción y condiciones de pago son opcionales pero deben almacenarse como cadenas recortadas.
- El correo electrónico es opcional pero, cuando está presente, debe tener formato de correo válido.
- El límite de crédito es opcional pero, cuando está presente, debe ser un número no negativo.
- La fecha objetivo es opcional pero, cuando está presente, debe ser una fecha de calendario válida en formato YYYY-MM-DD.
- Un entity_id debe generarse automáticamente y debe ser único entre todas las entidades.

### Documento

- Un documento debe referenciar una entidad existente mediante entity_id.
- Un documento debe incluir un folio entero positivo; la serie es opcional y, cuando existe, se combina con el folio para formar el número oficial del documento (p. ej., `FAC-1001`).
- Un documento debe incluir fechas de inicio y fin válidas; la fecha de fin debe ser igual o posterior a la fecha de inicio.
- La cantidad es opcional y debe ser un entero positivo.
- Subtotal, descuento, impuesto e importe total son opcionales y deben ser números no negativos; el descuento no puede superar el subtotal.
- La aplicación debe normalizar el texto para un comportamiento de búsqueda consistente.

> Nota: el cálculo automático de totales (p. ej., `total = subtotal - descuento + impuesto`) queda como punto de extensión; el módulo base valida cada importe de forma independiente para evitar sorpresas por redondeo.

## Relaciones

- Cada entidad se almacena independientemente y aparece como una única fila en la lista de entidades.
- Cada entidad tiene un entity_id usado para conectarse a sus documentos.
- Cada documento pertenece exactamente a una entidad, vinculada por el entity_id de la entidad.
- Cuando se elimina una entidad, todos los documentos que referencian su entity_id también se eliminan.
- Las operaciones de búsqueda se realizan sobre los registros de entidad almacenados, incluyendo identidad fiscal, contacto y condiciones comerciales.

## Notas de Extensibilidad

- Los módulos personalizados pueden añadir campos específicos del dominio a cualquiera de los dos tipos de registro; los campos base anteriores deben mantener sus nombres y semántica para que el almacenamiento, la validación y la integridad referencial permanezcan intactos.
- El campo `status` es intencionadamente de texto libre a nivel base para que cada módulo personalizado pueda imponer su propio ciclo de vida (p. ej., estados de pedidos, estados de aprobación).
- La unicidad de folio por serie, las partidas de documento (líneas con producto, cantidad y precio) y la numeración automática son puntos de extensión naturales para módulos que los requieran.
