# Analisis tecnico inicial

Fecha: 2026-07-17

## Estado actual

El proyecto local contiene una aplicacion web Vanilla HTML/CSS/JavaScript en `outputs/`. La interfaz ya esta modularizada por carpetas (`css/`, `js/`, `modules/`, `assets/`) y cubre facturacion, ventas, productos, inventario, clientes, proveedores, compras, caja, reportes y configuracion. La aplicacion funciona como SPA y carga modulos ES desde `js/app.js`.

Se creo una copia conservadora en `frontend/` para mantener la funcionalidad visual actual y separar el nuevo backend.

## Estructura actual detectada

- `outputs/index.html`: entrada de la SPA, dependencias CDN y layout general.
- `outputs/js/app.js`: estado global, navegacion, reglas de ventas, pagos, inventario, anulaciones y exportacion.
- `outputs/js/storage.js`: persistencia principal en `localStorage`, migracion desde una clave anterior y seed de demostracion.
- `outputs/js/utils.js`: utilidades de UI, dinero, fechas, descargas y SweetAlert2.
- `outputs/modules/*.js`: modulos visuales y formularios de cada dominio.
- `outputs/dev-server.js`: servidor estatico local para desarrollo.

## Flujo de datos

El flujo actual es completamente cliente:

1. `loadState()` lee `localStorage`.
2. Los formularios modifican `app.state`.
3. `app.save()` vuelve a guardar el JSON completo.
4. Los modulos recalculan saldos, inventario, pagos y reportes desde ese estado.

## Uso de localStorage

`localStorage` se usa como fuente principal mediante la clave `facturacion-profesional-v2`; tambien se migra desde `facturacion-simple-v1`. Esto es insuficiente para produccion porque no hay concurrencia, seguridad, integridad referencial, auditoria real ni transacciones.

## Dependencias entre modulos

Los modulos dependen de un objeto global `app` que mezcla UI, persistencia y reglas de negocio. Ejemplos:

- `sales.js` llama `app.createDocument()`.
- `inventory.js` llama `app.addInventoryMovement()`.
- `invoices.js` llama `app.addPayment()` y `app.voidDocument()`.
- `reports.js` calcula resultados directamente desde documentos y productos.

## Funciones duplicadas o acopladas

- Calculos financieros se repiten entre frontend y reportes.
- Saldos de clientes se derivan en frontend sin reglas centralizadas.
- Inventario, caja y documentos se actualizan en memoria sin transaccion.
- Las reglas contables no existen como capa separada.

## Datos simulados

`seedState()` crea productos, clientes y proveedores de demostracion en el navegador. Estos datos se reemplazaran por `backend/prisma/seed.js` para PostgreSQL.

## Problemas de seguridad

- No hay autenticacion.
- No hay roles ni permisos.
- No hay auditoria inmutable.
- Cualquier usuario con acceso al navegador puede exportar o reiniciar datos.
- Las validaciones se hacen mayormente en frontend.
- Los datos y saldos pueden editarse desde DevTools.

## Errores de logica e integridad

- El inventario puede quedar inconsistente si falla una operacion a mitad del flujo.
- Los documentos pueden anularse sin asiento de reversion real.
- No se impide contabilizar dos veces porque no existe contabilidad persistida.
- El costo promedio usa `Number`, no decimal exacto.
- No hay periodos cerrados.
- No hay claves foraneas ni restricciones de base de datos.
- No hay control de documentos contabilizados versus borradores.

## Acciones peligrosas detectadas

- Boton `Reiniciar` elimina toda la clave de `localStorage`.
- Eliminacion de proveedores/clientes/productos existe en frontend y depende de validaciones parciales.
- Anulaciones modifican saldos e inventario sin auditoria ni transaccion.

## Riesgos

- Perdida total de datos si el navegador se limpia o se usa otro equipo.
- Manipulacion de ventas, impuestos, saldos o inventario desde el cliente.
- Reportes financieros incorrectos si se calculan desde documentos no contabilizados.
- Imposibilidad de multiusuario real.
- Dificultad para cumplir auditoria y trazabilidad.

## Archivos que seran modificados

- `frontend/index.html`
- `frontend/js/app.js`
- `frontend/js/storage.js`
- `frontend/modules/*`
- `frontend/css/*`

La modificacion del frontend sera progresiva para consumir API REST y usar `localStorage` solo como mecanismo temporal de migracion/exportacion.

## Archivos nuevos

- `backend/package.json`
- `backend/.env.example`
- `backend/src/app.js`
- `backend/src/server.js`
- `backend/src/controllers/*`
- `backend/src/routes/*`
- `backend/src/middleware/*`
- `backend/src/services/*`
- `backend/src/repositories/*`
- `backend/src/accounting/*`
- `backend/src/validators/*`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/scripts/migrate-localstorage.js`
- `backend/tests/*`
- `README.md`
- `INSTALACION.md`
- `ARQUITECTURA.md`
- `MODELO_CONTABLE.md`
- `API.md`
- `SEGURIDAD.md`
- `MIGRACION_LOCALSTORAGE.md`

## Plan de migracion

1. Mantener `frontend/` compatible con la interfaz actual.
2. Crear backend Express con Prisma y PostgreSQL como fuente principal.
3. Implementar autenticacion JWT, bcrypt, roles, permisos y auditoria.
4. Modelar empresas, sucursales, usuarios, productos, clientes, proveedores, documentos, pagos, inventario, caja/bancos y contabilidad.
5. Crear script `migrate-localstorage.js` que lea un JSON exportado del sistema anterior y lo inserte en PostgreSQL validando duplicados.
6. Cambiar progresivamente `frontend/js/storage.js` hacia `apiClient` y mantener exportacion JSON administrativa para migracion.
7. Migrar reportes financieros para que lean asientos contabilizados y no documentos comerciales crudos.

## Decisiones tecnicas adoptadas

- Backend Node.js con Express.
- PostgreSQL como base principal.
- Prisma como ORM y fuente de migraciones.
- Montos financieros con `Decimal` en Prisma; en servicios se manejan como strings/Decimal, no como `Number` para persistencia.
- JWT para sesiones API.
- bcrypt para contrasenas.
- Permisos en backend por modulo y accion.
- Auditoria append-only sin ruta de eliminacion normal.
- Motor contable central `AccountingEngine`.
- Reglas contables configurables en base de datos.
- Transacciones Prisma para operaciones criticas.
- Frontend conservado y movido a `frontend/`.

## Limitacion de esta auditoria

La carpeta local no esta configurada como clon Git limpio del repositorio remoto `Pinguino01/DM-SIS`; por tanto, el analisis se basa en los archivos presentes en el workspace local. La estructura creada queda preparada para sincronizarse con el repositorio remoto.
