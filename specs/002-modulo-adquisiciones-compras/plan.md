# Plan de Implementación: Módulo Adquisiciones y Compras

**Rama**: `002-modulo-adquisiciones-compras` | **Fecha**: 2026-10-27 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-adquisiciones-compras/spec.md` y modelo de datos en [data-model.md](data-model.md)

## Resumen

Construir el módulo Adquisiciones y Compras **sobre el módulo base ERP del curso** (`specs/001-erp-base-module`), sin reemplazar su código central. El módulo base ofrece un tipo de dato maestro (Entidad) y un tipo de documento (Documento) que se adaptan desde `src/module-config.js`. El plan aprovecha eso en dos niveles:

1. **Por configuración**: Proveedor se monta sobre la Entidad y Orden de Compra sobre el Documento. Esto entrega rápido una **versión integrada de prueba** que corre dentro del template, como pidió el profesor en el feedback del 26-10-2026.
2. **Por extensión**: solicitudes, cotizaciones, recepciones, facturas, catálogo y evaluaciones necesitan colecciones propias, que se agregan en `src/compras/` siguiendo el mismo contrato de almacenamiento del template (`specs/001-erp-base-module/contracts/entity-storage.md`).

El trabajo se divide en iteraciones semanales; cada una termina con una versión que corre y con avance visible en el repositorio.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS (igual que el template)  
**Dependencias Principales**: Vite; sin framework de interfaz (igual que el template)  
**Almacenamiento**: `localStorage` del navegador; las colecciones nuevas usan el prefijo `erp_compras:`  
**Pruebas**: Vitest con jsdom (ya configurado en `vitest.config.mjs`)  
**Plataforma Objetivo**: Navegadores modernos de escritorio  
**Tipo de Proyecto**: Aplicación web de una página, solo frontend  
**Objetivos de Rendimiento**: Listas y búsquedas instantáneas con hasta 500 registros por colección (mismo objetivo del template)  
**Restricciones**: Sin backend, sin autenticación real, sin conexión con el SII; no modificar el comportamiento del módulo base salvo donde se justifica en "Seguimiento de Complejidad"  
**Escala/Alcance**: 16 entidades lógicas (ver `data-model.md`), 10 historias de usuario, 5 roles simulados

## Verificación de la Constitución

*Según `.specify/memory/constitution.md` v1.0.0.*

- **I. Calidad del código**: la lógica de negocio (cálculos, validaciones y transiciones de estado) vive en funciones puras en `src/compras/reglas.js`, separada de la interfaz y del almacenamiento.
- **II. Pruebas primero**: cada regla de la sección 5 de `data-model.md` tiene prueba unitaria antes o junto con su implementación; cada historia P1 tiene al menos una prueba de integración de su flujo.
- **III. Experiencia de usuario consistente**: todas las pantallas nuevas usan el marco del template (barra superior, barra lateral, tokens de `styles.css`), mensajes de validación en español y estados vacíos.
- **IV. Rendimiento**: las colecciones se leen una vez por pantalla y se filtran en memoria; el objetivo de 500 registros se verifica con los datos semilla ampliados.

Resultado: **pasa**, con las desviaciones justificadas abajo.

## Correspondencia con el template

### Nivel 1: configuración (`src/module-config.js`)

| Concepto del template | En Compras | Mapeo de campos base |
|---|---|---|
| Entidad | Proveedor | `name` = razón social · `code` = código interno (`PRV-001`) · `taxId` = RUT · `email` · `phone` · `address` · `category` = rubro · `paymentTerms` = condición de pago |
| Documento | Orden de compra | `series` = `OC` · `folio` = correlativo · `startDate` = fecha de emisión · `endDate` = fecha de entrega esperada · `subtotal`, `discount`, `taxAmount` (IVA), `totalAmount` · `currency` = `CLP` · `paymentTerms` · `status` |

Configuración propuesta para la iteración 1 (las claves de campos personalizados no chocan con los nombres base del template):

```javascript
export const userConfig = {
  moduleName: "Adquisiciones y Compras",
  labels: {
    entity: "Proveedor", entities: "Proveedores",
    document: "Orden de Compra", documents: "Órdenes de Compra",
  },
  customFields: [
    { target: "entity", key: "giro", label: "Giro", type: "text", required: true },
    { target: "entity", key: "region", label: "Región", type: "text", required: true },
    { target: "entity", key: "tamanoEmpresa", label: "Tamaño de empresa", type: "select",
      options: ["micro", "pequena", "mediana", "grande"] },
    { target: "entity", key: "estadoProveedor", label: "Estado del proveedor", type: "select",
      required: true, options: ["potencial", "aprobado", "bloqueado"] },
    { target: "document", key: "numeroSolicitud", label: "N° de solicitud", type: "text", required: true },
    { target: "document", key: "comprador", label: "Comprador", type: "text", required: true },
  ],
  statusLifecycle: {
    statuses: ["borrador", "emitida", "recibida_parcial", "recibida_total", "cerrada", "anulada"],
    transitions: {
      borrador: ["emitida", "anulada"],
      emitida: ["recibida_parcial", "recibida_total", "anulada"],
      recibida_parcial: ["recibida_total"],
      recibida_total: ["cerrada"],
      cerrada: [],
      anulada: [],
    },
  },
  theme: { accentColor: "#0f766e" },
};
```

Lo que la configuración **no** cubre y queda para el nivel 2: líneas de detalle por producto, cálculo automático de IVA, datos bancarios enmascarados, bloqueo de eliminación de proveedores con OC y validación de RUT.

### Nivel 2: extensión (`src/compras/`)

Cada colección nueva implementa las mismas operaciones del contrato del template (`load…`, `save…`, `add…`, `update…`, `delete…`) sobre su propia clave de `localStorage`. Las tablas de detalle del MER se guardan como arreglo `lineas` dentro de su documento padre, conservando su identificador para que la recepción pueda apuntar a una línea específica de la OC.

| Entidad lógica (MER) | Almacenamiento físico |
|---|---|
| PROVEEDOR | Entidad del template (`erp_base_module:entities`) + campos personalizados |
| ORDEN_COMPRA + DETALLE_OC | Documento del template (`erp_base_module:documents`) + `lineas` |
| SOLICITUD_COMPRA + DETALLE_SOLICITUD | `erp_compras:solicitudes`, con `lineas` |
| COTIZACION_PROVEEDOR + DETALLE_COTIZACION | `erp_compras:cotizaciones`, con `lineas` |
| RECEPCION + DETALLE_RECEPCION | `erp_compras:recepciones`, con `lineas` |
| FACTURA_PROVEEDOR | `erp_compras:facturas` |
| PROVEEDOR_PRODUCTO | `erp_compras:catalogo` |
| EVALUACION_PROVEEDOR | `erp_compras:evaluaciones` |
| CONTACTO_PROVEEDOR | `erp_compras:contactos` |
| USUARIO, CENTRO_COSTO, PRODUCTO | `erp_compras:usuarios`, `erp_compras:centros_costo`, `erp_compras:productos` (datos semilla hasta conectar RR.HH., Contabilidad e Inventario) |

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-modulo-adquisiciones-compras/
├── spec.md          (historias de usuario y requisitos)
├── plan.md          (este archivo)
├── data-model.md    (MER, diccionario de datos, reglas)
└── tasks.md         (siguiente paso: /speckit.tasks)
```

### Código Fuente (raíz del repositorio)

```text
src/
├── module-config.js        (nivel 1: Proveedor y Orden de Compra)
├── ...                     (archivos del módulo base, sin cambios salvo lo justificado)
└── compras/
    ├── reglas.js           (cálculos de montos, validación de RUT, transiciones, conciliación, nota de plazo)
    ├── almacenamiento.js   (colecciones erp_compras:* con el contrato del template)
    ├── solicitudes.js      (pantalla y flujo de solicitudes)
    ├── cotizaciones.js     (registro y comparación)
    ├── recepciones.js
    ├── facturas.js
    ├── catalogo.js
    ├── evaluaciones.js
    ├── panel.js            (indicadores y alertas)
    └── semilla.json        (datos ficticios)

tests/
├── unit/compras/           (una prueba por regla de data-model.md, sección 5)
└── integration/compras/    (un flujo por historia de usuario P1 y P2)
```

**Decisión de Estructura**: todo lo propio del módulo vive en `src/compras/` para no mezclarlo con el módulo base; así se puede actualizar el template sin pisar el trabajo del grupo y otros módulos pueden leer las colecciones `erp_compras:*`.

## Iteraciones (avances semanales)

| Iteración | Fechas | Historias | Resultado esperado |
|---|---|---|---|
| 0. Base corriendo | 28-oct al 1-nov | — | El template se ejecuta con `npm run dev` y pasan sus pruebas (ver dependencia crítica) |
| 1. Versión integrada de prueba | 2 al 8-nov | US1, US3 simplificada, US5 básico | Proveedores y OC operando solo por configuración (el n° de solicitud se ingresa como texto, sin validarlo); panel con conteos |
| 2. Ciclo operativo | 9 al 15-nov | US2, US4, US3 completa | Solicitud → OC → recepción; la OC se valida contra la solicitud aprobada, con líneas e IVA calculado |
| 3. Adquisiciones y cierre del ciclo | 16 al 22-nov | US6, US7, US8 | Cotizaciones, conciliación de facturas, catálogo; demo del ciclo completo |
| 4. Calidad | 23 al 26-nov | US9, US10, indicadores | Evaluación, CSV, README final; congelamiento del repositorio el 26-nov |

Cada historia se asigna a un responsable en un Issue de GitHub con la etiqueta de su iteración; los acuerdos de cada semana se registran en un Issue de seguimiento.

## Dependencia crítica

El repositorio del grupo **no contiene la carpeta `src/`**, aunque el README del template y sus pruebas (`tests/unit/storage.test.js` importa `../../src/storage.js`) la requieren. Antes de la iteración 1 hay que confirmar con los ayudantes si el código base debe regenerarse con Speckit a partir de `specs/001-erp-base-module/tasks.md` o si falta subirlo. Hasta resolverlo, la iteración 1 no puede ejecutarse.

## Plan de Pruebas

- **Unitarias** (`tests/unit/compras/`): cálculo de neto, IVA y total con redondeo; validación de RUT; transiciones permitidas y prohibidas de cada estado; regla de 3 cotizaciones; tope de recepción por línea; conciliación con y sin discrepancia; nota de plazo según días de atraso; plazo de pago máximo sin acuerdo.
- **Integración** (`tests/integration/compras/`): un flujo por historia P1 y P2 siguiendo sus escenarios de aceptación de `spec.md`.
- **Manual**: guion de la demo de 5 minutos del criterio SC-002.

## Datos Semilla

Todos ficticios: 4 centros de costo, 6 usuarios (uno por rol y un segundo solicitante), 8 proveedores (al menos uno de cada tamaño, uno bloqueado y uno con cuenta bancaria cambiada hace menos de 30 días), 20 productos, y solicitudes, cotizaciones, OC, recepciones y facturas en todos los estados para que cada pantalla y alerta tenga algo que mostrar.

## Escalabilidad y Desarrollo Futuro

- **Backend**: `localStorage` limita el almacenamiento a un navegador y a pocos MB. El MER está normalizado para migrarse sin cambios conceptuales a una base de datos relacional con una API.
- **Autenticación y auditoría**: los roles simulados deben pasar a usuarios reales, y los cambios sensibles (datos bancarios, aprobaciones) a un historial de auditoría.
- **SII**: recibir automáticamente los documentos tributarios electrónicos en lugar de ingresar facturas a mano.
- **Integración**: solicitudes automáticas de reposición desde Inventario y control de presupuesto por centro de costo desde Contabilidad.
- **Multiempresa**: agregar un identificador de empresa a cada colección.

## Seguimiento de Complejidad

| Desviación del módulo base | Por qué es necesaria | Alternativa más simple descartada |
|---|---|---|
| Colecciones adicionales fuera de Entidad/Documento | El ciclo de compras tiene 5 documentos encadenados; el template solo modela uno | Forzar todo como Documento con un campo "tipo" mezclaría estados y reglas incompatibles |
| Bloquear la eliminación en cascada de proveedores con OC | El template borra los documentos de una entidad eliminada; en compras eso destruiría la trazabilidad de órdenes y facturas | Advertir y borrar igual: inaceptable para auditoría |
| Líneas de detalle dentro de la OC | El template no tiene partidas; su propio data-model las señala como punto de extensión | Una OC por producto: no refleja cómo compra una empresa |
