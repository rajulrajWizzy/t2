const { execSync } = require('child_process');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for logging
function log(message, color = colors.white) {
  console.log(`${color}[migrate-sequence] ${message}${colors.reset}`);
}

// Helper function for error logging
function logError(message) {
  log(message, colors.red);
}

// Helper function to run shell commands
function runCommand(command) {
  try {
    log(`Running command: ${command}`, colors.dim);
    execSync(command, { stdio: 'inherit' });
    log(`Command completed successfully: ${command}`, colors.green);
    return true;
  } catch (error) {
    logError(`ERROR: Error running command ${command}: ${error.message}`);
    return false;
  }
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

// Check if migrations table exists
async function checkMigrationsTable(sequelize) {
  try {
    const [result] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${process.env.DB_SCHEMA || 'public'}'
        AND table_name = 'migrations'
      );`
    );
    
    if (!result[0].exists) {
      log('Creating migrations table...', colors.yellow);
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${process.env.DB_SCHEMA || 'public'}"."migrations" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      log('Migrations table created successfully', colors.green);
    }
  } catch (error) {
    logError(`Error checking/creating migrations table: ${error.message}`);
    throw error;
  }
}

// List of migrations to run in order
const migrations = [
  { name: 'Admin Table', command: 'npm run migrate:admin' },
  { name: 'Customer Fields', command: 'npm run migrate:customer-fields' },
  { name: 'Customer Profile Fields', command: 'npm run migrate:customer-profile' },
  { name: 'Seating Types', command: 'npm run migrate:seating-types' },
  { name: 'Password Resets', command: 'npm run migrate:password-resets' },
  { name: 'Branch Indexes', command: 'npm run migrate:branch-indexes' },
  { name: 'Branch Fields', command: 'npm run migrate:branch-fields' },
  { name: 'Blacklisted Tokens', command: 'npm run migrate:blacklisted-tokens' },
  { name: 'Branch Images', command: 'npm run migrate:branch-images' },
  { name: 'Branch Amenities', command: 'npm run migrate:branch-amenities' },
  { name: 'Seat Code', command: 'npm run migrate:seat-code' },
  { name: 'Short Codes', command: 'npm run migrate:short-codes' },
  { name: 'Fix Customers Table', command: 'npm run migrate:fix-customers' }
];

// Main function to run migrations
async function runMigrations() {
  log('Starting migration sequence...', colors.bright);
  
  let sequelize;
  try {
    // Create database connection
    sequelize = await createConnection();
    
    // Check migrations table
    await checkMigrationsTable(sequelize);
    
    // Track successful and failed migrations
    const successful = [];
    const failed = [];
    
    // Run migrations in sequence
    for (const migration of migrations) {
      log(`Running ${migration.name} migration...`, colors.blue);
      if (runCommand(migration.command)) {
        successful.push(migration.name);
      } else {
        failed.push(migration.name);
      }
    }
    
    // Print summary
    if (failed.length > 0) {
      log('Some migrations failed. Please check the errors above.', colors.bright + colors.yellow);
      logError(`ERROR: The following migrations failed: ${failed.join(', ')}`);
      process.exit(1);
    } else {
      log('All migrations completed successfully!', colors.bright + colors.green);
    }
  } catch (error) {
    logError(`Fatal error during migration: ${error.message}`);
    process.exit(1);
  } finally {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
      log('Database connection closed', colors.cyan);
    }
  }
}

// Run migrations
runMigrations().catch(error => {
  logError(`Uncaught error: ${error.message}`);
  process.exit(1);
}); 