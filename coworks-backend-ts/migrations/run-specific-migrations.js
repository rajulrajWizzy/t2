/**
 * Run Specific Migration
 * 
 * This script runs only the blacklisted token table fix migration
 * to resolve 401/500 errors related to missing columns.
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

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
  const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';
  
  // Determine if we're in production by checking for DATABASE_URL
  const isProduction = !!process.env.DATABASE_URL;
  
  // SSL configuration
  const sslEnabled = process.env.DB_SSL === 'true' || isProduction;
  
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

// Fix the blacklisted tokens table
async function fixBlacklistedTokensTable(sequelize, schema) {
  try {
    log('Checking blacklisted_tokens table...', colors.cyan);
    
    // Check if the table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${schema}' 
        AND table_name = 'blacklisted_tokens'
      );
    `);
    
    const exists = tableExists[0]?.exists || false;
    log(`BlacklistedToken table exists: ${exists}`, colors.cyan);
    
    if (exists) {
      // Get current columns
      const [columnsResult] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${schema}' 
        AND table_name = 'blacklisted_tokens';
      `);
      
      log('Current columns:', colors.cyan);
      columnsResult.forEach(col => {
        log(`  - ${col.column_name} (${col.data_type})`, colors.cyan);
      });
      
      // Check for the blacklisted_at column
      const hasBlacklistedAt = columnsResult.some(col => col.column_name === 'blacklisted_at');
      if (!hasBlacklistedAt) {
        log('Adding blacklisted_at column...', colors.yellow);
        await sequelize.query(`
          ALTER TABLE "${schema}"."blacklisted_tokens" 
          ADD COLUMN "blacklisted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        log('✅ Added blacklisted_at column', colors.green);
      } else {
        log('✅ blacklisted_at column already exists', colors.green);
      }
      
      // Check for the user_id column - if it exists, make it nullable
      const hasUserId = columnsResult.some(col => col.column_name === 'user_id');
      if (hasUserId) {
        log('Making user_id column nullable...', colors.yellow);
        await sequelize.query(`
          ALTER TABLE "${schema}"."blacklisted_tokens" 
          ALTER COLUMN "user_id" DROP NOT NULL;
        `);
        log('✅ Made user_id column nullable', colors.green);
      }
      
      // Check for the updated_at column - if it exists, remove it
      const hasUpdatedAt = columnsResult.some(col => col.column_name === 'updated_at');
      if (hasUpdatedAt) {
        log('Removing updated_at column...', colors.yellow);
        await sequelize.query(`
          ALTER TABLE "${schema}"."blacklisted_tokens" 
          DROP COLUMN "updated_at";
        `);
        log('✅ Removed updated_at column', colors.green);
      }
      
      log('✅ BlacklistedToken table has been fixed', colors.green);
    } else {
      // Create the table with the correct structure
      log('Creating BlacklistedToken table...', colors.yellow);
      await sequelize.query(`
        CREATE TABLE "${schema}"."blacklisted_tokens" (
          "id" SERIAL PRIMARY KEY,
          "token" TEXT NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "blacklisted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX "idx_blacklisted_tokens_token" ON "${schema}"."blacklisted_tokens" ("token");
      `);
      log('✅ Created BlacklistedToken table with correct structure', colors.green);
    }
    
    return true;
  } catch (error) {
    log(`❌ Error fixing BlacklistedToken table: ${error.message}`, colors.red);
    throw error;
  }
}

// Update JWT utility code if needed
async function updateJwtUtilCode() {
  try {
    const jwtUtilPath = path.join(__dirname, '..', 'src', 'utils', 'jwt.ts');
    
    if (fs.existsSync(jwtUtilPath)) {
      log('Checking JWT utility code...', colors.cyan);
      
      let content = fs.readFileSync(jwtUtilPath, 'utf8');
      
      // Check if we need to update the blacklistToken function
      if (content.includes('blacklisted_at') || content.includes('user_id')) {
        log('Updating blacklistToken function...', colors.yellow);
        
        // Replace the blacklistToken function with a version that only uses existing columns
        const updatedContent = content.replace(
          /export async function blacklistToken\([^{]+{[\s\S]+?try {[\s\S]+?const \{ default: sequelize \} = await import\([^)]+\);[\s\S]+?await sequelize\.query\([^;]+;/m,
          `export async function blacklistToken(token: string): Promise<void> {
  // Only run in Node.js environment, not Edge
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      // Decode the token to get expiration time (without verifying)
      const decoded = jwt.decode(token) as { exp?: number };
      const expiresAt = decoded?.exp 
        ? new Date(decoded.exp * 1000) 
        : new Date();
      
      // Get direct database connection
      const { default: sequelize } = await import('@/config/database');
      
      // Use raw SQL query to insert token into blacklist
      await sequelize.query(
        \`INSERT INTO "excel_coworks_schema"."blacklisted_tokens"
         (token, expires_at, created_at)
         VALUES (:token, :expiresAt, NOW())\`,
        { 
          replacements: { 
            token,
            expiresAt: expiresAt.toISOString()
          }
        }
      );`
        );
        
        // Only write the file if there were changes
        if (updatedContent !== content) {
          fs.writeFileSync(jwtUtilPath, updatedContent, 'utf8');
          log('✅ Updated blacklistToken function in JWT utility', colors.green);
        } else {
          log('✅ JWT utility code already up to date', colors.green);
        }
      } else {
        log('✅ JWT utility code already up to date', colors.green);
      }
    } else {
      log('⚠️ JWT utility file not found, skipping code update', colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`❌ Error updating JWT utility code: ${error.message}`, colors.red);
    return false;
  }
}

// Main function
async function runMigration() {
  log('\n🔄 Running BlacklistedToken Migration', colors.bright);
  log('=======================================', colors.bright);
  
  const sequelize = getSequelizeInstance();
  const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
  
  try {
    // Test database connection
    await sequelize.authenticate();
    log('✅ Connected to database successfully', colors.green);
    
    // Ensure schema exists
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    log(`✅ Ensured schema "${schema}" exists`, colors.green);
    
    // Fix the blacklisted tokens table
    await fixBlacklistedTokensTable(sequelize, schema);
    
    // Update JWT utility code if needed
    await updateJwtUtilCode();
    
    log('\n✅ Migration completed successfully!', colors.green);
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runMigration(); 