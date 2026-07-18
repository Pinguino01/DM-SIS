import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { login, changePassword } from "../services/authService.js";
import { writeAudit } from "../middleware/audit.js";

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    nextPassword: z.string().min(8)
  })
});

export const authController = {
  login: [
    asyncHandler(async (req, res) => {
      const data = loginSchema.parse({ body: req.body }).body;
      const result = await login(data);
      await writeAudit({
        req: { ...req, user: { id: result.user.id, companyId: result.user.companyId } },
        action: "LOGIN",
        module: "security",
        entity: "User",
        entityId: result.user.id
      });
      res.json(result);
    })
  ],

  changePassword: [
    asyncHandler(async (req, res) => {
      const data = passwordSchema.parse({ body: req.body }).body;
      await changePassword(req.user.id, data.currentPassword, data.nextPassword);
      await writeAudit({ req, action: "UPDATE", module: "security", entity: "User", entityId: req.user.id, reason: "Cambio de contrasena" });
      res.status(204).send();
    })
  ],

  me: asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
};
