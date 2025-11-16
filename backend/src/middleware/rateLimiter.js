import rateLimit from "express-rate-limit";
import logger from "../utils/logger.js";

/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP
 */

/**
 * General API rate limiter
 * Applies to all API routes
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    // 429 Too Many Requests
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * More restrictive to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    // 429 Too Many Requests
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * Rate limiter for email fetching
 * Moderate restrictions for resource-intensive operations
 */
export const emailFetchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 requests per 5 minutes
  message: {
    message: "Too many email fetch requests, please try again later.",
    retryAfter: "5 minutes",
  },
  handler: (req, res) => {
    logger.warn("Email fetch rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      email: req.query.email,
    });
    // 429 Too Many Requests
    res.status(429).json({
      success: false,
      message: "Too many email fetch requests, please try again later.",
      retryAfter: "5 minutes",
    });
  },
});
