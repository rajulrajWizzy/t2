/**
 * Deployment Check Script
 * 
 * This script runs during deployment to verify that all tables and data
 * are properly set up. It integrates with the database setup process.
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Create Sequelize instance
function getSequelizeInstance() {
  const dbSchema = process.env.DB_SCHEMA || 'public';
  
  // Determine if we're in production by checking for DATABASE_URL
  const isProduction = !!process.env.DATABASE_URL;
  
  // SSL configuration - only use SSL in production if not explicitly disabled
  const sslEnabled = process.env.DB_SSL !== 'false' && isProduction;
  
  log(`SSL config: ${sslEnabled ? 'enabled' : 'disabled'}`, colors.cyan);
  
  let dialectOptions = {};
  if (sslEnabled) {
    dialectOptions.ssl = {
      require: true,
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
    log('SSL options configured', colors.cyan);
  }
  
  // Common options
  const commonOptions = {
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    dialectOptions
  };
  
  let sequelize;
  
  // Check if DATABASE_URL exists (production)
  if (isProduction) {
    log('Using DATABASE_URL for connection', colors.cyan);
    sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
  } else {
    // Fallback to individual credentials (local development)
    log('Using individual credentials for connection', colors.cyan);
    sequelize = new Sequelize(
      process.env.DB_NAME || 'postgres',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASS || '',
      {
        ...commonOptions,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10)
      }
    );
  }
  
  return sequelize;
}

// Check admin and customers tables 
async function verifyDatabaseSetup() {
  log(`${colors.bright}${colors.cyan}===== Verifying Database Setup =====`, colors.cyan);
  
  const sequelize = getSequelizeInstance();
  const schema = process.env.DB_SCHEMA || 'public';
  
  try {
    // Test connection
    await sequelize.authenticate();
    log('✅ Database connection established', colors.green);
    
    // Check admin table
    const [adminTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'admins'
      );
    `);
    
    if (!adminTableExists[0].exists) {
      log('❌ Admin table does not exist!', colors.red);
      log('ℹ️  Run "node migrations/run-migrations.js" to fix this issue', colors.yellow);
      process.exit(1);
    } else {
      log('✅ Admin table exists', colors.green);
      
      // Check if we have any admin users
      const [adminCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM "${schema}"."admins";
      `);
      
      if (parseInt(adminCount[0].count) === 0) {
        log('⚠️ No admin users found', colors.yellow);
        log('ℹ️  Run "node scripts/reset-admin.js" to create a default admin', colors.yellow);
      } else {
        log(`✅ Found ${adminCount[0].count} admin users`, colors.green);
      }
    }
    
    // Check customers table
    const [customersTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'customers'
      );
    `);
    
    if (customersTableExists[0].exists) {
      log('✅ Customers table exists', colors.green);
      
      // Check if is_identity_verified column exists
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'customers'
          AND column_name = 'is_identity_verified'
        );
      `);
      
      if (!columnExists[0].exists) {
        log('❌ is_identity_verified column is missing from customers table!', colors.red);
        log('ℹ️  Run "node migrations/run-migrations.js" to fix this issue', colors.yellow);
      } else {
        log('✅ is_identity_verified column exists in customers table', colors.green);
      }
      
      // Check for customers with invalid passwords
      try {
        // Check for customers with NULL or empty passwords
        const [emptyPasswordCustomers] = await sequelize.query(`
          SELECT COUNT(*) as count FROM "${schema}"."customers"
          WHERE password IS NULL OR password = ''
          OR length(password) < 10;
        `);
        
        const emptyPasswordCount = parseInt(emptyPasswordCustomers[0].count || 0);
        
        if (emptyPasswordCount > 0) {
          log(`⚠️ Found ${emptyPasswordCount} customers with missing or invalid passwords`, colors.yellow);
          log('ℹ️  Run "node migrations/run-migrations.js" to fix these issues', colors.yellow);
        }
        
        // Check for customers with non-bcrypt password hashes
        const [invalidPasswordCustomers] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM "${schema}"."customers"
          WHERE password IS NOT NULL
          AND length(password) > 10 
          AND (
            substring(password from 1 for 4) != '$2a$'
            AND substring(password from 1 for 4) != '$2b$'
            AND substring(password from 1 for 4) != '$2y$'
          )
        `);
        
        const invalidPasswordCount = parseInt(invalidPasswordCustomers[0].count || 0);
        
        if (invalidPasswordCount > 0) {
          log(`⚠️ Found ${invalidPasswordCount} customers with invalid password formats`, colors.yellow);
          log('ℹ️  Run "node migrations/run-migrations.js" to fix these issues', colors.yellow);
        }
        
        if (emptyPasswordCount === 0 && invalidPasswordCount === 0) {
          log('✅ All customer passwords have valid formats', colors.green);
        }
      } catch (passwordCheckError) {
        log(`⚠️ Could not verify customer passwords: ${passwordCheckError.message}`, colors.yellow);
      }
    } else {
      log('⚠️ Customers table does not exist yet', colors.yellow);
      log('ℹ️  This will be created when needed', colors.cyan);
    }
    
    // Check other key tables
    const requiredTables = ['migrations', 'branches', 'seats', 'seat_bookings'];
    for (const table of requiredTables) {
      const [tableExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = '${schema}'
          AND table_name = '${table}'
        );
      `);
      
      if (tableExists[0].exists) {
        log(`✅ ${table} table exists`, colors.green);
      } else {
        log(`⚠️ ${table} table does not exist yet`, colors.yellow);
      }
    }
    
    log(`\n${colors.bright}${colors.green}===== Database Check Complete =====`, colors.green);
    log('✅ All required tables have been verified', colors.green);
    
    await sequelize.close();
    return true;
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, colors.red);
    
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyDatabaseSetup().then(() => {
  process.exit(0);
}).catch(error => {
  log(`\n❌ An unexpected error occurred: ${error.message}`, colors.red);
  process.exit(1);
});

module.exports = {
  verifyDatabaseSetup
}; 