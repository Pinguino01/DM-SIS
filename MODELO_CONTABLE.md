# Modelo contable

## Catalogo de cuentas

El catalogo inicial se crea en `backend/prisma/seed.js` e incluye:

- Activo.
- Pasivo.
- Patrimonio.
- Ingresos.
- Costos.
- Gastos.

Cada cuenta define:

- Codigo unico por empresa.
- Tipo.
- Naturaleza deudora o acreedora.
- Nivel jerarquico.
- Si permite movimientos.
- Si es cuenta del sistema.
- Estado activo/inactivo.

## Periodos

Los periodos contables son mensuales y anuales por empresa:

- `OPEN`
- `SOFT_CLOSED`
- `CLOSED`

El motor impide contabilizar en periodos cerrados.

## Asientos

Estados:

- `DRAFT`
- `PENDING_APPROVAL`
- `POSTED`
- `REVERSED`
- `VOID`

Validaciones:

- Debe = Haber.
- Una linea no puede tener Debe y Haber al mismo tiempo.
- No se aceptan lineas en cero.
- No se usan cuentas inactivas.
- No se usan cuentas agrupadoras.
- No se contabiliza en periodo cerrado.

## Motor contable

`backend/src/accounting/accountingEngine.js` centraliza:

- Validacion de asientos.
- Busqueda de periodo.
- Validacion de cuentas.
- Creacion y contabilizacion.
- Reversion.

Los modulos comerciales no deben codificar cuentas directamente. Deben pasar por reglas contables o configuracion.

## Estados financieros

Los endpoints iniciales calculan:

- Balanza de comprobacion.
- Balance general.
- Estado de resultados.

Siempre desde asientos `POSTED`.
