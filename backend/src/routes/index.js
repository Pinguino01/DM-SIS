import { Router } from "express";
import authRoutes from "./authRoutes.js";
import crudRoutes from "./crudRoutes.js";
import accountingRoutes from "./accountingRoutes.js";
import documentRoutes from "./documentRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", crudRoutes);
router.use("/accounting", accountingRoutes);
router.use("/documents", documentRoutes);

export default router;
