const config = require('../config/env');

const SENSITIVE_KEYS = ['password', 'password_hash', 'token', 'authorization', 'secret', 'jwt'];

/**
 * Recursively redacts sensitive keys from log payloads
 */
const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      clean[key] = sanitizePayload(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Format log entry as structured JSON for Google Cloud Logging
 */
const log = (severity, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitizePayload(metadata);

  const logEntry = {
    severity,
    message,
    timestamp,
    serviceContext: {
      service: 'cloud-student-management-system',
      version: '1.0.0',
    },
    ...sanitizedMeta,
  };

  if (config.nodeEnv === 'development') {
    // Pretty colored format for local terminal development
    const color = {
      DEBUG: '\x1b[34m',
      INFO: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m',
      CRITICAL: '\x1b[35m',
    }[severity] || '\x1b[37m';
    const reset = '\x1b[0m';
    const metaStr = Object.keys(sanitizedMeta).length ? ` ${JSON.stringify(sanitizedMeta)}` : '';
    console.log(`${color}[${severity}]${reset} ${timestamp} - ${message}${metaStr}`);
  } else {
    // Single-line JSON format for GCP Cloud Logging ingestion
    console.log(JSON.stringify(logEntry));
  }
};

const logger = {
  debug: (msg, meta) => {
    if (config.nodeEnv === 'development') log('DEBUG', msg, meta);
  },
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARNING', msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
  critical: (msg, meta) => log('CRITICAL', msg, meta),
};

module.exports = logger;
