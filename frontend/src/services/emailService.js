import { apiClient, handleApiError } from "./api";

/**
 * Email Service
 * Handles all email-related API calls
 */

/**
 * Fetches emails for a given user from the backend
 * This will fetch fresh emails from Gmail via IMAP
 * 
 * @param {string} email - The user's email address
 * @returns {Promise<Array>} Array of email objects
 * @throws {Error} If the request fails
 */
export async function fetchEmails(email) {
  if (!email) {
    throw new Error("Email address is required");
  }

  try {
    const response = await apiClient.get("/email/fetch", {
      params: { email },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "fetchEmails");
  }
}

/**
 * Gets stored emails from the database cache with pagination and search
 * This is faster than fetching from IMAP
 * 
 * @param {string} email - The user's email address
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.search - Search query
 * @param {string} options.sortBy - Sort field (default: 'date')
 * @param {string} options.sortOrder - Sort order 'ASC' or 'DESC' (default: 'DESC')
 * @returns {Promise<Object>} Object with emails array and pagination data
 * @throws {Error} If the request fails
 */
export async function getStoredEmails(email, options = {}) {
  if (!email) {
    throw new Error("Email address is required");
  }

  const {
    page = 1,
    limit = 20,
    search = '',
    sortBy = 'date',
    sortOrder = 'DESC'
  } = options;

  try {
    const response = await apiClient.get("/email/stored", {
      params: { 
        email,
        page,
        limit,
        search,
        sortBy,
        sortOrder
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "getStoredEmails");
  }
}

/**
 * Searches emails in the database
 * 
 * @param {string} email - The user's email address
 * @param {string} query - Search query
 * @param {Object} options - Additional options (page, limit)
 * @returns {Promise<Object>} Object with emails array and pagination data
 * @throws {Error} If the request fails
 */
export async function searchEmails(email, query, options = {}) {
  return getStoredEmails(email, { ...options, search: query });
}

/**
 * Formats a date string into a human-readable relative time
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date (e.g., "2h ago", "3d ago")
 */
export function formatEmailDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Formats a full date string
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date and time
 */
export function formatFullDate(dateString) {
  return new Date(dateString).toLocaleString();
}

/**
 * Gets initials from an email address for avatar display
 * @param {string} email - The email address
 * @returns {string} Two-letter initials
 */
export function getEmailInitials(email) {
  if (!email) return "?";
  
  const parts = email.split("@")[0].split(".");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

/**
 * Filters emails by search query (client-side)
 * @param {Array} emails - Array of email objects
 * @param {string} query - Search query
 * @returns {Array} Filtered emails
 */
export function filterEmailsBySearch(emails, query) {
  if (!query || !query.trim()) {
    return emails;
  }

  const lowerQuery = query.toLowerCase();
  return emails.filter(
    (email) =>
      email.from?.toLowerCase().includes(lowerQuery) ||
      email.subject?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sorts emails by date
 * @param {Array} emails - Array of email objects
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted emails
 */
export function sortEmailsByDate(emails, order = "desc") {
  return [...emails].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return order === "desc" ? dateB - dateA : dateA - dateB;
  });
}
