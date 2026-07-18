# Arquitectura

## Capas

```text
frontend/
  HTML/CSS/JS Vanilla
  Modulos de UI
  Cliente API progresivo

backend/
  src/app.js
  routes/
  controllers/
  services/
  repositories/
  accounting/
  middleware/
  validators/
  prisma/
```

## Dominios

- Comercial: ventas, facturas, cotizaciones, clientes y productos.
- Inventario: almacenes, movimientos, Kardex, saldos y costo promedio.
- Compras: proveedores, facturas de proveedor, pagos y cuentas por pagar.
- Tesoreria: caja, bancos, metodos de pago y conciliacion.
- Contabilidad: catalogo de cuentas, periodos, asientos, diario, mayor, balanza y estados financieros.
- Fiscal: ITBIS, NCF, RNC/cedula, secuencias y estructura para reportes 606/607/608/609/IT-1.
- Seguridad: usuarios, roles, permisos y auditoria.

## Principios aplicados

- La base de datos es la fuente principal de datos.
- El frontend no calcula saldos contables oficiales.
- Los estados financieros se derivan exclusivamente de asientos contabilizados.
- Las operaciones criticas deben ejecutarse en transacciones Prisma.
- Los asientos contabilizados no se editan; se revierten.
- La auditoria no tiene flujo normal de eliminacion.

## Integridad

Prisma define claves foraneas, indices unicos, enums de estado y campos `Decimal` para dinero. Las reglas de negocio adicionales se implementan en servicios.
