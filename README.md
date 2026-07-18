# DM-SIS

Sistema administrativo integrado para facturacion, inventario, compras, tesoreria y contabilidad.

## Estructura

```text
DM-SIS/
├── frontend/          # Interfaz Vanilla HTML/CSS/JS conservada desde el sistema actual
├── backend/           # API REST Express + Prisma + PostgreSQL
├── outputs/           # Version previa conservada como referencia/compatibilidad
├── ANALISIS_TECNICO.md
├── INSTALACION.md
├── ARQUITECTURA.md
├── MODELO_CONTABLE.md
├── API.md
├── SEGURIDAD.md
└── MIGRACION_LOCALSTORAGE.md
```

## Estado de esta entrega

Esta fase crea la base profesional del sistema:

- Backend Express.
- Prisma/PostgreSQL.
- Autenticacion JWT con bcrypt.
- Roles y permisos por modulo/accion.
- Auditoria append-only.
- Modelo de datos para empresas, sucursales, usuarios, clientes, proveedores, productos, inventario, caja/bancos y contabilidad.
- Catalogo de cuentas inicial para Republica Dominicana.
- Periodos contables.
- Asientos y validacion Debe = Haber.
- Libro diario, mayor, balanza y estados financieros iniciales desde asientos contabilizados.
- Script de migracion desde JSON exportado de localStorage.
- Pruebas unitarias base de reglas financieras.

## Inicio rapido

Ver [INSTALACION.md](./INSTALACION.md).

Credenciales demo tras ejecutar el seed:

- Usuario: `admin@dm-sis.local`
- Contrasena: `Demo12345!`

Debe cambiarse en cualquier entorno real.

## Nota fiscal

El sistema esta preparado para RNC/cedula, NCF, ITBIS, secuencias y reportes fiscales dominicanos. No debe considerarse cumplimiento fiscal oficial hasta ser validado por un profesional contable/fiscal en Republica Dominicana.
