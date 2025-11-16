import { generateAuthUrl, handleOAuthCallback } from "../services/auth.js";
import logger from "../utils/logger.js";

/**
 * Auth Controller
 * Handles HTTP request/response for authentication endpoints
 */

/**
 * Login controller - Returns OAuth2 consent URL
 * GET /auth/login
 */
export async function login(req, res) {
  try {
    const url = generateAuthUrl();
    // 200 OK - Successfully generated auth URL
    res.status(200).json({ 
      success: true,
      url 
    });
  } catch (error) {
    logger.error("Login error", { error: error.message, stack: error.stack });
    // 500 Internal Server Error
    res.status(500).json({ 
      success: false,
      message: "Failed to generate authentication URL",
      error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
    });
  }
}

/**
 * OAuth callback controller - Handles Google OAuth2 callback
 * GET /auth/google/callback
 */
export async function googleCallback(req, res) {
  try {
    const code = req.query.code;
    
    if (!code) {
      // 400 Bad Request - Missing required parameter
      return res.status(400).json({
        success: false,
        message: "Bad Request",
        error: "Missing authorization code"
      });
    }
    
    const { email, redirectUrl } = await handleOAuthCallback(code);
    
    logger.info("User authenticated successfully", { email });
    // 302 Found - Redirect to frontend dashboard
    res.status(302).redirect(redirectUrl);
  } catch (error) {
    logger.error("OAuth callback error", { error: error.message, stack: error.stack });
    
    // 302 Found - Redirect to frontend with error
    const errorMessage = encodeURIComponent(error.message);
    res.status(302).redirect(`http://localhost:3000/?error=${errorMessage}`);
  }
}
