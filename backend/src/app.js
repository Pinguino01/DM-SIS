import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(helmet());
app.use(cors({
  origin: env.corsOrigin.length ? env.corsOrigin : true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "dm-sis-backend" });
});

app.use("/api", routes);

const frontendPath = path.resolve(__dirname, "../../..", "frontend");
app.use(express.static(frontendPath));

app.use(errorHandler);
