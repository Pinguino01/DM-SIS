import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  corsOrigin: (process.env.CORS_ORIGIN || "").split(",").map((item) => item.trim()).filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 8)
};
