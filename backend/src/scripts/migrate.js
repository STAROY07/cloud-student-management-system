const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/db');
const logger = require('../utils/logger');

async function runMigrations() {
  logger.info('Starting database migrations...');

  // Create schema_migrations tracking table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info(`Discovered ${files.length} migration file(s)`);

  for (const file of files) {
    const executed = await query(
      'SELECT id FROM schema_migrations WHERE filename = $1',
      [file]
    );

    if (executed.rowCount > 0) {
      logger.info(`Migration already executed: ${file} (Skipping)`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    logger.info(`Executing migration: ${file}...`);
    
    // Run migration inside transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      logger.info(`Successfully executed migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Failed to execute migration: ${file}`, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('All database migrations completed successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script exiting with code 0');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration script failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}

module.exports = runMigrations;
