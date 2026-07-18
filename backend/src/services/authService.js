import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export async function login({ email, password }) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
    include: { company: true }
  });
  if (!user) throw new AppError("Credenciales invalidas", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Credenciales invalidas", 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastAccessAt: new Date() }
  });

  const token = jwt.sign(
    { sub: user.id, companyId: user.companyId, branchId: user.branchId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: user.company.commercialName,
      mustChangePassword: user.mustChangePassword
    }
  };
}

export async function changePassword(userId, currentPassword, nextPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Contrasena actual incorrecta", 400);
  const passwordHash = await bcrypt.hash(nextPassword, env.bcryptRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false }
  });
}
