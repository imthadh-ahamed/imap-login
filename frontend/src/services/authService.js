import { apiClient, handleApiError } from "./api";

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

/**
 * Gets the OAuth2 login URL from the backend
 * @returns {Promise<string>} The Google OAuth login URL
 * @throws {Error} If the request fails
 */
export async function getLoginUrl() {
  try {
    const response = await apiClient.get("/auth/login");
    return response.data.url;
  } catch (error) {
    handleApiError(error, "getLoginUrl");
  }
}

/**
 * Initiates the login flow by redirecting to Google OAuth
 * @throws {Error} If unable to get login URL
 */
export async function initiateLogin() {
  try {
    const url = await getLoginUrl();
    window.location.href = url;
  } catch (error) {
    throw new Error(`Failed to initiate login: ${error.message}`);
  }
}

/**
 * Logs out the user by redirecting to home page
 */
export function logout() {
  // Clear any local storage if needed
  localStorage.removeItem("userEmail");
  
  // Redirect to home
  window.location.href = "/";
}

/**
 * Gets the authenticated user's email from URL params
 * @returns {string|null} The user's email or null if not found
 */
export function getUserEmailFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("email");
}

/**
 * Stores user email in local storage
 * @param {string} email - The user's email
 */
export function storeUserEmail(email) {
  if (email) {
    localStorage.setItem("userEmail", email);
  }
}

/**
 * Retrieves stored user email
 * @returns {string|null} The stored email or null
 */
export function getStoredUserEmail() {
  return localStorage.getItem("userEmail");
}
