# Seguridad

## Autenticacion

- Contrasenas cifradas con bcrypt.
- JWT con expiracion configurable.
- Registro de ultimo acceso.
- Cambio de contrasena.
- Usuario inactivo bloqueado en middleware.

## Permisos

Los permisos se validan en backend con:

```text
module:action
```

Ejemplos:

- `sales:create`
- `accounting:reverse`
- `configuration:admin`

No se depende de ocultar botones en frontend.

## Auditoria

La bitacora registra:

- Usuario.
- IP cuando esta disponible.
- Accion.
- Modulo.
- Entidad.
- ID.
- Valores anteriores/nuevos.
- Motivo.
- Documento relacionado.

La auditoria no tiene ruta de borrado normal.

## Recomendaciones de produccion

- Cambiar `JWT_SECRET`.
- Cambiar credenciales demo.
- Usar HTTPS.
- Restringir CORS.
- Configurar backups PostgreSQL.
- Proteger directorio de adjuntos.
- Revisar permisos por rol antes de operar.
