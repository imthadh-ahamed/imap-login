import Joi from "joi";
import logger from "../utils/logger.js";

/**
 * Validation Middleware
 * Validates request data against Joi schemas
 */

/**
 * Generic validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Property to validate (body, query, params)
 */
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      
      logger.warn("Validation error", {
        path: req.path,
        property,
        error: errorMessage,
      });

      // 400 Bad Request - Validation failed
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

/**
 * Email query parameter validation schema
 */
export const emailQuerySchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email parameter is required",
    }),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().allow('').optional(),
  sortBy: Joi.string().valid('date', 'from', 'subject').optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
});

/**
 * OAuth callback validation schema
 */
export const oauthCallbackSchema = Joi.object({
  code: Joi.string()
    .required()
    .messages({
      "any.required": "Authorization code is required",
    }),
  state: Joi.string().optional(),
  scope: Joi.string().optional(),
  authuser: Joi.string().optional(),
  prompt: Joi.string().optional(),
});

/**
 * Sanitize error messages to prevent information leakage
 */
export const sanitizeError = (error) => {
  if (process.env.NODE_ENV === "production") {
    // Don't expose internal error details in production
    return {
      message: "An error occurred",
      ...(error.statusCode && { statusCode: error.statusCode }),
    };
  }
  return {
    message: error.message,
    ...(error.stack && { stack: error.stack }),
  };
};
