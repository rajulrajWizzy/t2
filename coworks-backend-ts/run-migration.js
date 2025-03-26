const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[migration] ${message}${colors.reset}`);
}

// Helper function for error logging
function logError(message) {
  log(message, colors.red);
}

// Create database connection
async function createConnection() {
  // SSL configuration - always require SSL
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };

  const config = {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: sslConfig,
      statement_timeout: 30000,
      query_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  };

  let sequelize;
  if (process.env.DATABASE_URL) {
    log('Using DATABASE_URL for connection', colors.cyan);
    sequelize = new Sequelize(process.env.DATABASE_URL, config);
  } else {
    log('Using individual credentials for connection', colors.cyan);
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        ...config,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT
      }
    );
  }

  try {
    await sequelize.authenticate();
    log('Database connection established successfully', colors.green);
    return sequelize;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    throw error;
  }
}

async function runMigration() {
  log('Starting database schema recreation...', colors.bright);
  
  let sequelize;
  try {
    // Create database connection
    sequelize = await createConnection();
    
    // Get the migration file
    const migrationPath = path.join(__dirname, 'migrations', '20250401000000-recreate-database-schema.js');
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }
    
    // Load the migration
    const migration = require(migrationPath);
    
    // Run migration
    log('Running migration up function...', colors.yellow);
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    
    // Record migration
    const dbSchema = process.env.DB_SCHEMA || 'public';
    
    // Check if migration already exists
    const [migrationResult] = await sequelize.query(`
      SELECT COUNT(*) FROM "${dbSchema}"."migrations" WHERE name = '20250401000000-recreate-database-schema'
    `);
    
    if (parseInt(migrationResult[0].count) === 0) {
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('20250401000000-recreate-database-schema', NOW());
      `);
    }
    
    log('Migration completed successfully!', colors.green);
  } catch (error) {
    logError(`Error during migration: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
      log('Database connection closed', colors.cyan);
    }
  }
}

// Run migration
runMigration().catch(error => {
  logError(`Unhandled error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}); 