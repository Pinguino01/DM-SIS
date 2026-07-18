import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) throw new AppError("Sesion requerida", 401);

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } }
              }
            }
          }
        }
      }
    });
    if (!user || !user.isActive) throw new AppError("Usuario inactivo o no encontrado", 401);

    req.user = {
      id: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
      email: user.email,
      roles: user.userRoles.map((item) => item.role.name),
      permissions: user.userRoles.flatMap((item) =>
        item.role.rolePermissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`)
      )
    };
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" ? new AppError("Token invalido", 401) : error);
  }
}

export function requirePermission(module, action) {
  return (req, res, next) => {
    const key = `${module}:${action}`;
    if (!req.user?.permissions?.includes(key)) {
      return next(new AppError("Permiso insuficiente", 403, { required: key }));
    }
    next();
  };
}
