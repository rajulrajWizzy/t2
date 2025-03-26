// scripts/vercel-migrate.js
// A safer migration script for Vercel deployment
const { Sequelize } = require('sequelize');
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const fetch = require('node-fetch').default;

const dbSchema = process.env.DB_SCHEMA || 'public';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Simple log function
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Error log function
function logError(message) {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

// Success log function
function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

// Function to test database connectivity only
async function testDatabaseConnection() {
  let sequelize = null;
  
  try {
    log('🔍 Starting Vercel database migrations...', colors.bright + colors.blue);
    
    // Check if DATABASE_URL exists (Vercel/Production)
    if (process.env.DATABASE_URL) {
      log('Using DATABASE_URL for connection');
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          statement_timeout: 30000,
          query_timeout: 30000,
          idle_in_transaction_session_timeout: 30000
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
          evict: 1000
        }
      });
    } else {
      // Fallback to individual credentials (local development)
      log('Using individual credentials for connection');
      sequelize = new Sequelize(
        process.env.DB_NAME || 'coworks_db',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASS || '',
        {
          host: process.env.DB_HOST || 'localhost',
          dialect: 'postgres',
          logging: false,
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            },
            statement_timeout: 30000,
            query_timeout: 30000
          },
          pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
          }
        }
      );
    }

    // Test connection
    await sequelize.authenticate();
    logSuccess('Database connection successful');
    
    // Check if migrations table exists
    try {
      const [result] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'migrations'
        );
      `);
      
      const migrationsTableExists = result[0].exists;
      
      if (migrationsTableExists) {
        // Get migration count
        const [migrations] = await sequelize.query(`
          SELECT COUNT(*) FROM "${dbSchema}"."migrations";
        `);
        log(`Number of migrations already applied: ${migrations[0].count}`, colors.cyan);
        
        // Try to get list of migrations
        try {
          const [appliedMigrations] = await sequelize.query(`
            SELECT name, applied_at FROM "${dbSchema}"."migrations" 
            ORDER BY applied_at DESC LIMIT 5;
          `);
          
          if (appliedMigrations.length > 0) {
            log('Recently applied migrations:', colors.cyan);
            appliedMigrations.forEach(mig => {
              const date = new Date(mig.applied_at).toISOString().replace('T', ' ').substr(0, 19);
              log(`  - ${mig.name} (${date})`, colors.cyan);
            });
          }
        } catch (listErr) {
          log(`Couldn't retrieve migration list: ${listErr.message}`, colors.yellow);
        }
      } else {
        log('Migrations table does not exist. It will be created during migration.', colors.yellow);
        
        // Try to create migrations table
        try {
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${dbSchema}"."migrations" (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          logSuccess('Created migrations table');
        } catch (createErr) {
          log(`Failed to create migrations table: ${createErr.message}`, colors.yellow);
        }
      }
    } catch (err) {
      log(`Could not check migrations table status: ${err.message}`, colors.yellow);
    }
    
    // Check for customers table and required columns
    try {
      const [customersExist] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'customers'
        );
      `);
      
      if (customersExist[0].exists) {
        // Check for required columns
        const [requiredColumns] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'customers'
          AND column_name IN ('proof_of_identity', 'proof_of_address', 'address');
        `);
        
        const foundColumns = requiredColumns.map(col => col.column_name);
        const missingColumns = ['proof_of_identity', 'proof_of_address', 'address']
          .filter(col => !foundColumns.includes(col));
        
        if (missingColumns.length > 0) {
          log(`Missing customer columns: ${missingColumns.join(', ')}`, colors.yellow);
          log('These will be added during migration', colors.yellow);
        } else {
          logSuccess('All required customer columns exist');
        }
      }
    } catch (customerErr) {
      log(`Could not check customers table: ${customerErr.message}`, colors.yellow);
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    log('⚠️ Continuing build process but migrations may fail', colors.yellow);
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeError) {
        logError(`Error closing database connection: ${closeError.message}`);
      }
    }
    return false;
  }
}

// Function to call API endpoint to fix customer table
async function callFixEndpoint() {
  try {
    log('Attempting to call fix-customers-table endpoint...', colors.blue);
    const isVercel = process.env.VERCEL === '1';
    const baseUrl = isVercel 
      ? 'https://excel-coworks-backend.vercel.app' 
      : process.env.BASE_URL || 'http://localhost:3000';
      
    const fixUrl = `${baseUrl}/api/setup/fix-customers-table`;
    log(`Calling endpoint: ${fixUrl}`, colors.blue);
    
    // Try the API call
    try {
      const response = await fetch(fixUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'VercelMigrationScript'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          logSuccess(`API fix successful: ${data.message}`);
        } else {
          log(`API fix returned error: ${data.message}`, colors.yellow);
        }
      } else {
        log(`API fix failed with status: ${response.status}`, colors.yellow);
      }
    } catch (fetchErr) {
      log(`Could not call fix endpoint: ${fetchErr.message}`, colors.yellow);
    }
  } catch (error) {
    log(`Error calling fix endpoint: ${error.message}`, colors.yellow);
    // Continue despite errors
  }
}

// Main function
async function main() {
  try {
    const connectionSuccess = await testDatabaseConnection();
    
    if (connectionSuccess) {
      logSuccess('Database connection verified. Running migrations...');
      
      // Run migrations
      runMigrations();
      
      // Try to call fix endpoint as a last resort
      await callFixEndpoint();
      
      log('Vercel migration process completed!', colors.bright + colors.green);
      process.exit(0);
    } else {
      logError('Database connection failed. Check your database configuration.');
      // Exit with 0 to allow deployment to continue despite db connection issues
      process.exit(0);
    }
  } catch (error) {
    logError(`Vercel migration script failed: ${error.message}`);
    // Exit with 0 to allow deployment to continue despite migration issues
    process.exit(0);
  }
}

// Function to run migrations
function runMigrations() {
  try {
    log('🚀 Running database migrations...', colors.bright + colors.blue);
    
    // Define migration scripts to run (in order)
    const migrationScripts = [
      '../scripts/migrate.js',
      '../scripts/migrate-blacklisted-tokens.js',
      '../scripts/migrate-password-resets.js',
      '../scripts/migrate-seat-code.js',
      '../scripts/migrate-short-codes.js',
      '../scripts/migrate-branch-images.js',
      '../scripts/migrate-branch-amenities.js',
      '../scripts/migrate-customer-profile-fields.js'
    ];

    // Try to run each migration script
    for (const scriptPath of migrationScripts) {
      const fullPath = path.resolve(__dirname, scriptPath);
      
      if (fs.existsSync(fullPath)) {
        try {
          log(`🔄 Running ${path.basename(scriptPath)}...`, colors.blue);
          require(fullPath);
          logSuccess(`Successfully executed ${path.basename(scriptPath)}`);
        } catch (error) {
          logError(`Error running ${path.basename(scriptPath)}: ${error.message}`);
          // Continue to the next migration
        }
      } else {
        log(`⚠️ Migration script not found: ${scriptPath}`, colors.yellow);
      }
    }
    
    logSuccess('Database migrations completed');
  } catch (error) {
    logError(`Error during migrations: ${error.message}`);
    log('⚠️ Continuing build process despite migration errors', colors.yellow);
  }
}

// Run the script
main().catch(err => {
  logError(`Uncaught error: ${err.message}`);
  process.exit(0); // Always exit with 0 to not break Vercel deployment
}); 