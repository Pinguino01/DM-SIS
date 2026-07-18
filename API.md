# API REST

Base URL local:

```text
http://localhost:4000/api
```

## Autenticacion

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@dm-sis.local",
  "password": "Demo12345!"
}
```

Respuesta:

```json
{
  "token": "...",
  "user": {}
}
```

Usar:

```http
Authorization: Bearer TOKEN
```

## Seguridad y configuracion

CRUD generico protegido por permisos:

- `/api/users`
- `/api/roles`
- `/api/permissions`
- `/api/companies`
- `/api/branches`

## Comercial

- `/api/customers`
- `/api/suppliers`
- `/api/products`
- `POST /api/documents/invoices`

## Inventario y tesoreria

- `/api/warehouses`
- `/api/paymentMethods`
- `/api/bankAccounts`
- `/api/bankTransactions`

## Contabilidad

- `/api/accounts`
- `/api/periods`
- `/api/accountingRules`
- `POST /api/accounting/entries/post`
- `POST /api/accounting/entries/:id/reverse`
- `GET /api/accounting/journal`
- `GET /api/accounting/ledger?accountId=...`
- `GET /api/accounting/trial-balance`
- `GET /api/accounting/financial-statements`

## Auditoria

- `GET /api/auditLogs`

No existe endpoint normal para eliminar auditoria.
