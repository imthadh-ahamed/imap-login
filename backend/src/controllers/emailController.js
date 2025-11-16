import { fetchUserEmails, getStoredEmails } from "../services/email.js";
import logger from "../utils/logger.js";

/**
 * Email Controller
 * Handles HTTP request/response for email endpoints
 */

/**
 * Fetch emails controller - Fetches emails from Gmail via IMAP
 * GET /email/fetch?email={email}
 */
export async function fetchEmails(req, res) {
  try {
    const email = req.query.email;
    
    if (!email) {
      // 400 Bad Request - Missing required parameter
      return res.status(400).json({ 
        success: false,
        message: "Missing email parameter",
        error: "Email address is required in query parameters" 
      });
    }

    logger.info("Fetching emails", { email });
    const emails = await fetchUserEmails(email);
    
    // 201 Created - Successfully fetched and stored new emails
    res.status(201).json({
      message: "Emails fetched and stored successfully",
      count: emails.length,
      data: emails
    });
  } catch (error) {
    logger.error("Fetch emails error", { email: req.query.email, error: error.message });
    
    // Handle specific error types with appropriate status codes
    if (error.message.includes("User not found")) {
      // 404 Not Found - User does not exist
      return res.status(404).json({ 
        success: false,
        message: "User not found",
        error: error.message 
      });
    }
    
    if (error.message.includes("re-authentication")) {
      // 401 Unauthorized - Token expired or invalid
      return res.status(401).json({ 
        success: false,
        message: "Authentication required",
        error: error.message 
      });
    }
    
    // 500 Internal Server Error
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch emails", 
      error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
    });
  }
}

/**
 * Get stored emails controller - Retrieves cached emails from database with pagination and search
 * GET /email/stored?email={email}&page={page}&limit={limit}&search={query}&sortBy={field}&sortOrder={order}
 */
export async function getStored(req, res) {
  try {
    const email = req.query.email;
    
    if (!email) {
      // 400 Bad Request - Missing required parameter
      return res.status(400).json({ 
        success: false,
        message: "Missing email parameter",
        error: "Email address is required in query parameters" 
      });
    }

    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      search: req.query.search || '',
      sortBy: req.query.sortBy || 'date',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    logger.info("Retrieving stored emails", { email, ...options });
    const result = await getStoredEmails(email, options);
    
    // 200 OK - Successfully retrieved data
    res.status(200).json(result);
  } catch (error) {
    logger.error("Get stored emails error", { email: req.query.email, error: error.message });
    
    if (error.message.includes("User not found")) {
      // 404 Not Found - User does not exist
      return res.status(404).json({ 
        success: false,
        message: "User not found",
        error: error.message 
      });
    }
    
    // 500 Internal Server Error
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve stored emails", 
      error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
    });
  }
}
