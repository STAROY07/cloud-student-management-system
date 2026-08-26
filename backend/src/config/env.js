const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const DEV_JWT_SECRET = 'dev-only-secret-key-student-management-system-min-32';

if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a value of at least 32 characters when NODE_ENV=production.'
    );
  }
  if (!process.env.DATABASE_URL && !process.env.DB_SOCKET_PATH && !process.env.DB_HOST) {
    throw new Error(
      'A database connection (DATABASE_URL, DB_SOCKET_PATH or DB_HOST) must be configured when NODE_ENV=production.'
    );
  }
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must list the allowed browser origins when NODE_ENV=production.');
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv,
  isProduction,
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'cloud_sms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
    socketPath: process.env.DB_SOCKET_PATH || null,
  },

  // Security & Authentication
  jwt: {
    secret: process.env.JWT_SECRET || DEV_JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Google Cloud
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpRegion: process.env.GCP_REGION || 'us-central1',
};

module.exports = config;
