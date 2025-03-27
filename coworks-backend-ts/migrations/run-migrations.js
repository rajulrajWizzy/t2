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

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Helper function to log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Create sequelize instance
function getSequelizeInstance() {
  const dbSchema = process.env.DB_SCHEMA || 'public';
  
  // SSL configuration
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };
  
  // Common options
  const commonOptions = {
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    dialectOptions: {
      ssl: sslConfig
    }
  };
  
  let sequelize;
  
  // Check if DATABASE_URL exists (production)
  if (process.env.DATABASE_URL) {
    log('Using DATABASE_URL for connection', colors.cyan);
    sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
  } else {
    // Fallback to individual credentials (local development)
    log('Using individual credentials for connection', colors.cyan);
    sequelize = new Sequelize(
      process.env.DB_NAME || 'coworks_db',
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
async function isMigrationApplied(sequelize, schema, migrationName) {
  try {
    const [result] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM "${schema}"."migrations"
        WHERE name = '${migrationName}'
      );`
    );
    return result[0].exists;
  } catch (err) {
    log(`❌ Error checking migration status: ${err.message}`, colors.red);
    return false;
  }
}

// Record migration as applied
async function recordMigration(sequelize, schema, migrationName) {
  try {
    await sequelize.query(
      `INSERT INTO "${schema}"."migrations" (name)
       VALUES ('${migrationName}');`
    );
    log(`✅ Recorded migration: ${migrationName}`, colors.green);
  } catch (err) {
    log(`❌ Error recording migration: ${err.message}`, colors.red);
    throw err;
  }
}

// Create uploads directory if it doesn't exist
function createUploadsDir() {
  log('Creating uploads directory...', colors.cyan);
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      log('✅ Created uploads directory', colors.green);
    } else {
      log('✅ Uploads directory already exists', colors.green);
    }
  } catch (error) {
    log(`❌ Failed to create uploads directory: ${error.message}`, colors.red);
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
    
    // Define all migrations in sequence
    const migrations = [
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
              first_name VARCHAR(50) NOT NULL,
              last_name VARCHAR(50) NOT NULL,
              email VARCHAR(100) NOT NULL UNIQUE,
              password VARCHAR(100) NOT NULL,
              phone VARCHAR(20),
              profile_image VARCHAR(255),
              address TEXT,
              is_verified BOOLEAN NOT NULL DEFAULT FALSE,
              verification_token VARCHAR(100),
              verification_expires TIMESTAMP,
              role VARCHAR(20) NOT NULL DEFAULT 'customer',
              coins INTEGER NOT NULL DEFAULT 0,
              status VARCHAR(20) NOT NULL DEFAULT 'active',
              last_login TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
              start_time TIMESTAMP NOT NULL,
              end_time TIMESTAMP NOT NULL,
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
      }
    ];
    
    // Run all migrations
    for (const migration of migrations) {
      // Check if migration has been applied
      const isApplied = await isMigrationApplied(sequelize, schema, migration.name);
      
      if (isApplied) {
        log(`⏭️ Migration ${migration.name} already applied, skipping...`, colors.blue);
      } else {
        log(`🔄 Running migration: ${migration.name}...`, colors.yellow);
        
        try {
          await migration.up();
          await recordMigration(sequelize, schema, migration.name);
          log(`✅ Migration ${migration.name} completed successfully`, colors.green);
        } catch (error) {
          log(`❌ Migration ${migration.name} failed: ${error.message}`, colors.red);
          throw error; // Abort migration process
        }
      }
    }
    
    // Summary
    log(`\n${colors.bright}${colors.green}===== Migration Summary =====`, colors.green);
    log('✅ All migrations completed successfully!', colors.green);
    log('Database schema is now up to date.', colors.cyan);
    
  } catch (error) {
    log(`\n❌ Migration process failed: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the migrations
runMigrations().catch(error => {
  log(`\n❌ An unexpected error occurred: ${error.message}`, colors.red);
  process.exit(1);
}); 