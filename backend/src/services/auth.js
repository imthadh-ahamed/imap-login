import oauth2Client from "../config/oauth.js";
import { User } from "../models/index.js";
import logger from "../utils/logger.js";

/**
 * Auth Service - Handles all authentication-related business logic
 */

/**
 * Generates an OAuth2 consent URL for the client to authenticate with Google.
 * The scopes allow full access to Gmail via IMAP along with basic profile and
 * email scope to identify the user.
 * 
 * @returns {string} The authorization URL
 */
export function generateAuthUrl() {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://mail.google.com/",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ],
  });
  return url;
}

/**
 * Handles the OAuth2 callback by exchanging the authorization code for tokens
 * and storing the user's credentials in the database.
 * 
 * @param {string} code - The authorization code from Google
 * @returns {Promise<Object>} Object containing email and redirect URL
 * @throws {Error} If code is missing or token exchange fails
 */
export async function handleOAuthCallback(code) {
  if (!code) {
    throw new Error("Missing authorization code");
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Decode the ID token to get the user's email address
    const jwt = JSON.parse(
      Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
    );
    const email = jwt.email;

    // Store or update the user in the database
    await User.upsert({
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    return {
      email,
      redirectUrl: `http://localhost:3000/dashboard?email=${encodeURIComponent(email)}`,
    };
  } catch (error) {
    logger.error("OAuth callback error", { error: error.message, stack: error.stack });
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Refreshes the access token for a user if needed
 * 
 * @param {Object} user - User object with tokens
 * @returns {Promise<string>} Fresh access token
 * @throws {Error} If token refresh fails
 */
export async function refreshAccessToken(user) {
  if (!user.refreshToken) {
    throw new Error("No refresh token available; re-authentication required");
  }

  const mask = (s) => (s ? s.slice(0, 8) + "..." + s.slice(-8) : "<empty>");
  logger.info("Refreshing access token", { email: user.email });

  // Set credentials on the OAuth2 client so it can refresh the access token
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  try {
    const tokenResponse = await oauth2Client.getAccessToken();
    const freshAccessToken =
      tokenResponse && tokenResponse.token
        ? tokenResponse.token
        : tokenResponse;

    logger.info("Token refreshed successfully", { email: user.email });

    if (!freshAccessToken) {
      throw new Error("Unable to obtain access token");
    }

    // Persist new access token if it changed
    if (freshAccessToken !== user.accessToken) {
      logger.info("Persisting new access token", { email: user.email });
      await user.update({ accessToken: freshAccessToken });
    }

    return freshAccessToken;
  } catch (error) {
    logger.error("Token refresh error", { email: user.email, error: error.message });
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}
