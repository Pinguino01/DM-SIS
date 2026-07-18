# Migracion desde localStorage

El sistema anterior guardaba datos completos en el navegador usando:

- `facturacion-profesional-v2`
- `facturacion-simple-v1`

## Exportar

Desde la version frontend anterior usar el boton de exportacion JSON. Esa opcion debe quedar restringida a administradores cuando se conecte completamente a la API.

## Importar hacia PostgreSQL

```powershell
cd backend
npm run migrate:localstorage -- ..\facturacion-backup.json
```

## Datos contemplados

- Clientes.
- Productos.
- Proveedores.

El script queda preparado para extenderse a:

- Inventario.
- Facturas.
- Pagos.
- Compras.
- Configuracion.

## Reglas

- Valida que existan arreglos requeridos.
- Inserta registros por empresa existente.
- No ignora errores silenciosamente.
- Genera resumen JSON.
- Devuelve codigo de salida distinto de cero si hay errores.

## Recomendacion

Antes de migrar:

1. Respaldar PostgreSQL.
2. Respaldar el JSON original.
3. Probar en una base staging.
4. Revisar el resumen de errores.
