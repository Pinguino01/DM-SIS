import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { documentController } from "../controllers/documentController.js";

const router = Router();
router.use(authenticate);

router.post("/invoices", requirePermission("sales", "create"), documentController.createInvoice);

export default router;
