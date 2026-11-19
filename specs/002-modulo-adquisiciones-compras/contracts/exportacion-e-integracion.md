# Contrato de Exportación, Sesión e Integración del Módulo Adquisiciones y Compras

## Propósito

Describir las interfaces que el módulo `002` expone hacia el usuario y hacia otros módulos del ERP: el selector de rol, los permisos, la descarga de CSV y los puntos de integración con el módulo base, Inventario, Contabilidad y RR.HH. El contrato de persistencia interna está en [almacenamiento-compras.md](almacenamiento-compras.md).

## Interfaz de sesión y permisos

- El elemento `#rol-activo` de la barra superior admite exactamente `solicitante`, `comprador`, `bodega`, `jefe_compras` y `admin_ti`. El valor inicial es `solicitante`.
- El evento `change` del selector invoca `setRolActivo(rol)` y vuelve a renderizar la vista; no se recarga la página.
- `getUsuarioActivo()` devuelve el usuario de la semilla asociado al rol activo. `puede(accion, usuario)` consulta `PERMISOS` y `exigirPermiso()` lanza un error en español cuando la acción no está permitida.
- Las acciones con restricción son: crear y aprobar solicitudes, gestionar proveedores, editar datos bancarios, emitir OC, gestionar cotizaciones, registrar recepciones, registrar y aprobar facturas, registrar y aprobar devoluciones, gestionar catálogo, evaluar proveedores y exportar.
- La edición de datos bancarios es exclusiva de `admin_ti`. La visibilidad sin enmascarar de RUT de persona natural y número de cuenta corresponde a `admin_ti` y `jefe_compras`, según `COMPRAS_PARAMETROS.datosBancarios`. Ninguna otra vista, búsqueda, mensaje ni exportación puede entregar el valor completo (FR-004 y FR-025).

## Interfaz de exportación CSV

### Operaciones

- `generarCSV(columnas, filas)`: devuelve el contenido completo del archivo.
- `descargarCSV(nombre, contenido)`: crea el Blob, dispara la descarga y libera la URL temporal.
- `exportarListado(nombre, filas, columnas, { descargar })`: compone y, por defecto, descarga el archivo.
- `exportarProveedores({ filas, filtro, descargar, usuario })`, `exportarSolicitudes(usuario, { filtro, descargar })`, `exportarOrdenes({ filas, filtro, descargar })`, `exportarRecepciones({ filas, filtro, descargar })` y `exportarFacturas({ filas, filtro, descargar })` son los puntos de entrada usados por los botones **Exportar CSV** de cada pestaña.

### Formato del archivo

| Aspecto               | Regla                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Codificación          | UTF-8 con marca de orden de bytes (BOM) al inicio                                                                   |
| Separador de columnas | Punto y coma (`;`)                                                                                                  |
| Fin de fila           | CRLF (`\r\n`), incluida la última fila                                                                              |
| Cabecera              | Primera fila, con rótulos en español definidos en `COLUMNAS_*`                                                      |
| Escapado              | Los valores con `"`, `;`, salto de línea o coma se envuelven en comillas dobles y las comillas internas se duplican |
| Seguridad             | Un valor que empieza con `=`, `+`, `-` o `@` y no es numérico se prefija con `'` para evitar fórmulas               |
| Nombres de archivo    | `proveedores.csv`, `solicitudes.csv`, `ordenes-compra.csv`, `recepciones.csv` y `facturas.csv`                      |
| Valores vacíos        | Cadena vacía; una cuenta sin registrar se muestra como `No registrado` en la vista, nunca como un número inventado  |

### Reglas de contenido

- Solo se exportan los registros que el rol activo ya puede ver, aplicando el mismo filtro que la pantalla (FR-024).
- Los proveedores se transforman con `vistaProveedor()` antes de exportarse: la columna `RUT` contiene el valor enmascarado para roles sin permiso. No se exporta el número de cuenta bancaria.
- Si el entorno no dispone de `Blob` o `URL.createObjectURL` (por ejemplo, en pruebas), `descargarCSV()` devuelve el contenido sin lanzar un error.

## Interfaz de integración con otros módulos

| Vínculo             | Estado en el MVP | Contrato                                                                                                                                                  |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Módulo base (`001`) | Activo           | Proveedores se guardan como Entidades y las OC como Documentos; se respeta [entity-storage.md](../../../001-erp-base-module/contracts/entity-storage.md). |
| Inventario          | Simultado        | `erp_compras:productos` es de solo lectura; las cantidades aceptadas de una recepción son la señal que Inventario deberá usar para aumentar el stock.     |
| Contabilidad        | Simulada         | Una factura `aprobada_pago` representa la cuenta por pagar; el pago real y el asiento contable quedan fuera del módulo.                                   |
| RR.HH.              | Simulado         | `erp_compras:usuarios` y `erp_compras:centros_costo` son maestros de solo lectura; el rol simulado sustituye a la autenticación real.                     |
| SII                 | Fuera de alcance | Las facturas y notas de crédito se ingresan manualmente; no hay descarga de documentos tributarios electrónicos.                                          |

Los identificadores de producto, proveedor, usuario y centro de costo se comparten entre módulos. No hay llamadas de red: toda la integración futura debe realizarse conservando esos identificadores y los formatos de fecha `YYYY-MM-DD`.

## Expectativas de compatibilidad

- Un cambio en el separador, la codificación o el orden de las columnas debe revisarse contra SC-010 y actualizar las pruebas de `tests/unit/compras/exportacion.test.js`.
- Un cambio en `PERMISOS` o en `COMPRAS_PARAMETROS.datosBancarios` debe reflejarse en la vista, en el guardado de proveedores, en el CSV y en las pruebas de no exposición (SC-009).
- Un cambio en las claves o en la forma de los registros debe revisarse contra [almacenamiento-compras.md](almacenamiento-compras.md) antes de afectar a otros módulos.
- La interfaz debe seguir los patrones visuales y de mensajes del módulo base, incluidos estados vacíos y errores en español (principio III de la constitución).
