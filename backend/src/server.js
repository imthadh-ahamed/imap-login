import express from "express";
import dotenv from "dotenv";

dotenv.config();

import { sequelize } from "./models/index.js";
import authRoutes from "./routes/auth.js";
import emailRoutes from "./routes/email.js";
import logger from "./utils/logger.js";
import corsMiddleware from "./middleware/cors.js";

const app = express();

// CORS middleware
app.use(corsMiddleware);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Sync the database and start the server
sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
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

export default app;