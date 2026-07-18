import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../middleware/audit.js";
import { AppError } from "../utils/errors.js";

const models = {
  companies: "company",
  branches: "branch",
  users: "user",
  roles: "role",
  permissions: "permission",
  accounts: "ledgerAccount",
  periods: "accountingPeriod",
  accountingRules: "accountingRule",
  customers: "customer",
  suppliers: "supplier",
  products: "product",
  warehouses: "warehouse",
  paymentMethods: "paymentMethod",
  bankAccounts: "bankAccount",
  bankTransactions: "bankTransaction",
  costCenters: "costCenter",
  taxTypes: "taxType",
  fiscalSequences: "fiscalSequence",
  auditLogs: "auditLog"
};

export function crudController(resource, options = {}) {
  const modelName = models[resource];
  if (!modelName) throw new Error(`Recurso no soportado: ${resource}`);
  const model = prisma[modelName];

  return {
    list: asyncHandler(async (req, res) => {
      const where = options.companyScoped === false ? {} : { companyId: req.user.companyId };
      const rows = await model.findMany({
        where,
        orderBy: options.orderBy || { createdAt: "desc" },
        take: Math.min(Number(req.query.take || 100), 500)
      });
      res.json({ data: rows });
    }),

    get: asyncHandler(async (req, res) => {
      const row = await model.findFirst({
        where: { id: req.params.id, ...(options.companyScoped === false ? {} : { companyId: req.user.companyId }) }
      });
      if (!row) throw new AppError("Registro no encontrado", 404);
      res.json({ data: row });
    }),

    create: asyncHandler(async (req, res) => {
      const data = options.companyScoped === false ? req.body : { ...req.body, companyId: req.user.companyId };
      const row = await model.create({ data });
      await writeAudit({ req, action: "CREATE", module: resource, entity: modelName, entityId: row.id, newValues: row });
      res.status(201).json({ data: row });
    }),

    update: asyncHandler(async (req, res) => {
      const old = await model.findFirst({
        where: { id: req.params.id, ...(options.companyScoped === false ? {} : { companyId: req.user.companyId }) }
      });
      if (!old) throw new AppError("Registro no encontrado", 404);
      if (options.blockSystemDelete && old.systemAccount) throw new AppError("No se puede modificar una cuenta del sistema", 422);
      const row = await model.update({ where: { id: req.params.id }, data: req.body });
      await writeAudit({ req, action: "UPDATE", module: resource, entity: modelName, entityId: row.id, oldValues: old, newValues: row });
      res.json({ data: row });
    }),

    remove: asyncHandler(async (req, res) => {
      const old = await model.findFirst({
        where: { id: req.params.id, ...(options.companyScoped === false ? {} : { companyId: req.user.companyId }) }
      });
      if (!old) throw new AppError("Registro no encontrado", 404);
      if (resource === "auditLogs") throw new AppError("La auditoria no se elimina desde la interfaz normal", 403);
      if (old.systemAccount) throw new AppError("No se puede eliminar una cuenta del sistema", 422);
      await model.delete({ where: { id: req.params.id } });
      await writeAudit({ req, action: "DELETE", module: resource, entity: modelName, entityId: old.id, oldValues: old });
      res.status(204).send();
    })
  };
}
