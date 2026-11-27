# Contrato de Exportación, Sesión e Integración del Módulo Adquisiciones y Compras

## Propósito

Describir las interfaces que el módulo `002` expone hacia el usuario y hacia otros módulos del ERP: la sesión con rol fijo, los permisos, la descarga de CSV y los puntos de integración con el módulo base, Inventario, Contabilidad y RR.HH. El contrato de persistencia interna está en [almacenamiento-compras.md](almacenamiento-compras.md).

## Interfaz de sesión y permisos

- El rol de la sesión es uno de `solicitante`, `comprador`, `bodega`, `jefe_compras` y `admin_ti`, se elige en la pantalla de ingreso (`iniciarSesion(rol, nombre, clave)`) y queda fijo hasta `cerrarSesion()` (FR-037). `solicitante`, `comprador`, `jefe_compras` y `bodega` exigen un nombre que corresponda a un usuario semilla de ese rol; `admin_ti` ingresa solo por su rol por ser el único usuario de ese rol. En Modo Real la identidad se resuelve por correo o RUT para cualquier usuario.
- La barra superior no tiene un selector de rol: el antiguo `#rol-activo` se reemplaza por un indicador de solo lectura con el usuario y el rol de la sesión, junto al botón **Cerrar sesión**. Ningún evento de la interfaz cambia el rol de una sesión iniciada.
- `setRolActivo(rol)` no modifica el rol de una sesión iniciada: devuelve la sesión vigente sin cambios. Para usar otro rol se cierra sesión y se ingresa de nuevo; al ingresar, la aplicación abre el Panel del rol (FR-034).
- `getUsuarioActivo()` devuelve el usuario de la semilla con que se inició la sesión. `puede(accion, usuario)` consulta `PERMISOS` y `exigirPermiso()` lanza un error en español cuando la acción no está permitida.
- Las acciones con restricción y los roles autorizados en `PERMISOS` son:

  | Acción                                                                                                                         | Roles                                         |
  | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
  | `crear_solicitud`                                                                                                              | Los cinco roles; cada usuario edita solo sus propias solicitudes |
  | `aprobar_solicitud`, `aprobar_pago`, `aprobar_devolucion`                                                                      | `jefe_compras`                                |
  | `gestionar_proveedores`, `gestionar_cotizaciones`, `emitir_oc`, `registrar_factura`, `conciliar_factura`, `gestionar_catalogo` | `comprador`                                   |
  | `evaluar_proveedor`                                                                                                            | `comprador`, `jefe_compras`                   |
  | `registrar_recepcion`, `registrar_devolucion`                                                                                  | `bodega`                                      |
  | `editar_datos_bancarios`, `desbloquear_proveedor` (nueva), `exportar_trazabilidad` (nueva)                                     | `admin_ti`                                    |
  | `consultar_trazabilidad` (nueva)                                                                                               | `jefe_compras`, `admin_ti`                    |
  | `exportar`                                                                                                                     | Los cinco roles, sobre lo que pueden ver      |

  La visibilidad de cada vista (opera / solo lectura / no ve) se resuelve con la matriz de FR-033; `PERMISOS` solo gobierna las acciones.
- La regla "quien emite la OC no la recibe" se valida aparte de `PERMISOS` y sin excepciones por rol (FR-014).
- `aprobar_solicitud` exige además que el aprobador sea distinto del solicitante; la solicitud creada por un `jefe_compras` la aprueba otro `jefe_compras` (FR-006, regla 8).
- La edición de datos bancarios es exclusiva de `admin_ti`. La visibilidad se resuelve con la matriz de `src/compras/visibilidad.js`: RUT personal completo solo para `admin_ti` (parcial en auditoría para `jefe_compras`), RUT tributario completo para `comprador`, `jefe_compras` y `admin_ti` (solo recepciones/guías para `bodega`, oculto para `solicitante`) y cuenta completa solo para `jefe_compras` y `admin_ti`. Ninguna otra vista, búsqueda, mensaje ni exportación puede entregar el valor completo (FR-004, FR-025, SC-009).

## Interfaz de navegación

- La barra lateral se agrupa en Panel / **Adquisiciones** (Proveedores, Catálogo, Evaluaciones) / **Compras** (Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, Devoluciones); los grupos sin vistas visibles para el rol se ocultan (FR-034).
- El encabezado muestra la sección actual con el formato "Grupo › Vista" (FR-036).
- Cada acción rápida se rotula con una descripción legible para el usuario, nunca con la clave de `PERMISOS` (FR-036).
- No existe la tarjeta "Sesión activa": el usuario y el rol se ven solo en el indicador de solo lectura de la barra superior (FR-036, FR-037).

## Interfaz de exportación CSV

### Operaciones

- `generarCSV(columnas, filas)`: devuelve el contenido completo del archivo.
- `descargarCSV(nombre, contenido)`: crea el Blob, dispara la descarga y libera la URL temporal.
- `exportarListado(nombre, filas, columnas, { descargar })`: compone y, por defecto, descarga el archivo.
- `exportarProveedores({ filas, filtro, descargar, usuario })`, `exportarSolicitudes(usuario, { filtro, descargar })`, `exportarOrdenes({ filas, filtro, descargar })`, `exportarRecepciones({ filas, filtro, descargar })`, `exportarFacturas({ filas, filtro, descargar })` y `exportarTrazabilidad({ entidad, entidad_id, filtro, descargar, usuario })` son los puntos de entrada usados por los botones **Exportar CSV** de cada pestaña y por la cadena documental.

### Formato del archivo

| Aspecto               | Regla                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Codificación          | UTF-8 con marca de orden de bytes (BOM) al inicio                                                                   |
| Separador de columnas | Punto y coma (`;`)                                                                                                  |
| Fin de fila           | CRLF (`\r\n`), incluida la última fila                                                                              |
| Cabecera              | Primera fila, con rótulos en español definidos en `COLUMNAS_*`                                                      |
| Escapado              | Los valores con `"`, `;`, salto de línea o coma se envuelven en comillas dobles y las comillas internas se duplican |
| Seguridad             | Un valor que empieza con `=`, `+`, `-` o `@` y no es numérico se prefija con `'` para evitar fórmulas               |
| Nombres de archivo    | `proveedores.csv`, `solicitudes.csv`, `ordenes-compra.csv`, `recepciones.csv`, `facturas.csv` y `trazabilidad.csv` (historial, solo `admin_ti`) |
| Valores vacíos        | Cadena vacía; `cuenta_visible` es `No registrado` sin cuenta y `No disponible` con cuenta sin acceso, nunca un número inventado |

### Reglas de contenido

- Solo se exportan los registros que el rol activo ya puede ver, aplicando el mismo filtro que la pantalla (FR-024).
- Un rol con solo lectura exporta lo que ve; si el rol no ve la vista, no hay botón **Exportar CSV**. El historial de trazabilidad solo lo exporta `admin_ti`.
- Los proveedores se transforman con `vistaProveedor()` antes de exportarse: la columna `RUT` contiene `rut_visible` y la columna `Cuenta` contiene `cuenta_visible`, ambos según la matriz de `visibilidad.js` para el rol y el canal. Las solicitudes, recepciones y trazabilidad exportan el RUT personal de empleados mediante `datosUsuario()`, que ya aplica la matriz.
- Si el entorno no dispone de `Blob` o `URL.createObjectURL` (por ejemplo, en pruebas), `descargarCSV()` devuelve el contenido sin lanzar un error.

## Interfaz de integración con otros módulos

| Vínculo             | Estado en el MVP | Contrato                                                                                                                                                  |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Módulo base (`001`) | Activo           | Proveedores se guardan como Entidades; las OC viven en `erp_compras:ordenes` con el mismo contrato de almacenamiento. Se respeta [entity-storage.md](../../001-erp-base-module/contracts/entity-storage.md). |
| Inventario          | Simulado         | `erp_compras:productos` es de solo lectura; las cantidades aceptadas de una recepción son la señal que Inventario deberá usar para aumentar el stock.     |
| Contabilidad        | Simulada         | Una factura `aprobada_pago` representa la cuenta por pagar; el pago real y el asiento contable quedan fuera del módulo.                                   |
| RR.HH.              | Simulado         | `erp_compras:usuarios` y `erp_compras:centros_costo` son maestros de solo lectura; el rol simulado sustituye a la autenticación real.                     |
| SII                 | Fuera de alcance | Las facturas y notas de crédito se ingresan manualmente; no hay descarga de documentos tributarios electrónicos.                                          |

Los identificadores de producto, proveedor, usuario y centro de costo se comparten entre módulos. No hay llamadas de red: toda la integración futura debe realizarse conservando esos identificadores y los formatos de fecha `YYYY-MM-DD`.

## Interfaces exactas consumidas por `src/app.js` y `src/module-config.js`

Las rutas y exportaciones siguientes son normativas para la reconstrucción. `src/main.js` importa `boot` desde `./app.js`, y el arranque consume:

| Consumidor             | Ruta importada                | Exportaciones importadas                                                                                                                            |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.js`           | `./module-config.js`          | `loadModuleConfig`, `normalizeConfig`, `setActiveConfig`                                                                                            |
| `src/app.js`           | `./components/shell.js`       | `renderLogo`, `monogramFor`, `applyShellLabels`, `setActiveModule`                                                                                  |
| `src/app.js`           | `./compras/almacenamiento.js` | `cargarSemilla`, `capturarDatosCompras`, `estaAutenticado`, `getSesion`, `getUsuarioActivo`, `inicializarModoReal`, `leer`, `restaurarDatosCompras` |
| `src/app.js`           | `./compras/autenticacion.js`  | `CLAVE_DEMO`, `cerrarSesion`, `iniciarSesionConIdentificador`, `listarDirectorioUsuarios`                                                           |
| `src/app.js`           | `./compras/administracion.js` | `usuarioSuspendido`                                                                                                                                 |
| `src/app.js`           | `./compras/gobernanza.js`     | `guardarDato`, `guardarModo`, `leerDato`, `obtenerModo`                                                                                             |
| `src/app.js`           | `./compras/reglas.js`         | `requiereNombre`                                                                                                                                    |
| `src/app.js`           | `./compras/vista.js`          | `etiquetaRol`, `reiniciarVistaCompras`, `renderComprasView`                                                                                         |
| `src/app.js`           | `./compras/asistente.js`      | `cerrarAsistente`, `reiniciarAsistente`, `sincronizarAsistente`                                                                                     |
| `src/app.js`           | `./compras/cookies.js`        | `inicializarCookiesUI`                                                                                                                              |
| `src/module-config.js` | `./compras/visibilidad.js`    | `puedeVerDatosBancarios` (alias local `puedeVerDatosBancariosVisible`)                                                                               |

`src/module-config.js` exporta `userConfig`, `COMPRAS_PARAMETROS`, `puedeVerDatosBancarios`, `puedeEditarDatosBancarios`, `COMPRAS_CONFIG`, `DEFAULT_CONFIG`, `FIELD_TYPES`, `BASE_FIELDS`, `normalizeConfig`, `setActiveConfig`, `getConfig`, `labelFor` y `loadModuleConfig`. La API de persistencia del núcleo base se detalla en [almacenamiento-compras.md](almacenamiento-compras.md#api-exacta-del-núcleo-base-no-modificar) y no se amplía en este módulo. Está prohibido modificar `src/storage.js`, `tests/unit/storage.test.js` ni `eslint.config.mjs`.

## Expectativas de compatibilidad

- Un cambio en el separador, la codificación o el orden de las columnas debe revisarse contra SC-010 y actualizar las pruebas de `tests/unit/compras/exportacion.test.js`.
- Un cambio en `PERMISOS`, en la matriz de visibilidad (FR-033) o en la matriz sensible de `src/compras/visibilidad.js` (FR-004, FR-025) debe reflejarse en la vista, en el guardado de proveedores, en el CSV y en las pruebas de no exposición (SC-009) y de permisos (SC-015, SC-016).
- Un cambio en las claves o en la forma de los registros debe revisarse contra [almacenamiento-compras.md](almacenamiento-compras.md) antes de afectar a otros módulos.
- La interfaz debe seguir los patrones visuales y de mensajes del módulo base, incluidos estados vacíos y errores en español (principio III de la constitución).
