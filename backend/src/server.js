import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

import { sequelize } from "./models/index.js";
import authRoutes from "./routes/auth.js";
import emailRoutes from "./routes/email.js";
import logger from "./utils/logger.js";
import corsMiddleware from "./middleware/cors.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { validateAllConfigurations } from "./utils/configValidator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsMiddleware);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(
  morgan("combined", {
    stream: logger.stream,
    skip: (req, res) => res.statusCode < 400, // Only log errors in production
  })
);

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  // 200 OK - Service is healthy
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Register routes
app.use("/auth", authRoutes);
app.use("/email", emailRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn("404 - Route not found", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  // 404 Not Found - Route does not exist
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // 500 Internal Server Error (or custom error status)
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Validate configurations before starting
logger.info("Validating application configurations...");
const configValid = validateAllConfigurations();

if (!configValid && process.env.NODE_ENV === "production") {
  logger.error("Configuration validation failed. Exiting...");
  process.exit(1);
}

// Sync the database and start the server
sequelize
  .sync()
  .then(() => {
    logger.info("Database synchronized successfully");
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
      });
      console.log(`Backend running at port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("Failed to sync database", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason,
    promise: promise,
  });
});

export default app;