import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { accountingController } from "../controllers/accountingController.js";

const router = Router();
router.use(authenticate);

router.post("/entries/post", requirePermission("accounting", "create"), accountingController.postManualEntry);
router.post("/entries/:id/reverse", requirePermission("accounting", "reverse"), accountingController.reverseEntry);
router.get("/journal", requirePermission("accounting", "view"), accountingController.journal);
router.get("/ledger", requirePermission("accounting", "view"), accountingController.ledger);
router.get("/trial-balance", requirePermission("accounting", "view"), accountingController.trialBalance);
router.get("/financial-statements", requirePermission("accounting", "view"), accountingController.financialStatements);

export default router;
