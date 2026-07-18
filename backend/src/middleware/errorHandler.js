import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(409).json({
      error: "Error de integridad de datos",
      code: error.code,
      meta: error.meta
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      error: "Datos invalidos",
      details: error.flatten()
    });
  }

  console.error(error);
  return res.status(500).json({
    error: "Error interno del servidor"
  });
}
