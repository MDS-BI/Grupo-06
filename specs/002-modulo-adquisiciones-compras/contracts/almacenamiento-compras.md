# Contrato de Almacenamiento del Módulo Adquisiciones y Compras

## Propósito

Definir las claves, la forma de los registros y las operaciones de persistencia propias de la funcionalidad `002`. Este contrato complementa, sin reemplazar, el [contrato de entidades y documentos del módulo base](../../../001-erp-base-module/contracts/entity-storage.md). Los proveedores se guardan como Entidades del template; el resto de las colecciones viven en `localStorage` bajo el prefijo `erp_compras:`.

## Claves y colecciones

| Clave de `localStorage`     | Contenido                                                           | Origen      |
| --------------------------- | ------------------------------------------------------------------- | ----------- |
| `erp_base_module:entities`  | Proveedores (Entidad del template con campos personalizados)        | Módulo base |
| `erp_base_module:documents` | Documentos genéricos del template, sin uso en las vistas del módulo | Módulo base |
| `erp_compras:usuarios`      | Usuarios simulados con rol y centro de costo                        | Módulo 002  |
| `erp_compras:centros_costo` | Centros de costo de solo lectura                                    | Módulo 002  |
| `erp_compras:productos`     | Catálogo maestro de productos de solo lectura                       | Módulo 002  |
| `erp_compras:solicitudes`   | Solicitudes de compra con `lineas`                                  | Módulo 002  |
| `erp_compras:cotizaciones`  | Cotizaciones de proveedores con `lineas`                            | Módulo 002  |
| `erp_compras:ordenes`       | Órdenes de compra con `lineas`                                      | Módulo 002  |
| `erp_compras:recepciones`   | Recepciones con `lineas`                                            | Módulo 002  |
| `erp_compras:facturas`      | Facturas y notas de crédito                                         | Módulo 002  |
| `erp_compras:devoluciones`  | Devoluciones con `lineas`                                           | Módulo 002  |
| `erp_compras:catalogo`      | Relación proveedor-producto con precio de referencia                | Módulo 002  |
| `erp_compras:evaluaciones`  | Evaluaciones de desempeño por orden                                 | Módulo 002  |
| `erp_compras:trazabilidad`  | Eventos inmutables de auditoría y cadena documental                 | Módulo 002  |
| `erp_compras:meta`          | Estado de carga de la semilla (`semilla_cargada`)                   | Módulo 002  |
| `erp_compras:sesion`        | Usuario y rol de la sesión simulada, fijos hasta cerrar sesión      | Módulo 002  |

Toda clave se construye con `clave(nombre)`, que antepone `erp_compras:` al nombre de la colección. Las claves del módulo base nunca se modifican desde este contrato.

## Forma de los datos

- Cada registro incluye un `id` único. Los registros que además pueden vincularse a documentos del template incluyen `entity_id`.
- Los tipos de fecha de calendario son cadenas `YYYY-MM-DD`; las marcas de tiempo ISO se guardan en `createdAt` y `updatedAt`.
- Las cantidades y montos son números en CLP enteros. El desglose de productos se guarda como arreglo `lineas` dentro de su documento padre; cada línea conserva su identificador para que recepciones y devoluciones puedan apuntar a ella.
- Los documentos del ciclo incluyen `estado` y, cuando se anulan, `motivo_anulacion`. Los eventos de `trazabilidad` guardan `entidad`, `entidad_id`, `accion`, `estado_anterior`, `estado_nuevo`, `usuario_id`, `rol_usuario`, `detalle` y `fecha_hora`.
- Los campos completos, tipos y restricciones están en el [diccionario de datos](../data-model.md#3-diccionario-de-datos); este contrato no los duplica.
- Los datos sensibles se entregan a la interfaz ya enmascarados mediante `vistaProveedor()`. Ninguna colección debe considerar la máscara como valor almacenado: el número completo solo existe en el registro original y en la sesión con permiso.

## Operaciones

- `leer(nombre)`: devuelve la lista de la colección; si no existe, devuelve `[]`.
- `guardar(nombre, lista)`: persiste la lista completa y preserva su orden.
- `agregar(nombre, item)`, `buscar(nombre, id)` y `actualizar(nombre, id, cambios)`: altas, lectura puntual y modificaciones; `actualizar` refresa `updatedAt`.
- `puedeEliminar(nombre, id)` y `eliminar(nombre, id)`: impiden borrar documentos con eventos de trazabilidad; en ese caso se debe anular con motivo.
- `limpiarColeccion(nombre)`: deja vacía una colección.
- `cargarSemilla({ forzar, hoy })` y `asegurarSemilla()`: cargan `semilla.json` una sola vez y desplazan sus fechas al día actual. `semillaCargada()` y `marcarSemillaCargada()` controlan el estado en `erp_compras:meta`.
- `reiniciarCompras()`: vacía todas las colecciones propias y marca la semilla como no cargada; la siguiente visita la vuelve a cargar.
- `getSesion()`, `setSesion()`, `getUsuarioActivo()` y `setRolActivo()`: gestionan el usuario y el rol de la sesión simulada. La sesión la escribe `iniciarSesion()` al ingresar; con una sesión iniciada, `setRolActivo()` no cambia el rol y devuelve la sesión vigente (FR-037).
- `puede(accion, usuario)` y `exigirPermiso(accion, usuario)`: resuelven `PERMISOS` y lanzan un error explícito cuando la acción no está permitida; la tabla de acciones por rol está en [exportacion-e-integracion.md](exportacion-e-integracion.md). `admin_ti` no tiene permisos de operación de compras.

## Expectativas de validación

- Un RUT de proveedor debe tener formato válido, dígito verificador correcto y ser único; una condición de pago mayor a 30 días exige acuerdo de plazo mayor (FR-001 y FR-002).
- Un proveedor con órdenes de compra no se elimina: se bloquea (FR-003).
- Un proveedor `bloqueado` solo lo desbloquea `admin_ti`, vuelve a `aprobado` y genera un evento de trazabilidad (FR-004).
- Una solicitud la puede crear un usuario de cualquiera de los cinco roles, solo su autor la edita, requiere al menos una línea, aprobador `jefe_compras` distinto del solicitante (si el solicitante es `jefe_compras`, aprueba otro `jefe_compras`) y motivo al rechazarse (FR-005 y FR-006).
- Una cotización es única por solicitud y proveedor; sobre el umbral se exigen tres cotizaciones o justificación de proveedor único (FR-007 y FR-008).
- No puede existir más de una orden no anulada por solicitud ni más de una por cotización; los proveedores de las OC deben estar aprobados (FR-010 y FR-011).
- Una recepción no puede aceptar más unidades de las pendientes de la línea y no la registra quien emitió la OC, sin excepciones por rol (FR-013 y FR-014).
- Una factura requiere una OC con recepciones, folio único por proveedor y tipo de documento, y se clasifica por la conciliación de tres vías (FR-015 y FR-016).
- Una devolución no puede superar la cantidad aceptada pendiente y descuenta el saldo recibido y facturado; la registra `bodega` y, si quien recibió es quien la registra, exige la aprobación de un `jefe_compras` distinto (FR-031).
- Todo cambio de estado o de datos bancarios genera un evento de trazabilidad; los eventos no se editan ni se eliminan y los datos bancarios se registran enmascarados (FR-027 a FR-030).
- Si `localStorage` no está disponible o falla al escribir, la capa mantiene los datos en memoria y expone un mensaje de error; nunca debe perder silenciosamente lo que el usuario estaba editando.

## Expectativas de extensibilidad

- El prefijo `erp_compras:` permite que otros módulos lean o escriban sus propias colecciones sin colisiones.
- Los campos adicionales que añadan futuras historias se persisten junto a los campos actuales sin cambiar las operaciones `leer`, `guardar`, `agregar`, `actualizar` ni `eliminar`.
- Los identificadores de productos, usuarios y centros de costo coinciden con los del resto del ERP para permitir la integración con Inventario, RR.HH. y Contabilidad.
- El modelo está normalizado en `data-model.md`, por lo que una futura API y base de datos relacional pueden sustituir `localStorage` sin cambiar las reglas de negocio ni los contratos de exportación.
