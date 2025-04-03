/**
 * Unified Migrations
 * 
 * This file combines all migration scripts into a single executable file.
 * It handles all database schema creation and updates in the correct sequence.
 */

const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Try to load the script.js fixes
let scriptFixes;
try {
  scriptFixes = require('../scripts/script');
} catch (error) {
  console.log('Script fixes module not found, continuing without it');
  scriptFixes = null;
}

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

// Create uploads directory if it doesn't exist
function createUploadsDir() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    log('Creating uploads directory...', colors.yellow);
    fs.mkdirSync(uploadsDir, { recursive: true });
    log('✅ Uploads directory created', colors.green);
  }
}

// Create log directory if it doesn't exist
function createLogDir() {
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    log('Creating logs directory...', colors.yellow);
    fs.mkdirSync(logDir, { recursive: true });
    log('✅ Logs directory created', colors.green);
  }
}

// Ensure migrations table exists
async function ensureMigrationsTable(sequelize, schema) {
  try {
    const [migrationResult] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'migrations'
      );`
    );

    if (!(migrationResult[0].exists)) {
      log('Creating migrations table...', colors.yellow);
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${schema}"."migrations" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      log('✅ Migrations table created', colors.green);
    }
  } catch (err) {
    log(`❌ Error checking/creating migrations table: ${err.message}`, colors.red);
    throw err;
  }
}

// Check if migration has been applied
async function checkMigration(sequelize, schema, name) {
  try {
    const [result] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM "${schema}"."migrations"
        WHERE name = '${name}'
      );`
    );
    return result[0].exists;
  } catch (err) {
    log(`❌ Error checking migration status: ${err.message}`, colors.red);
    throw err;
  }
}

// Record migration as applied
async function recordMigration(sequelize, schema, name) {
  try {
    // First check if migration already exists
    const [exists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM "${schema}"."migrations"
        WHERE name = '${name}'
      );
    `);
    
    if (!exists[0].exists) {
      await sequelize.query(`
        INSERT INTO "${schema}"."migrations" (name)
        VALUES ('${name}');
      `);
      log(`✅ Recorded migration: ${name}`, colors.green);
    } else {
      log(`ℹ️ Migration ${name} already recorded`, colors.cyan);
    }
  } catch (err) {
    log(`❌ Error recording migration: ${err.message}`, colors.red);
    throw err;
  }
}

// Migration: Fix time slots table
async function fixTimeSlotsTable(sequelize, schema) {
  const migrationName = '028_fix_time_slots_table';
  
  if (await checkMigration(sequelize, schema, migrationName)) {
    log(`Migration ${migrationName} already applied`, colors.cyan);
    return;
  }
  
  log('Running time slots table migration...', colors.yellow);
  
  try {
    // Check if time_slots table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${schema}' 
        AND table_name = 'time_slots'
      );
    `);
    
    if (!tableExists[0].exists) {
      log('Creating time_slots table...', colors.yellow);
      await sequelize.query(`
        CREATE TABLE "${schema}"."time_slots" (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES "${schema}"."branches"(id),
          seat_id INTEGER NOT NULL REFERENCES "${schema}"."seats"(id),
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_available BOOLEAN NOT NULL DEFAULT true,
          booking_id INTEGER REFERENCES "${schema}"."seat_bookings"(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // Check if date column exists
      const [dateColumnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${schema}' 
          AND table_name = 'time_slots'
          AND column_name = 'date'
        );
      `);
      
      if (!dateColumnExists[0].exists) {
        log('Adding date column to time_slots table...', colors.yellow);
        await sequelize.query(`
          ALTER TABLE "${schema}"."time_slots"
          ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
        `);
      }
      
      // Fix start_time and end_time column types if needed
      await sequelize.query(`
        ALTER TABLE "${schema}"."time_slots"
        ALTER COLUMN start_time TYPE TIME USING start_time::time,
        ALTER COLUMN end_time TYPE TIME USING end_time::time;
      `);
    }
    
    await recordMigration(sequelize, schema, migrationName);
    log('✅ Time slots table structure has been fixed', colors.green);
  } catch (error) {
    log(`❌ Error fixing time_slots table: ${error.message}`, colors.red);
    throw error;
  }
}

// Support ticket system migration
async function createSupportTicketSystem(sequelize, schema) {
  const migrationName = '029_create_support_ticket_system';
  
  if (await checkMigration(sequelize, schema, migrationName)) {
    log(`Migration ${migrationName} already applied`, colors.cyan);
    return;
  }
  
  log('Creating support ticket system tables...', colors.yellow);
  
  try {
    // Create support_tickets table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."support_tickets" (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES "${schema}"."customers"(id),
        branch_id INTEGER REFERENCES "${schema}"."branches"(id),
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        category VARCHAR(50),
        assigned_to INTEGER REFERENCES "${schema}"."admins"(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT
      );
    `);
    
    // Create ticket_messages table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."ticket_messages" (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES "${schema}"."support_tickets"(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        attachments JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better query performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON "${schema}"."support_tickets"(customer_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_branch ON "${schema}"."support_tickets"(branch_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON "${schema}"."support_tickets"(status);
      CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON "${schema}"."ticket_messages"(ticket_id);
    `);
    
    await recordMigration(sequelize, schema, migrationName);
    log('✅ Support ticket system tables created successfully', colors.green);
  } catch (error) {
    log(`❌ Error creating support ticket system: ${error.message}`, colors.red);
    throw error;
  }
}

// Fix database issues using admin and customer table fixes
async function fixDatabaseIssues(sequelize, schema) {
  try {
    log('Running database fixes...', colors.yellow);
    
    // If the script fixes module is available, use it
    if (scriptFixes && typeof scriptFixes.fixDatabaseIssues === 'function') {
      const success = await scriptFixes.fixDatabaseIssues();
      if (success) {
        log('✅ Database fixes applied successfully using script module', colors.green);
        return;
      }
      log('⚠️ Script module fixes failed, falling back to direct fixes', colors.yellow);
    }
    
    // Check admins table
    log('Checking admins table...', colors.cyan);
    const [adminTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'admins'
      );
    `);
    
    // Create admins table if needed
    if (!adminTableExists[0].exists) {
      log('Creating admins table...', colors.yellow);
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${schema}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'staff',
          branch_id INTEGER NULL,
          permissions JSONB NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      log('✅ Admins table created', colors.green);
    }
    
    // Check if we need to create a default admin
    const [adminCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "${schema}"."admins";
    `);
    
    if (parseInt(adminCount[0].count) === 0) {
      log('Creating default admin user...', colors.yellow);
      
      // Generate password hash
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('Admin@123', salt);
      
      // Insert default admin
      await sequelize.query(`
        INSERT INTO "${schema}"."admins" (
          username, email, password, name, role, permissions, is_active
        ) VALUES (
          'admin',
          'admin@example.com',
          $1,
          'Admin User',
          'super_admin',
          $2,
          TRUE
        );
      `, {
        bind: [
          hashedPassword,
          JSON.stringify({
            seats: ['read', 'create', 'update', 'delete'],
            branches: ['read', 'create', 'update', 'delete'],
            bookings: ['read', 'create', 'update', 'delete'],
            customers: ['read', 'create', 'update', 'delete']
          })
        ]
      });
      
      log('✅ Default admin created', colors.green);
    }
    
    // Check customers table
    log('Checking customers table...', colors.cyan);
    const [customersTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'customers'
      );
    `);
    
    if (customersTableExists[0].exists) {
      // Check for is_identity_verified column
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'customers'
          AND column_name = 'is_identity_verified'
        );
      `);
      
      if (!columnExists[0].exists) {
        log('Adding is_identity_verified column to customers table...', colors.yellow);
        await sequelize.query(`
          ALTER TABLE "${schema}"."customers"
          ADD COLUMN is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        log('✅ is_identity_verified column added', colors.green);
      }
      
      // Fix customers with missing or invalid passwords
      log('Checking for customers with password issues...', colors.yellow);
      
      try {
        // Generate bcrypt hash for default password
        const bcrypt = require('bcryptjs');
        const salt = bcrypt.genSaltSync(10);
        const defaultPassword = bcrypt.hashSync('Customer@123', salt);
        
        // Find customers with NULL or empty passwords
        const [emptyPasswordCustomers] = await sequelize.query(`
          SELECT id, email FROM "${schema}"."customers"
          WHERE password IS NULL OR password = ''
          OR length(password) < 10
        `);
        
        if (emptyPasswordCustomers.length > 0) {
          log(`Found ${emptyPasswordCustomers.length} customers with missing or invalid passwords`, colors.yellow);
          
          for (const customer of emptyPasswordCustomers) {
            await sequelize.query(`
              UPDATE "${schema}"."customers"
              SET password = $1, updated_at = NOW()
              WHERE id = $2
            `, {
              bind: [defaultPassword, customer.id]
            });
          }
          
          log(`✅ Fixed passwords for ${emptyPasswordCustomers.length} customers`, colors.green);
    } else {
          log('No customers with missing passwords found', colors.green);
        }
        
        // Find customers with passwords that aren't valid bcrypt hashes
        // This query checks for the bcrypt format which begins with $2a$, $2b$, or $2y$
        const [invalidPasswordCustomers] = await sequelize.query(`
          SELECT id, email, substring(password from 1 for 4) as password_prefix
          FROM "${schema}"."customers"
          WHERE password IS NOT NULL
          AND length(password) > 10 
          AND (
            substring(password from 1 for 4) != '$2a$'
            AND substring(password from 1 for 4) != '$2b$'
            AND substring(password from 1 for 4) != '$2y$'
          )
        `);
        
        if (invalidPasswordCustomers.length > 0) {
          log(`Found ${invalidPasswordCustomers.length} customers with non-bcrypt password hashes`, colors.yellow);
          
          for (const customer of invalidPasswordCustomers) {
            await sequelize.query(`
              UPDATE "${schema}"."customers"
              SET password = $1, updated_at = NOW()
              WHERE id = $2
            `, {
              bind: [defaultPassword, customer.id]
            });
          }
          
          log(`✅ Fixed invalid password formats for ${invalidPasswordCustomers.length} customers`, colors.green);
        } else {
          log('No customers with invalid password formats found', colors.green);
        }
      } catch (passwordFixError) {
        log(`⚠️ Error fixing customer passwords: ${passwordFixError.message}`, colors.red);
        // Continue with other fixes even if password fix fails
      }
    }
    
    log('✅ All database fixes completed successfully', colors.green);
  } catch (error) {
    log(`❌ Error applying database fixes: ${error.message}`, colors.red);
    throw error;
  }
}

// Main migration function
async function runMigrations() {
  log(`${colors.bright}${colors.cyan}===== Running Unified Migrations =====`, colors.cyan);
  console.log('');
  
  // Initialize
  const sequelize = getSequelizeInstance();
  const schema = process.env.DB_SCHEMA || 'public';
  
  try {
    // Test connection
    await sequelize.authenticate();
    log('✅ Database connection established', colors.green);
    
    // Ensure migrations table exists
    await ensureMigrationsTable(sequelize, schema);
    
    // Create uploads directory
    createUploadsDir();
    
    // Create logs directory
    createLogDir();
    
    // Run the fixes for admin and customer tables
    await fixDatabaseIssues(sequelize, schema);
    
    // Create support ticket system
    await createSupportTicketSystem(sequelize, schema);
    
    // Define all migrations in sequence
    const migrations = [
      // Run time slots table fix
      {
        name: '028_fix_time_slots_table',
        up: async () => await fixTimeSlotsTable(sequelize, schema)
      },
      
      // Run support ticket system migration
      {
        name: '029_create_support_ticket_system',
        up: async () => await createSupportTicketSystem(sequelize, schema)
      },
      
      {
        name: '001_create_base_tables',
        up: async () => {
          log('Creating base tables...', colors.cyan);
          
          // branches table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."branches" (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              address TEXT NOT NULL,
              location TEXT NOT NULL,
              latitude DECIMAL(10, 8),
              longitude DECIMAL(11, 8),
              cost_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
              opening_time TIME NOT NULL DEFAULT '08:00:00',
              closing_time TIME NOT NULL DEFAULT '22:00:00',
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              images JSONB,
              amenities JSONB,
              short_code VARCHAR(10) NOT NULL UNIQUE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // customers table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."customers" (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) DEFAULT '',
              email VARCHAR(100) NOT NULL UNIQUE,
              phone VARCHAR(20),
              password VARCHAR(255) NOT NULL,
              profile_picture VARCHAR(255),
              company_name VARCHAR(100) DEFAULT '',
              proof_of_identity VARCHAR(255),
              proof_of_address VARCHAR(255),
              address TEXT,
              is_identity_verified BOOLEAN DEFAULT FALSE,
              is_address_verified BOOLEAN DEFAULT FALSE,
              verification_status VARCHAR(20) DEFAULT 'PENDING',
              verification_notes TEXT,
              verification_date TIMESTAMP,
              verified_by INTEGER,
              first_name VARCHAR(50),
              last_name VARCHAR(50),
              is_verified BOOLEAN DEFAULT FALSE,
              verification_token VARCHAR(100),
              verification_expires TIMESTAMP,
              role VARCHAR(20) DEFAULT 'customer',
              coins INTEGER DEFAULT 0,
              status VARCHAR(20) DEFAULT 'active',
              last_login TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // seating_types table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."seating_types" (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              description TEXT,
              hourly_rate DECIMAL(10, 2) NOT NULL,
              daily_rate DECIMAL(10, 2),
              weekly_rate DECIMAL(10, 2),
              monthly_rate DECIMAL(10, 2),
              capacity INTEGER,
              amenities JSONB,
              is_meeting_room BOOLEAN NOT NULL DEFAULT FALSE,
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              image_url VARCHAR(255),
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // seats table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."seats" (
              id SERIAL PRIMARY KEY,
              branch_id INTEGER NOT NULL REFERENCES "${schema}"."branches"(id) ON DELETE CASCADE,
              seating_type_id INTEGER NOT NULL REFERENCES "${schema}"."seating_types"(id) ON DELETE RESTRICT,
              name VARCHAR(100) NOT NULL,
              description TEXT,
              seat_number VARCHAR(50),
              capacity INTEGER NOT NULL DEFAULT 1,
              floor_number INTEGER,
              position_x DECIMAL(10, 2),
              position_y DECIMAL(10, 2),
              width DECIMAL(10, 2),
              height DECIMAL(10, 2),
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              features JSONB,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(branch_id, seat_number)
            );
          `);
          
          // seat_bookings table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."seat_bookings" (
              id SERIAL PRIMARY KEY,
              customer_id INTEGER NOT NULL REFERENCES "${schema}"."customers"(id) ON DELETE CASCADE,
              seat_id INTEGER NOT NULL REFERENCES "${schema}"."seats"(id) ON DELETE CASCADE,
              start_time TIMESTAMP NOT NULL,
              end_time TIMESTAMP NOT NULL,
              status VARCHAR(20) NOT NULL DEFAULT 'pending',
              payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
              total_amount DECIMAL(10, 2) NOT NULL,
              notes TEXT,
              check_in_time TIMESTAMP,
              check_out_time TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // meeting_bookings table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."meeting_bookings" (
              id SERIAL PRIMARY KEY,
              customer_id INTEGER NOT NULL REFERENCES "${schema}"."customers"(id) ON DELETE CASCADE,
              meeting_room_id INTEGER NOT NULL REFERENCES "${schema}"."seats"(id) ON DELETE CASCADE,
              start_time TIMESTAMP NOT NULL,
              end_time TIMESTAMP NOT NULL,
              attendees INTEGER NOT NULL DEFAULT 1,
              status VARCHAR(20) NOT NULL DEFAULT 'pending',
              payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
              total_amount DECIMAL(10, 2) NOT NULL,
              total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
              purpose TEXT,
              check_in_time TIMESTAMP,
              check_out_time TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // payments table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."payments" (
              id SERIAL PRIMARY KEY,
              booking_id INTEGER NOT NULL,
              booking_type VARCHAR(20) NOT NULL,
              amount DECIMAL(10, 2) NOT NULL,
              status VARCHAR(20) NOT NULL DEFAULT 'pending',
              payment_method VARCHAR(50),
              transaction_id VARCHAR(100),
              payment_date TIMESTAMP,
              refund_status VARCHAR(20),
              refund_amount DECIMAL(10, 2),
              refund_date TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // time_slots table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."time_slots" (
              id SERIAL PRIMARY KEY,
              branch_id INTEGER NOT NULL REFERENCES "${schema}"."branches"(id) ON DELETE CASCADE,
              seat_id INTEGER NOT NULL REFERENCES "${schema}"."seats"(id) ON DELETE CASCADE,
              booking_id INTEGER REFERENCES "${schema}"."seat_bookings"(id) ON DELETE SET NULL,
              date DATE NOT NULL,
              start_time TIME NOT NULL,
              end_time TIME NOT NULL,
              is_available BOOLEAN NOT NULL DEFAULT TRUE,
              price DECIMAL(10, 2),
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Base tables created successfully', colors.green);
        }
      },
      {
        name: '002_create_admin_table',
        up: async () => {
          log('Creating admin table...', colors.cyan);
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."admins" (
              id SERIAL PRIMARY KEY,
              username VARCHAR(50) NOT NULL UNIQUE,
              email VARCHAR(100) NOT NULL UNIQUE,
              password VARCHAR(100) NOT NULL,
              name VARCHAR(100) NOT NULL,
              phone VARCHAR(20),
              profile_image VARCHAR(255),
              role VARCHAR(20) NOT NULL DEFAULT 'branch_admin',
              branch_id INTEGER REFERENCES "${schema}"."branches"(id) ON DELETE SET NULL,
              permissions JSONB,
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              last_login TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Admin table created successfully', colors.green);
        }
      },
      {
        name: '003_create_admin_branches_table',
        up: async () => {
          log('Creating admin_branches table...', colors.cyan);
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."admin_branches" (
              id SERIAL PRIMARY KEY,
              admin_id INTEGER NOT NULL REFERENCES "${schema}"."admins"(id) ON DELETE CASCADE,
              branch_id INTEGER NOT NULL REFERENCES "${schema}"."branches"(id) ON DELETE CASCADE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(admin_id, branch_id)
            );
          `);
          
          log('✅ Admin branches table created successfully', colors.green);
        }
      },
      {
        name: '004_create_auth_tables',
        up: async () => {
          log('Creating authentication tables...', colors.cyan);
          
          // blacklisted_tokens table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."blacklisted_tokens" (
              id SERIAL PRIMARY KEY,
              token TEXT NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // password_reset table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."password_reset" (
              id SERIAL PRIMARY KEY,
              email VARCHAR(100) NOT NULL,
              token VARCHAR(100) NOT NULL UNIQUE,
              expires_at TIMESTAMP NOT NULL,
              used BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // reset_token table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."reset_token" (
              id SERIAL PRIMARY KEY,
              email VARCHAR(100) NOT NULL,
              token VARCHAR(100) NOT NULL UNIQUE,
              expires_at TIMESTAMP NOT NULL,
              is_used BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Authentication tables created successfully', colors.green);
        }
      },
      {
        name: '005_create_branch_images_table',
        up: async () => {
          log('Creating branch_images table...', colors.cyan);
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."branch_images" (
              id SERIAL PRIMARY KEY,
              branch_id INTEGER NOT NULL REFERENCES "${schema}"."branches"(id) ON DELETE CASCADE,
              image_url VARCHAR(255) NOT NULL,
              caption VARCHAR(255),
              display_order INTEGER NOT NULL DEFAULT 0,
              is_primary BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Branch images table created successfully', colors.green);
        }
      },
      {
        name: '006_create_payment_logs_table',
        up: async () => {
          log('Creating payment_logs table...', colors.cyan);
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."payment_logs" (
              id SERIAL PRIMARY KEY,
              booking_id INTEGER NOT NULL,
              booking_type VARCHAR(20) NOT NULL,
              amount DECIMAL(10, 2) NOT NULL,
              status VARCHAR(20) NOT NULL,
              payment_method VARCHAR(50),
              transaction_id VARCHAR(100),
              gateway_response JSONB,
              ip_address VARCHAR(45),
              user_agent TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Payment logs table created successfully', colors.green);
        }
      },
      {
        name: '007_create_support_tables',
        up: async () => {
          log('Creating support ticket tables...', colors.cyan);
          
          // support_tickets table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."support_tickets" (
              id SERIAL PRIMARY KEY,
              customer_id INTEGER NOT NULL REFERENCES "${schema}"."customers"(id) ON DELETE CASCADE,
              branch_id INTEGER REFERENCES "${schema}"."branches"(id) ON DELETE SET NULL,
              seating_type_id INTEGER REFERENCES "${schema}"."seating_types"(id) ON DELETE SET NULL,
              subject VARCHAR(255) NOT NULL,
              description TEXT NOT NULL,
              status VARCHAR(20) NOT NULL DEFAULT 'open',
              priority VARCHAR(20) NOT NULL DEFAULT 'medium',
              assigned_to INTEGER REFERENCES "${schema}"."admins"(id) ON DELETE SET NULL,
              closed_at TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // ticket_messages table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."ticket_messages" (
              id SERIAL PRIMARY KEY,
              ticket_id INTEGER NOT NULL REFERENCES "${schema}"."support_tickets"(id) ON DELETE CASCADE,
              message TEXT NOT NULL,
              sender_type VARCHAR(20) NOT NULL,
              sender_id INTEGER NOT NULL,
              is_read BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Support ticket tables created successfully', colors.green);
        }
      },
      {
        name: '008_create_customer_coin_transactions_table',
        up: async () => {
          log('Creating customer_coin_transactions table...', colors.cyan);
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "${schema}"."customer_coin_transactions" (
              id SERIAL PRIMARY KEY,
              customer_id INTEGER NOT NULL REFERENCES "${schema}"."customers"(id) ON DELETE CASCADE,
              amount INTEGER NOT NULL,
              transaction_type VARCHAR(50) NOT NULL,
              booking_id INTEGER,
              booking_type VARCHAR(20),
              description TEXT NOT NULL,
              balance_after INTEGER NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          log('✅ Customer coin transactions table created successfully', colors.green);
        }
      },
      {
        name: '009_create_indexes',
        up: async () => {
          log('Creating indexes for performance...', colors.cyan);
          
          // Create indexes for seat_bookings
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_seat_bookings_customer_id ON "${schema}"."seat_bookings"(customer_id);
            CREATE INDEX IF NOT EXISTS idx_seat_bookings_seat_id ON "${schema}"."seat_bookings"(seat_id);
            CREATE INDEX IF NOT EXISTS idx_seat_bookings_status ON "${schema}"."seat_bookings"(status);
          `);
          
          // Create indexes for meeting_bookings
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_meeting_bookings_customer_id ON "${schema}"."meeting_bookings"(customer_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_bookings_meeting_room_id ON "${schema}"."meeting_bookings"(meeting_room_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON "${schema}"."meeting_bookings"(status);
          `);
          
          // Create indexes for seats
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_seats_branch_id ON "${schema}"."seats"(branch_id);
            CREATE INDEX IF NOT EXISTS idx_seats_seating_type_id ON "${schema}"."seats"(seating_type_id);
          `);
          
          // Create indexes for payments
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_payments_booking_id_type ON "${schema}"."payments"(booking_id, booking_type);
          `);
          
          // Create indexes for time_slots
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_time_slots_seat_id ON "${schema}"."time_slots"(seat_id);
            CREATE INDEX IF NOT EXISTS idx_time_slots_branch_id ON "${schema}"."time_slots"(branch_id);
          `);
          
          // Create indexes for admins and customers
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_admins_role ON "${schema}"."admins"(role);
            CREATE INDEX IF NOT EXISTS idx_customers_email ON "${schema}"."customers"(email);
          `);
          
          // Create indexes for support_tickets
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON "${schema}"."support_tickets"(customer_id);
            CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON "${schema}"."support_tickets"(status);
          `);
          
          // Create indexes for ticket_messages
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON "${schema}"."ticket_messages"(ticket_id);
          `);
          
          log('✅ Indexes created successfully', colors.green);
        }
      },
      {
        name: '010_fix_customer_fields',
        up: async () => {
          log('Fixing customer fields if needed...', colors.cyan);
          
          // Add verification_token if it doesn't exist
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verification_token VARCHAR(100);
            `);
          } catch (error) {
            log(`Column verification_token already exists or error: ${error.message}`, colors.yellow);
          }
          
          // Add verification_expires if it doesn't exist
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
            `);
          } catch (error) {
            log(`Column verification_expires already exists or error: ${error.message}`, colors.yellow);
          }
          
          log('✅ Customer fields fixed successfully', colors.green);
        }
      },
      {
        name: '011_add_payment_status_to_bookings',
        up: async () => {
          log('Adding payment_status column to booking tables if it does not exist...', colors.cyan);
          
          // Check if payment_status column exists in seat_bookings
          const [seatBookingsCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = '${schema}'
              AND table_name = 'seat_bookings'
              AND column_name = 'payment_status'
            ) as exists;
          `);
          
          // Add payment_status to seat_bookings if it doesn't exist
          if (!(seatBookingsCheck[0].exists)) {
            log('Adding payment_status column to seat_bookings table...', colors.yellow);
            await sequelize.query(`
              ALTER TABLE "${schema}"."seat_bookings"
              ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
            `);
            log('✅ Added payment_status column to seat_bookings', colors.green);
          } else {
            log('✅ payment_status column already exists in seat_bookings', colors.green);
          }
          
          // Check if payment_status column exists in meeting_bookings
          const [meetingBookingsCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = '${schema}'
              AND table_name = 'meeting_bookings'
              AND column_name = 'payment_status'
            ) as exists;
          `);
          
          // Add payment_status to meeting_bookings if it doesn't exist
          if (!(meetingBookingsCheck[0].exists)) {
            log('Adding payment_status column to meeting_bookings table...', colors.yellow);
            await sequelize.query(`
              ALTER TABLE "${schema}"."meeting_bookings"
              ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
            `);
            log('✅ Added payment_status column to meeting_bookings', colors.green);
          } else {
            log('✅ payment_status column already exists in meeting_bookings', colors.green);
          }
        }
      },
      {
        name: '012_add_identity_verification_columns',
        up: async () => {
          log('Adding identity verification columns to customers table...', colors.cyan);
          
          // Check if is_identity_verified column exists in customers
          const [identityVerifiedCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = '${schema}'
              AND table_name = 'customers'
              AND column_name = 'is_identity_verified'
            ) as exists;
          `);
          
          // Add is_identity_verified to customers if it doesn't exist
          if (!(identityVerifiedCheck[0].exists)) {
            log('Adding is_identity_verified column to customers table...', colors.yellow);
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers"
              ADD COLUMN is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE;
            `);
            log('✅ Added is_identity_verified column to customers', colors.green);
          } else {
            log('✅ is_identity_verified column already exists in customers', colors.green);
          }
          
          // Check if is_address_verified column exists in customers
          const [addressVerifiedCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = '${schema}'
              AND table_name = 'customers'
              AND column_name = 'is_address_verified'
            ) as exists;
          `);
          
          // Add is_address_verified to customers if it doesn't exist
          if (!(addressVerifiedCheck[0].exists)) {
            log('Adding is_address_verified column to customers table...', colors.yellow);
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers"
              ADD COLUMN is_address_verified BOOLEAN NOT NULL DEFAULT FALSE;
            `);
            log('✅ Added is_address_verified column to customers', colors.green);
          } else {
            log('✅ is_address_verified column already exists in customers', colors.green);
          }
          
          // Check if verification_status column exists in customers
          const [verificationStatusCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = '${schema}'
              AND table_name = 'customers'
              AND column_name = 'verification_status'
            ) as exists;
          `);
          
          // Add verification_status to customers if it doesn't exist
          if (!(verificationStatusCheck[0].exists)) {
            log('Adding verification_status column to customers table...', colors.yellow);
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers"
              ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
            `);
            log('✅ Added verification_status column to customers', colors.green);
          } else {
            log('✅ verification_status column already exists in customers', colors.green);
          }
          
          log('✅ Customer verification columns added successfully', colors.green);
        }
      },
      {
        name: '013_create_default_admin',
        up: async () => {
          log('Creating default admin user if none exists...', colors.cyan);
          
          // Check if any admin exists
          const [adminCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM "${schema}"."admins"
              LIMIT 1
            ) as exists;
          `);
          
          // Create default admin if none exists
          if (!(adminCheck[0].exists)) {
            log('No admin user found. Creating default super admin...', colors.yellow);
            
            // Generate a secure password hash
            const bcrypt = require('bcryptjs');
            const salt = bcrypt.genSaltSync(10);
            const password = 'Admin@123'; // Default password
            const hashedPassword = bcrypt.hashSync(password, salt);
            
            await sequelize.query(`
              INSERT INTO "${schema}"."admins" (
                username, 
                email, 
                password, 
                name, 
                role, 
                permissions, 
                is_active, 
                created_at, 
                updated_at
              ) VALUES (
                'admin',
                'admin@coworks.com',
                '${hashedPassword}',
                'Super Admin',
                'super_admin',
                '${JSON.stringify({
                  seats: ['read', 'create', 'update', 'delete'],
                  branches: ['read', 'create', 'update', 'delete'],
                  bookings: ['read', 'create', 'update', 'delete'],
                  customers: ['read', 'create', 'update', 'delete']
                }).replace(/'/g, "''")}',
                TRUE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
              );
            `);
            
            log('✅ Default admin user created successfully', colors.green);
            log(`Username: admin`, colors.yellow);
            log(`Email: admin@coworks.com`, colors.yellow);
            log(`Password: ${password}`, colors.yellow);
            log(`Role: super_admin`, colors.yellow);
            log('⚠️ Please change the default password after first login', colors.red);
          } else {
            log('✅ Admin user already exists, skipping creation', colors.green);
          }
        }
      },
      {
        name: '014_fix_customer_table_structure',
        up: async () => {
          log('Fixing customer table structure by directly adding verification fields...', colors.cyan);
          
          // Try to add columns one by one with proper error handling
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS name VARCHAR(100);
            `);
            log('✅ Added/verified name column exists in customers', colors.green);
          } catch (error) {
            log(`Column name already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT '';
            `);
            log('✅ Added/verified company_name column exists in customers', colors.green);
          } catch (error) {
            log(`Column company_name already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE;
            `);
            log('✅ Added/verified is_identity_verified column exists in customers', colors.green);
          } catch (error) {
            log(`Column is_identity_verified already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS is_address_verified BOOLEAN DEFAULT FALSE;
            `);
            log('✅ Added/verified is_address_verified column exists in customers', colors.green);
          } catch (error) {
            log(`Column is_address_verified already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';
            `);
            log('✅ Added/verified verification_status column exists in customers', colors.green);
          } catch (error) {
            log(`Column verification_status already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS proof_of_identity VARCHAR(255);
            `);
            log('✅ Added/verified proof_of_identity column exists in customers', colors.green);
          } catch (error) {
            log(`Column proof_of_identity already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS proof_of_address VARCHAR(255);
            `);
            log('✅ Added/verified proof_of_address column exists in customers', colors.green);
          } catch (error) {
            log(`Column proof_of_address already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verification_notes TEXT;
            `);
            log('✅ Added/verified verification_notes column exists in customers', colors.green);
          } catch (error) {
            log(`Column verification_notes already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;
            `);
            log('✅ Added/verified verification_date column exists in customers', colors.green);
          } catch (error) {
            log(`Column verification_date already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS verified_by INTEGER;
            `);
            log('✅ Added/verified verified_by column exists in customers', colors.green);
          } catch (error) {
            log(`Column verified_by already exists or error: ${error.message}`, colors.yellow);
          }
          
          try {
            await sequelize.query(`
              ALTER TABLE "${schema}"."customers" 
              ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
            `);
            log('✅ Added/verified profile_picture column exists in customers', colors.green);
          } catch (error) {
            log(`Column profile_picture already exists or error: ${error.message}`, colors.yellow);
          }
          
          log('✅ Customer table structure fixed successfully', colors.green);
        }
      },
      {
        name: '015_direct_fix_customer_table',
        up: async () => {
          log('Running direct SQL fix for customers table...', colors.cyan);
          
          try {
            // Check if customers table exists
            const [tableExists] = await sequelize.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = '${schema}'
                AND table_name = 'customers'
              ) as exists;
            `);
            
            if (!tableExists[0].exists) {
              log('Customers table does not exist, will create it...', colors.yellow);
              
              // Create a complete customers table from scratch
              await sequelize.query(`
                CREATE TABLE IF NOT EXISTS "${schema}"."customers" (
                  id SERIAL PRIMARY KEY,
                  name VARCHAR(100) DEFAULT '',
                  email VARCHAR(100) NOT NULL UNIQUE,
                  phone VARCHAR(20),
                  password VARCHAR(255) NOT NULL,
                  profile_picture VARCHAR(255),
                  company_name VARCHAR(100) DEFAULT '',
                  proof_of_identity VARCHAR(255),
                  proof_of_address VARCHAR(255),
                  address TEXT,
                  is_identity_verified BOOLEAN DEFAULT FALSE,
                  is_address_verified BOOLEAN DEFAULT FALSE,
                  verification_status VARCHAR(20) DEFAULT 'PENDING',
                  verification_notes TEXT,
                  verification_date TIMESTAMP,
                  verified_by INTEGER,
                  first_name VARCHAR(50),
                  last_name VARCHAR(50),
                  is_verified BOOLEAN DEFAULT FALSE,
                  verification_token VARCHAR(100),
                  verification_expires TIMESTAMP,
                  role VARCHAR(20) DEFAULT 'customer',
                  coins INTEGER DEFAULT 0,
                  status VARCHAR(20) DEFAULT 'active',
                  last_login TIMESTAMP,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
              `);
              
              log('✅ Created customers table successfully', colors.green);
            } else {
              log('Customers table exists, checking and adding missing columns...', colors.yellow);
              
              // First, get all current columns in the table
              const [columns] = await sequelize.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = '${schema}'
                AND table_name = 'customers'
              `);
              
              const existingColumns = columns.map(col => col.column_name);
              log(`Existing columns: ${existingColumns.join(', ')}`, colors.blue);
              
              // Array of columns to ensure exist
              const requiredColumns = [
                { name: 'is_identity_verified', type: 'BOOLEAN', default: 'FALSE' },
                { name: 'is_address_verified', type: 'BOOLEAN', default: 'FALSE' },
                { name: 'verification_status', type: 'VARCHAR(20)', default: "'PENDING'" },
                { name: 'name', type: 'VARCHAR(100)', default: "''" },
                { name: 'company_name', type: 'VARCHAR(100)', default: "''" },
                { name: 'proof_of_identity', type: 'VARCHAR(255)', default: 'NULL' },
                { name: 'proof_of_address', type: 'VARCHAR(255)', default: 'NULL' },
                { name: 'verification_notes', type: 'TEXT', default: 'NULL' },
                { name: 'verification_date', type: 'TIMESTAMP', default: 'NULL' },
                { name: 'verified_by', type: 'INTEGER', default: 'NULL' },
                { name: 'profile_picture', type: 'VARCHAR(255)', default: 'NULL' }
              ];
              
              // Add each missing column
              for (const column of requiredColumns) {
                if (!existingColumns.includes(column.name)) {
                  try {
                    log(`Adding missing column: ${column.name}`, colors.yellow);
                    await sequelize.query(`
                      ALTER TABLE "${schema}"."customers" 
                      ADD COLUMN "${column.name}" ${column.type} DEFAULT ${column.default};
                    `);
                    log(`✅ Added column: ${column.name}`, colors.green);
                  } catch (error) {
                    log(`Error adding ${column.name} column: ${error.message}`, colors.red);
                  }
                } else {
                  log(`Column ${column.name} already exists`, colors.green);
                }
              }
              
              // Check for first_name and last_name columns and copy to name if needed
              if (existingColumns.includes('first_name') && existingColumns.includes('last_name') && existingColumns.includes('name')) {
                try {
                  log('Checking for customers with empty name field...', colors.yellow);
                  
                  const [emptyNames] = await sequelize.query(`
                    SELECT COUNT(*) as count
                    FROM "${schema}"."customers"
                    WHERE "name" IS NULL OR "name" = ''
                  `);
                  
                  if (emptyNames[0].count > 0) {
                    log(`Found ${emptyNames[0].count} customers with empty name, updating...`, colors.yellow);
                    
                    await sequelize.query(`
                      UPDATE "${schema}"."customers"
                      SET "name" = CONCAT("first_name", ' ', "last_name")
                      WHERE "name" IS NULL OR "name" = ''
                    `);
                    
                    log('✅ Updated customer names successfully', colors.green);
      } else {
                    log('No customers with empty name field found', colors.green);
                  }
                } catch (error) {
                  log(`Error updating names: ${error.message}`, colors.red);
                }
              }
            }
            
            log('✅ Customer table fix completed successfully', colors.green);
          } catch (error) {
            log(`❌ Error fixing customer table: ${error.message}`, colors.red);
            throw error;
          }
        }
      },
      {
        name: '016_check_and_fix_admin_table',
        up: async () => {
          log('Checking and fixing admin table with debug output...', colors.cyan);
          
          try {
            // Check if admin table exists
            const [tableExists] = await sequelize.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = '${schema}'
                AND table_name = 'admins'
              ) as exists;
            `);
            
            if (!tableExists[0].exists) {
              log('Admin table does not exist, will create it...', colors.yellow);
              
              // Create a complete admin table
              await sequelize.query(`
                CREATE TABLE IF NOT EXISTS "${schema}"."admins" (
                  id SERIAL PRIMARY KEY,
                  username VARCHAR(50) NOT NULL UNIQUE,
                  email VARCHAR(100) NOT NULL UNIQUE,
                  password VARCHAR(100) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  phone VARCHAR(20),
                  profile_image VARCHAR(255),
                  role VARCHAR(20) NOT NULL DEFAULT 'branch_admin',
                  branch_id INTEGER,
                  permissions JSONB,
                  is_active BOOLEAN NOT NULL DEFAULT TRUE,
                  last_login TIMESTAMP,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
              `);
              
              log('✅ Created admin table successfully', colors.green);
            }
            
            // Check if there are any admin users
            const [adminCount] = await sequelize.query(`
              SELECT COUNT(*) as count FROM "${schema}"."admins"
            `);
            
            log(`Found ${adminCount[0].count} admin users`, colors.blue);
            
            // If no admins exist, create a default admin
            if (parseInt(adminCount[0].count) === 0) {
              log('No admin users found. Creating default admin...', colors.yellow);
              
              // Generate a secure password hash - using plain for debugging
              const bcrypt = require('bcryptjs');
              const salt = bcrypt.genSaltSync(10);
              const plainPassword = 'Admin@123'; // Default password
              const hashedPassword = bcrypt.hashSync(plainPassword, salt);
              
              // Insert a default admin user with debug output
              log(`Default admin password hash: ${hashedPassword.substring(0, 10)}...`, colors.yellow);
              
              await sequelize.query(`
                INSERT INTO "${schema}"."admins" (
                  username, 
                  email, 
                  password, 
                  name, 
                  role, 
                  permissions, 
                  is_active, 
                  created_at, 
                  updated_at
                ) VALUES (
                  'admin',
                  'admin@coworks.com',
                  '${hashedPassword}',
                  'Super Admin',
                  'super_admin',
                  '${JSON.stringify({
                    seats: ['read', 'create', 'update', 'delete'],
                    branches: ['read', 'create', 'update', 'delete'],
                    bookings: ['read', 'create', 'update', 'delete'],
                    customers: ['read', 'create', 'update', 'delete']
                  }).replace(/'/g, "''")}',
                  TRUE,
                  CURRENT_TIMESTAMP,
                  CURRENT_TIMESTAMP
                );
              `);
              
              log('✅ Default admin created successfully', colors.green);
              log(`Username: admin`, colors.yellow);
              log(`Email: admin@coworks.com`, colors.yellow);
              log(`Password: ${plainPassword}`, colors.yellow);
              log('⚠️ Please change the default password after first login', colors.red);
            }
            
            // Display all admin users for debugging
            const [admins] = await sequelize.query(`
              SELECT id, username, email, role, is_active FROM "${schema}"."admins"
            `);
            
            log('Current admin users:', colors.blue);
            admins.forEach(admin => {
              log(`ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Role: ${admin.role}, Active: ${admin.is_active}`, colors.blue);
            });
            
            log('✅ Admin table check completed successfully', colors.green);
        } catch (error) {
            log(`❌ Error checking admin table: ${error.message}`, colors.red);
            throw error;
          }
        }
      },
      {
        name: '017_final_fix_for_both_issues',
        up: async () => {
          log('Running final SQL fixes for both issues...', colors.cyan);
          
          try {
            // 1. FIX CUSTOMER TABLE - Add missing columns if they don't exist
            log('Checking if customers table exists...', colors.yellow);
            
            const [customersTableExists] = await sequelize.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = '${schema}'
                AND table_name = 'customers'
              );
            `);
            
            if (customersTableExists[0].exists) {
              log('Customers table exists, adding missing columns...', colors.yellow);
              
              // Directly add is_identity_verified column with proper error handling
              try {
                await sequelize.query(`
                  ALTER TABLE "${schema}"."customers" 
                  ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE;
                `);
                log('✅ Added is_identity_verified column to customers', colors.green);
              } catch (error) {
                log(`Column is_identity_verified issue: ${error.message}`, colors.yellow);
              }
              
              // Add is_address_verified if missing
              try {
                await sequelize.query(`
                  ALTER TABLE "${schema}"."customers" 
                  ADD COLUMN IF NOT EXISTS is_address_verified BOOLEAN NOT NULL DEFAULT FALSE;
                `);
                log('✅ Added is_address_verified column to customers', colors.green);
              } catch (error) {
                log(`Column is_address_verified issue: ${error.message}`, colors.yellow);
              }
              
              // Add verification_status if missing
              try {
                await sequelize.query(`
                  ALTER TABLE "${schema}"."customers" 
                  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
                `);
                log('✅ Added verification_status column to customers', colors.green);
              } catch (error) {
                log(`Column verification_status issue: ${error.message}`, colors.yellow);
              }
              
              log('✅ Customer table fix completed', colors.green);
            } else {
              log('Customers table does not exist, skipping customer table fixes', colors.yellow);
            }
            
            // 2. FIX ADMIN USER - Ensure admin user exists with correct password
            log('Checking if admins table exists...', colors.yellow);
            
            const [adminsTableExists] = await sequelize.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = '${schema}'
                AND table_name = 'admins'
              );
            `);
            
            if (adminsTableExists[0].exists) {
              log('Admins table exists, checking for existing admin users...', colors.yellow);
              
              const [adminCount] = await sequelize.query(`
                SELECT COUNT(*) as count FROM "${schema}"."admins"
              `);
              
              log(`Found ${adminCount[0].count} admin users`, colors.blue);
              
              if (parseInt(adminCount[0].count) === 0) {
                log('No admin users found. Creating default admin...', colors.yellow);
                
                // Generate a secure password hash
                const bcrypt = require('bcryptjs');
                const salt = bcrypt.genSaltSync(10);
                const plainPassword = 'Admin@123'; // Default password
                const hashedPassword = bcrypt.hashSync(plainPassword, salt);
                
                await sequelize.query(`
                  INSERT INTO "${schema}"."admins" (
                    username, 
                    email, 
                    password, 
                    name, 
                    role, 
                    permissions, 
                    is_active, 
                    created_at, 
                    updated_at
                  ) VALUES (
                    'admin',
                    'admin@coworks.com',
                    '${hashedPassword}',
                    'Super Admin',
                    'super_admin',
                    '${JSON.stringify({
                      seats: ['read', 'create', 'update', 'delete'],
                      branches: ['read', 'create', 'update', 'delete'],
                      bookings: ['read', 'create', 'update', 'delete'],
                      customers: ['read', 'create', 'update', 'delete']
                    }).replace(/'/g, "''")}',
                    TRUE,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                  );
                `);
                
                log('✅ Default admin created successfully', colors.green);
                log(`Username: admin`, colors.yellow);
                log(`Email: admin@coworks.com`, colors.yellow);
                log(`Password: ${plainPassword}`, colors.yellow);
              } else {
                // Display existing admin users for debugging
                const [admins] = await sequelize.query(`
                  SELECT id, username, email, role, is_active FROM "${schema}"."admins" LIMIT 5
                `);
                
                log('Current admin users:', colors.blue);
                admins.forEach(admin => {
                  log(`ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Role: ${admin.role}, Active: ${admin.is_active}`, colors.blue);
                });
                
                // Create a fallback admin with a known password if one doesn't exist
                try {
                  const [adminCheck] = await sequelize.query(`
                    SELECT COUNT(*) as count FROM "${schema}"."admins"
                    WHERE username = 'admin' OR email = 'admin@coworks.com'
                  `);
                  
                  if (parseInt(adminCheck[0].count) === 0) {
                    log('No default admin found, creating one...', colors.yellow);
                    
                    // Generate a secure password hash
                    const bcrypt = require('bcryptjs');
                    const salt = bcrypt.genSaltSync(10);
                    const plainPassword = 'Admin@123'; // Default password
                    const hashedPassword = bcrypt.hashSync(plainPassword, salt);
                    
                    await sequelize.query(`
                      INSERT INTO "${schema}"."admins" (
                        username, 
                        email, 
                        password, 
                        name, 
                        role, 
                        permissions, 
                        is_active, 
                        created_at, 
                        updated_at
                      ) VALUES (
                        'admin',
                        'admin@coworks.com',
                        '${hashedPassword}',
                        'Super Admin',
                        'super_admin',
                        '${JSON.stringify({
                          seats: ['read', 'create', 'update', 'delete'],
                          branches: ['read', 'create', 'update', 'delete'],
                          bookings: ['read', 'create', 'update', 'delete'],
                          customers: ['read', 'create', 'update', 'delete']
                        }).replace(/'/g, "''")}',
                        TRUE,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                      );
                    `);
                    
                    log('✅ Default admin created successfully', colors.green);
                    log(`Username: admin`, colors.yellow);
                    log(`Email: admin@coworks.com`, colors.yellow);
                    log(`Password: ${plainPassword}`, colors.yellow);
                  } else {
                    // Update admin password for debugging
                    log('Default admin exists, resetting password for debugging...', colors.yellow);
                    
                    // Generate a secure password hash
                    const bcrypt = require('bcryptjs');
                    const salt = bcrypt.genSaltSync(10);
                    const plainPassword = 'Admin@123'; // Default password
                    const hashedPassword = bcrypt.hashSync(plainPassword, salt);
                    
                    await sequelize.query(`
                      UPDATE "${schema}"."admins"
                      SET password = '${hashedPassword}',
                          is_active = TRUE
                      WHERE username = 'admin' OR email = 'admin@coworks.com';
                    `);
                    
                    log('✅ Admin password reset successfully', colors.green);
                    log(`Username: admin`, colors.yellow);
                    log(`Email: admin@coworks.com`, colors.yellow);
                    log(`Password: ${plainPassword}`, colors.yellow);
                  }
                } catch (adminError) {
                  log(`Error managing admin user: ${adminError.message}`, colors.red);
                }
              }
              
              log('✅ Admin user fix completed', colors.green);
            } else {
              log('Admins table does not exist, skipping admin fixes', colors.yellow);
            }
            
            log('✅ All fixes completed successfully', colors.green);
          } catch (error) {
            log(`❌ Error applying fixes: ${error.message}`, colors.red);
            throw error;
          }
        }
      },
      {
        name: '020_add_seat_code_column',
        up: async () => {
          log('Running migration to add seat_code column...', colors.cyan);
          
          const fixResult = await require('../migrations/020_add_seat_code_column')(sequelize, DataTypes);
          
          if (fixResult) {
            log('✅ seat_code column added successfully', colors.green);
          } else {
            log('⚠️ seat_code column migration skipped or not needed', colors.yellow);
          }
          
          return true;
        }
      },
      {
        name: '021_add_short_code_to_seating_types',
        up: async () => {
          log('Running migration to add short_code column to seating_types...', colors.cyan);
          
          const fixResult = await require('../migrations/021_add_short_code_to_seating_types')(sequelize, DataTypes);
          
          if (fixResult) {
            log('✅ short_code column added to seating_types successfully', colors.green);
          } else {
            log('⚠️ short_code column migration skipped or not needed', colors.yellow);
          }
          
          return true;
        }
      },
      {
        name: '022_add_missing_seat_and_seatingtype_columns',
        up: async () => {
          log('Running migration to add missing columns to seats and seating_types tables...', colors.cyan);
          
          const fixResult = await require('../migrations/022_add_missing_seat_and_seatingtype_columns')(sequelize, DataTypes);
          
          if (fixResult) {
            log('✅ Missing columns added to seats and seating_types tables successfully', colors.green);
          } else {
            log('⚠️ No missing columns found, migration skipped', colors.yellow);
          }
          
          return true;
        }
      },
      {
        name: '023_fix_seats_association',
        up: async () => {
          log('Running migration to fix Branch-Seats association...', colors.cyan);
          
          const fixResult = await require('../migrations/023_fix_seats_association')(sequelize, DataTypes);
          
          if (fixResult) {
            log('✅ Branch-Seats association fixed successfully', colors.green);
          } else {
            log('⚠️ Could not fix Branch-Seats association, tables might be missing', colors.yellow);
          }
          
          return true;
        }
      },
      {
        name: '024_add_total_price_to_seat_bookings',
        up: async () => {
          log('Running migration to add total_price column to seat_bookings...', colors.cyan);
          
          const fixResult = await require('../migrations/024_add_total_price_to_seat_bookings')(sequelize, DataTypes);
          
          if (fixResult) {
            log('✅ total_price column added to seat_bookings successfully', colors.green);
          } else {
            log('⚠️ total_price column migration skipped or not needed', colors.yellow);
          }
          
          return true;
        }
      },
      {
        name: '025_add_num_participants_to_meeting_bookings',
        up: async () => {
          log('Running migration to add num_participants column to meeting_bookings...', colors.cyan);
          
          const migration = require('../migrations/025_add_num_participants_to_meeting_bookings');
          await migration.up(sequelize, Sequelize);
          
          log('✅ num_participants column added to meeting_bookings successfully', colors.green);
          return true;
        }
      },
      {
        name: '026_add_amenities_to_meeting_bookings',
        up: async () => {
          log('Running migration to add amenities column to meeting_bookings...', colors.cyan);
          
          const migration = require('../migrations/026_add_amenities_to_meeting_bookings');
          await migration.up(sequelize, Sequelize);
          
          log('✅ amenities column added to meeting_bookings successfully', colors.green);
          return true;
        }
      }
    ];
    
    // Apply migrations that haven't been applied yet
    for (const migration of migrations) {
      const applied = await checkMigration(sequelize, schema, migration.name);
      if (applied) {
        log(`Migration '${migration.name}' already applied, skipping`, colors.cyan);
        continue;
      }
      
      log(`Applying migration: ${migration.name}`, colors.yellow);
      await migration.up();
      await recordMigration(sequelize, schema, migration.name);
      log(`✅ Migration '${migration.name}' completed successfully`, colors.green);
    }
    
    log(`\n${colors.bright}${colors.green}===== All Migrations Completed Successfully =====`, colors.green);
    
    await sequelize.close();
  } catch (error) {
    log(`\n❌ Migration process failed: ${error.message}`, colors.red);
    
    try {
    await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

// Run the migrations
runMigrations();

// Export for use in scripts
module.exports = {
  getSequelizeInstance,
  ensureMigrationsTable,
  fixDatabaseIssues
};