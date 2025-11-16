import axios from "axios";

/**
 * Base API configuration
 */
const API_BASE_URL = "http://localhost:5000";

/**
 * Create axios instance with default config
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * API error handler - formats error messages consistently
 */
const handleApiError = (error, context) => {
  console.error(`[API Error - ${context}]:`, error);
  
  if (error.response) {
    // Server responded with error status
    throw new Error(
      error.response.data?.message || 
      `Server error: ${error.response.status}`
    );
  } else if (error.request) {
    // Request made but no response received
    throw new Error(
      "Unable to connect to server. Please check your connection."
    );
  } else {
    // Something else happened
    throw new Error(error.message || "An unexpected error occurred");
  }
};

export { apiClient, handleApiError, API_BASE_URL };
