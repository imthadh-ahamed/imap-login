import express from "express";
import * as authController from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate, oauthCallbackSchema } from "../middleware/validation.js";

const router = express.Router();

/**
 * Authentication Routes
 */

/**
 * GET /auth/login
 * Generates an OAuth2 consent URL for Google authentication
 */
router.get("/login", authLimiter, authController.login);

/**
 * GET /auth/google/callback
 * Handles the OAuth2 callback from Google
 */
router.get(
  "/google/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  authController.googleCallback
);

export default router;