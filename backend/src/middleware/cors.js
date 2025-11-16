import cors from "cors";
import logger from "../utils/logger.js";

/**
 * CORS Configuration
 * Configures Cross-Origin Resource Sharing based on environment
 */

/**
 * Get allowed origins based on environment
 */
const getAllowedOrigins = () => {
  const origins = [process.env.FRONTEND_URL || "http://localhost:3000"];

  // Add additional origins for production if needed
  if (process.env.NODE_ENV === "production") {
    // Add your production frontend URLs here
    // origins.push('https://yourdomain.com');
  }

  return origins;
};

/**
 * CORS options configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn("CORS: Origin not allowed", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
};

/**
 * Development CORS - allow all origins
 */
const devCorsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Export CORS middleware based on environment
 */
export const corsMiddleware =
  process.env.NODE_ENV === "production"
    ? cors(corsOptions)
    : cors(devCorsOptions);

export default corsMiddleware;
