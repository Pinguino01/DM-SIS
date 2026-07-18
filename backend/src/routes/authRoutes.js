import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/login", authController.login);
router.get("/me", authenticate, authController.me);
router.post("/change-password", authenticate, authController.changePassword);

export default router;
