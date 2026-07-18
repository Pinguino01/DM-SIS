import { Router } from "express";
import { crudController } from "../controllers/crudController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const resources = [
  ["companies", "configuration"],
  ["branches", "configuration"],
  ["users", "security"],
  ["roles", "security"],
  ["permissions", "security"],
  ["accounts", "accounting"],
  ["periods", "accounting"],
  ["accountingRules", "accounting"],
  ["customers", "sales"],
  ["suppliers", "purchases"],
  ["products", "inventory"],
  ["warehouses", "inventory"],
  ["paymentMethods", "treasury"],
  ["bankAccounts", "treasury"],
  ["bankTransactions", "treasury"],
  ["costCenters", "accounting"],
  ["taxTypes", "fiscal"],
  ["fiscalSequences", "fiscal"],
  ["auditLogs", "audit"]
];

const router = Router();
router.use(authenticate);

for (const [resource, module] of resources) {
  const controller = crudController(resource, { companyScoped: resource !== "companies", orderBy: resource === "accounts" ? { code: "asc" } : undefined });
  router.get(`/${resource}`, requirePermission(module, "view"), controller.list);
  router.get(`/${resource}/:id`, requirePermission(module, "view"), controller.get);
  router.post(`/${resource}`, requirePermission(module, "create"), controller.create);
  router.put(`/${resource}/:id`, requirePermission(module, "edit"), controller.update);
  router.delete(`/${resource}/:id`, requirePermission(module, "delete"), controller.remove);
}

export default router;
