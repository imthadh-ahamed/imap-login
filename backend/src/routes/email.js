import express from "express";
import * as emailController from "../controllers/emailController.js";
import { emailFetchLimiter } from "../middleware/rateLimiter.js";
import { validate, emailQuerySchema } from "../middleware/validation.js";

const router = express.Router();

/**
 * Email Routes
 */

/**
 * GET /email/fetch
 * Fetches emails from Gmail via IMAP and stores them in the database
 */
router.get(
  "/fetch",
  emailFetchLimiter,
  validate(emailQuerySchema, "query"),
  emailController.fetchEmails
);

/**
 * GET /email/stored
 * Retrieves stored emails from the database with pagination and search
 */
router.get(
  "/stored",
  validate(emailQuerySchema, "query"),
  emailController.getStored
);

export default router;