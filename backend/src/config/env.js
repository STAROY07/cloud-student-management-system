const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'cloud_sms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    socketPath: process.env.DB_SOCKET_PATH || null,
  },

  // Security & Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-student-management-system-min-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Google Cloud
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpRegion: process.env.GCP_REGION || 'us-central1',
};

module.exports = config;
