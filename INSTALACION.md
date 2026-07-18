# Instalacion

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 14 o superior.
- npm.

## Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

La API inicia por defecto en:

```text
http://localhost:4000
```

Healthcheck:

```text
GET http://localhost:4000/health
```

## Frontend

La interfaz actual esta en `frontend/`.

Modo estatico local:

```powershell
cd frontend
node dev-server.js
```

Luego abrir:

```text
http://127.0.0.1:4180/
```

## Migraciones

Crear migracion local:

```powershell
cd backend
npm run prisma:migrate
```

Aplicar migraciones en produccion:

```powershell
cd backend
npm run prisma:deploy
```

## Seed

```powershell
cd backend
npm run seed
```

Credenciales:

- `admin@dm-sis.local`
- `Demo12345!`

Cambiar esta contrasena antes de usar el sistema con datos reales.

## Pruebas

```powershell
cd backend
npm test
```

## Migrar datos desde localStorage

Exportar JSON desde el sistema anterior y ejecutar:

```powershell
cd backend
npm run migrate:localstorage -- ..\backup.json
```

El script valida estructura, inserta registros y muestra resumen de errores.
