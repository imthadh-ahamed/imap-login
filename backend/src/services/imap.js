import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import logger from "../utils/logger.js";

/**
 * Builds the XOAUTH2 token string in the format required by Gmail IMAP.
 * Format: user={email}\x01auth=Bearer {accessToken}\x01\x01
 * This string is then base64 encoded.
 */
function buildXOAuth2Token(email, accessToken) {
  const authString = [
    'user=' + email,
    'auth=Bearer ' + accessToken,
    '',
    ''
  ].join('\x01');
  return Buffer.from(authString).toString('base64');
}

/**
 * Converts HTML to plain text (basic implementation)
 */
function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, "")
    .replace(/<script[^>]*>.*<\/script>/gm, "")
    .replace(/<[^>]+>/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Connects to Gmail via IMAP using an OAuth2 access token and fetches all email
 * metadata and body content from the inbox. Returns an array of objects for each email.
 *
 * @param {string} accessToken - The OAuth2 access token for the Gmail account.
 * @param {string} emailAddress - The email address to connect as (used for username).
 * @param {number} limit - Maximum number of emails to fetch (default: 50)
 * @returns {Promise<Array>} An array of email objects with metadata and body.
 */
async function fetchEmails(accessToken, emailAddress, limit = 50) {
  const xoauth2token = buildXOAuth2Token(emailAddress, accessToken);

  const config = {
    imap: {
      user: emailAddress,
      xoauth2: xoauth2token,
      host: "imap.gmail.com", // Gmail IMAP server (required)
      port: 993, // SSL/TLS port (required by Gmail)
      tls: true, // Enable SSL/TLS encryption (required by Gmail)
      authTimeout: 30000, // 30 seconds authentication timeout
      tlsOptions: {
        // In production, set to true for maximum security
        // Set to false only if encountering certificate issues in development
        rejectUnauthorized: process.env.NODE_ENV === "production",
        minVersion: "TLSv1.2", // Enforce minimum TLS version
      },
      connTimeout: 10000, // 10 seconds connection timeout
      keepalive: {
        interval: 10000, // Send keepalive every 10 seconds
        idleInterval: 300000, // Close idle connections after 5 minutes
        forceNoop: true, // Force NOOP command to keep connection alive
      },
    },
  };

  let connection;
  try {
    logger.info("Connecting to Gmail IMAP", { email: emailAddress });
    
    // Establish a connection to Gmail's IMAP server
    connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    logger.info("Successfully connected to Gmail IMAP", { email: emailAddress });

    // Define the search criteria and options
    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""], // Fetch headers, text, and full message
      struct: true,
      markSeen: false, // Don't mark emails as read
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    
    // Limit the number of messages processed
    const limitedMessages = messages.slice(0, limit);
    
    logger.info(`Fetched ${limitedMessages.length} emails from IMAP`, {
      email: emailAddress,
      total: messages.length,
      limited: limitedMessages.length,
    });

    // Process messages to extract metadata and body
    const emailPromises = limitedMessages.map(async (message) => {
      try {
        const all = message.parts.find((part) => part.which === "");
        const header = message.parts.find((part) => part.which === "HEADER");

        let emailData = {
          messageId: message.attributes.uid,
          from: "",
          subject: "",
          date: new Date(),
          body: "",
          bodyHtml: "",
          hasAttachments: false,
        };

        // Parse headers
        if (header && header.body) {
          emailData.from = header.body.from?.[0] || "";
          emailData.subject = header.body.subject?.[0] || "";
          emailData.date = header.body.date?.[0]
            ? new Date(header.body.date[0])
            : new Date();
        }

        // Parse full message body
        if (all && all.body) {
          try {
            const parsed = await simpleParser(all.body);
            
            // Extract plain text body
            if (parsed.text) {
              emailData.body = parsed.text.substring(0, 5000); // Limit to 5000 chars
            } else if (parsed.html) {
              emailData.body = htmlToText(parsed.html).substring(0, 5000);
            }

            // Store HTML version if available
            if (parsed.html) {
              emailData.bodyHtml = parsed.html.substring(0, 10000);
            }

            // Check for attachments
            emailData.hasAttachments =
              parsed.attachments && parsed.attachments.length > 0;
          } catch (parseErr) {
            logger.warn("Failed to parse email body", {
              messageId: emailData.messageId,
              error: parseErr.message,
            });
          }
        }

        return emailData;
      } catch (err) {
        logger.error("Error processing individual email", {
          messageId: message.attributes.uid,
          error: err.message,
        });
        return null;
      }
    });

    const emails = (await Promise.all(emailPromises)).filter(
      (email) => email !== null
    );

    // Close the connection
    connection.end();

    logger.info(`Successfully processed ${emails.length} emails`, {
      email: emailAddress,
    });

    return emails;
  } catch (error) {
    if (connection) {
      try {
        connection.end();
      } catch (closeErr) {
        logger.error("Error closing IMAP connection", {
          error: closeErr.message,
        });
      }
    }
    
    logger.error("IMAP fetch error", {
      email: emailAddress,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}

export default fetchEmails;