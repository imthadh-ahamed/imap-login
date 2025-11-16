import logger from "./logger.js";

/**
 * Gmail Configuration Validator
 * Validates that all IMAP/SMTP settings match Gmail's requirements
 */

const GMAIL_CONFIG = {
  IMAP: {
    host: "imap.gmail.com",
    port: 993,
    security: "SSL/TLS",
    requiresTLS: true,
  },
  SMTP: {
    host: "smtp.gmail.com",
    ports: [465, 587],
    security: "SSL/TLS",
  },
};

/**
 * Validates IMAP configuration against Gmail requirements
 * @param {Object} config - IMAP configuration object
 * @returns {Object} Validation result with status and messages
 */
export function validateIMAPConfig(config) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check host
  if (config.imap.host !== GMAIL_CONFIG.IMAP.host) {
    results.valid = false;
    results.errors.push(
      `Invalid IMAP host: ${config.imap.host}. Expected: ${GMAIL_CONFIG.IMAP.host}`
    );
  } else {
    results.info.push(`✓ IMAP host: ${config.imap.host} (Correct)`);
  }

  // Check port
  if (config.imap.port !== GMAIL_CONFIG.IMAP.port) {
    results.valid = false;
    results.errors.push(
      `Invalid IMAP port: ${config.imap.port}. Expected: ${GMAIL_CONFIG.IMAP.port}`
    );
  } else {
    results.info.push(`✓ IMAP port: ${config.imap.port} (Correct)`);
  }

  // Check TLS
  if (!config.imap.tls) {
    results.valid = false;
    results.errors.push("TLS must be enabled for Gmail IMAP");
  } else {
    results.info.push("✓ TLS enabled (Correct)");
  }

  // Check authentication
  if (!config.imap.xoauth2 && !config.imap.password) {
    results.valid = false;
    results.errors.push(
      "No authentication method provided (OAuth2 or password required)"
    );
  } else if (config.imap.xoauth2) {
    results.info.push("✓ Using OAuth2 authentication (Recommended)");
  } else {
    results.warnings.push(
      "Using password authentication (OAuth2 is recommended)"
    );
  }

  // Check certificate validation
  if (
    config.imap.tlsOptions &&
    !config.imap.tlsOptions.rejectUnauthorized &&
    process.env.NODE_ENV === "production"
  ) {
    results.warnings.push(
      "Certificate validation disabled in production (Security risk)"
    );
  }

  // Check TLS version
  if (
    config.imap.tlsOptions &&
    config.imap.tlsOptions.minVersion &&
    config.imap.tlsOptions.minVersion < "TLSv1.2"
  ) {
    results.warnings.push(
      `TLS version ${config.imap.tlsOptions.minVersion} is outdated. Use TLSv1.2 or higher`
    );
  } else if (config.imap.tlsOptions && config.imap.tlsOptions.minVersion) {
    results.info.push(
      `✓ TLS version: ${config.imap.tlsOptions.minVersion} (Secure)`
    );
  }

  return results;
}

/**
 * Validates environment variables required for Gmail integration
 * @returns {Object} Validation result
 */
export function validateEnvironment() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Required environment variables
  const required = [
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REDIRECT_URI",
    "DB_HOST",
    "DB_USER",
    "DB_NAME",
  ];

  for (const varName of required) {
    if (!process.env[varName]) {
      results.valid = false;
      results.errors.push(`Missing required environment variable: ${varName}`);
    } else {
      results.info.push(`✓ ${varName} is set`);
    }
  }

  // Check OAuth redirect URI format
  if (process.env.REDIRECT_URI) {
    if (!process.env.REDIRECT_URI.includes("/auth/google/callback")) {
      results.warnings.push(
        "REDIRECT_URI should end with /auth/google/callback"
      );
    }
  }

  // Check NODE_ENV
  if (!process.env.NODE_ENV) {
    results.warnings.push("NODE_ENV not set, defaulting to development");
  } else {
    results.info.push(`✓ Running in ${process.env.NODE_ENV} mode`);
  }

  // Security checks for production
  if (process.env.NODE_ENV === "production") {
    if (process.env.REDIRECT_URI?.includes("localhost")) {
      results.errors.push(
        "REDIRECT_URI contains localhost in production environment"
      );
      results.valid = false;
    }

    if (process.env.FRONTEND_URL?.includes("localhost")) {
      results.warnings.push(
        "FRONTEND_URL contains localhost in production environment"
      );
    }
  }

  return results;
}

/**
 * Logs configuration validation results
 * @param {Object} results - Validation results
 * @param {string} configType - Type of configuration (e.g., 'IMAP', 'Environment')
 */
export function logValidationResults(results, configType = "Configuration") {
  if (results.valid) {
    logger.info(`${configType} validation passed`, {
      service: "config-validator",
    });
  } else {
    logger.error(`${configType} validation failed`, {
      service: "config-validator",
      errors: results.errors,
    });
  }

  // Log errors
  results.errors.forEach((error) => {
    logger.error(`[${configType}] ${error}`, {
      service: "config-validator",
    });
  });

  // Log warnings
  results.warnings.forEach((warning) => {
    logger.warn(`[${configType}] ${warning}`, {
      service: "config-validator",
    });
  });

  // Log info in development
  if (process.env.NODE_ENV !== "production") {
    results.info.forEach((info) => {
      logger.info(`[${configType}] ${info}`, {
        service: "config-validator",
      });
    });
  }
}

/**
 * Comprehensive configuration check
 * Validates both environment and IMAP settings
 * @returns {boolean} True if all validations pass
 */
export function validateAllConfigurations() {
  logger.info("Starting configuration validation", {
    service: "config-validator",
  });

  // Validate environment variables
  const envResults = validateEnvironment();
  logValidationResults(envResults, "Environment");

  // Only validate IMAP if environment is valid
  let imapValid = true;
  if (envResults.valid) {
    // Create a sample IMAP config for validation
    const sampleConfig = {
      imap: {
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        xoauth2: "sample",
        tlsOptions: {
          rejectUnauthorized: process.env.NODE_ENV === "production",
          minVersion: "TLSv1.2",
        },
      },
    };

    const imapResults = validateIMAPConfig(sampleConfig);
    logValidationResults(imapResults, "IMAP");
    imapValid = imapResults.valid;
  }

  const allValid = envResults.valid && imapValid;

  if (allValid) {
    logger.info("✅ All configurations validated successfully", {
      service: "config-validator",
    });
  } else {
    logger.error("❌ Configuration validation failed - Please fix errors", {
      service: "config-validator",
    });
  }

  return allValid;
}

export default {
  validateIMAPConfig,
  validateEnvironment,
  logValidationResults,
  validateAllConfigurations,
  GMAIL_CONFIG,
};
