import { User, Email } from "../models/index.js";
import fetchEmails from "./imap.js";
import { refreshAccessToken } from "./auth.js";
import logger from "../utils/logger.js";

/**
 * Email Service - Handles all email-related business logic
 */

/**
 * Fetches emails for a given user from their Gmail inbox via IMAP
 * 
 * @param {string} emailAddress - The user's email address
 * @returns {Promise<Array>} Array of email objects
 * @throws {Error} If user not found or fetch fails
 */
export async function fetchUserEmails(emailAddress) {
  if (!emailAddress) {
    throw new Error("Email address is required");
  }

  // Find the user by email
  const user = await User.findOne({ where: { email: emailAddress } });
  if (!user) {
    throw new Error("User not found");
  }

  try {
    // Refresh access token if needed
    const freshAccessToken = await refreshAccessToken(user);

    // Fetch emails via IMAP using the valid access token
    logger.info("Fetching emails from IMAP", { email: emailAddress });
    const emails = await fetchEmails(freshAccessToken, emailAddress);
    logger.info("Successfully fetched emails", { email: emailAddress, count: emails.length });

    // Save each email's metadata into the database
    await saveEmailsToDatabase(emails, user.id);

    return emails;
  } catch (error) {
    logger.error("Error fetching emails", { email: emailAddress, error: error.message });
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }
}

/**
 * Saves email metadata to the database
 * 
 * @param {Array} emails - Array of email objects
 * @param {number} userId - The user's database ID
 * @returns {Promise<void>}
 */
async function saveEmailsToDatabase(emails, userId) {
  try {
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const email of emails) {
      const [instance, created] = await Email.findOrCreate({
        where: { 
          userId: userId,
          messageId: email.messageId 
        },
        defaults: { ...email, userId },
      });
      
      if (created) {
        savedCount++;
      } else {
        skippedCount++;
      }
    }
    
    logger.info("Saved emails to database", { 
      userId, 
      total: emails.length,
      saved: savedCount,
      skipped: skippedCount
    });
  } catch (error) {
    logger.error("Error saving emails to database", { userId, error: error.message });
    // Don't throw - we still want to return emails even if DB save fails
  }
}

/**
 * Gets emails from database for a user with pagination and search
 * 
 * @param {string} emailAddress - The user's email address
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.search - Search query for from/subject
 * @param {string} options.sortBy - Sort field (default: 'date')
 * @param {string} options.sortOrder - Sort order 'ASC' or 'DESC' (default: 'DESC')
 * @returns {Promise<Object>} Object with emails array and pagination metadata
 */
export async function getStoredEmails(emailAddress, options = {}) {
  const user = await User.findOne({ where: { email: emailAddress } });
  if (!user) {
    throw new Error("User not found");
  }

  const {
    page = 1,
    limit = 20,
    search = '',
    sortBy = 'date',
    sortOrder = 'DESC'
  } = options;

  // Calculate offset
  const offset = (page - 1) * limit;

  // Import Sequelize operators
  const { Op } = await import('sequelize');

  // Build where clause with proper search logic
  let whereClause;
  
  if (search && search.trim()) {
    // When search is provided, combine userId AND (from LIKE search OR subject LIKE search)
    whereClause = {
      [Op.and]: [
        { userId: user.id },
        {
          [Op.or]: [
            { from: { [Op.like]: `%${search}%` } },
            { subject: { [Op.like]: `%${search}%` } }
          ]
        }
      ]
    };
  } else {
    // When no search, just filter by userId
    whereClause = { userId: user.id };
  }

  // Get total count for pagination
  const totalCount = await Email.count({ where: whereClause });

  // Fetch emails with pagination
  const emails = await Email.findAll({
    where: whereClause,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info("Retrieved stored emails with pagination", {
    email: emailAddress,
    page,
    limit,
    search,
    totalCount,
    totalPages
  });

  return {
    emails,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalCount,
      limit: parseInt(limit),
      hasNextPage,
      hasPrevPage
    }
  };
}
