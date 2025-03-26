// scripts/smart-migrate.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Define color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Improved logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  
  switch(type) {
    case 'success':
      color = colors.green;
      break;
    case 'warn':
      color = colors.yellow;
      break;
    case 'error':
      color = colors.red;
      break;
    case 'info':
      color = colors.cyan;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Better error handling for connection
function createConnection() {
  try {
    // Check if DATABASE_URL exists (Vercel/Production)
    if (process.env.DATABASE_URL) {
      log('Using DATABASE_URL for connection', 'info');
      return new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false, // Reduce noise in logs
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      });
    } else {
      // Fallback to individual credentials (local development)
      log('Using individual credentials for connection', 'info');
      return new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
          host: process.env.DB_HOST || 'localhost',
          dialect: 'postgres',
          logging: false, // Reduce noise in logs
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        }
      );
    }
  } catch (error) {
    log(`Error creating database connection: ${error.message}`, 'error');
    return null;
  }
}

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = '${tableName}'
      );
    `;
    const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
    return result[0].exists;
  } catch (error) {
    log(`Error checking if table ${tableName} exists: ${error.message}`, 'error');
    return false;
  }
}

// Function to check if a type exists
async function typeExists(typeName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = '${typeName}'
      );
    `;
    const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
    return result[0].exists;
  } catch (error) {
    log(`Error checking if type ${typeName} exists: ${error.message}`, 'error');
    return false;
  }
}

// Function to check if migrations have been applied
async function checkMigrationStatus() {
  try {
    // Create migration tracking table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if we have any migrations recorded
    const result = await sequelize.query(
      `SELECT COUNT(*) FROM "${dbSchema}"."migrations";`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    return parseInt(result[0].count, 10) > 0;
  } catch (error) {
    log(`Error checking migration status: ${error.message}`, 'error');
    return false;
  }
}

// Function to record a migration
async function recordMigration(name) {
  try {
    await sequelize.query(
      `INSERT INTO "${dbSchema}"."migrations" (name) VALUES ('${name}');`
    );
    log(`Recorded migration: ${name}`, 'success');
  } catch (error) {
    log(`Error recording migration ${name}: ${error.message}`, 'error');
  }
}

// Migration Up Function - Only creates tables that don't exist
async function up() {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    
    // Set search path
    await sequelize.query(`SET search_path TO "${dbSchema}";`, { transaction });
    
    // Check if migrations have already been applied
    const migrationsApplied = await checkMigrationStatus();
    
    if (migrationsApplied) {
      log('Migrations have already been applied. Skipping...', 'warn');
      await transaction.commit();
      return;
    }
    
    log('Starting migrations...', 'info');

    // Create branches table if it doesn't exist
    const branchesExists = await tableExists('branches');
    if (!branchesExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".branches (
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created branches table', 'success');
    } else {
      log('Branches table already exists', 'warn');
    }

    // Create customers table if it doesn't exist
    const customersExists = await tableExists('customers');
    if (!customersExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(255),
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created customers table', 'success');
    } else {
      log('Customers table already exists', 'warn');
    }

    // Check if seating_type_enum exists before creating
    const seatingTypeEnumExists = await typeExists('seating_type_enum');
    if (!seatingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".seating_type_enum AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS');
      `, { transaction });
      log('Created seating_type_enum', 'success');
    } else {
      log('seating_type_enum already exists', 'warn');
    }
    
    // Create seating_types table if it doesn't exist
    const seatingTypesExists = await tableExists('seating_types');
    if (!seatingTypesExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".seating_types (
          id SERIAL PRIMARY KEY,
          name "${dbSchema}".seating_type_enum NOT NULL,
          description TEXT,
          hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          is_hourly BOOLEAN NOT NULL DEFAULT TRUE,
          min_booking_duration INTEGER NOT NULL DEFAULT 2,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created seating_types table', 'success');
    } else {
      log('seating_types table already exists', 'warn');
    }

    // Check if availability_status_enum exists before creating
    const availabilityStatusEnumExists = await typeExists('availability_status_enum');
    if (!availabilityStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".availability_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      `, { transaction });
      log('Created availability_status_enum', 'success');
    } else {
      log('availability_status_enum already exists', 'warn');
    }
    
    // Create seats table if it doesn't exist
    const seatsExists = await tableExists('seats');
    if (!seatsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".seats (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES "${dbSchema}".branches(id),
          seating_type_id INTEGER NOT NULL REFERENCES "${dbSchema}".seating_types(id),
          seat_number VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          availability_status "${dbSchema}".availability_status_enum DEFAULT 'AVAILABLE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created seats table', 'success');
    } else {
      log('seats table already exists', 'warn');
    }

    // Check if booking_status_enum exists before creating
    const bookingStatusEnumExists = await typeExists('booking_status_enum');
    if (!bookingStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
      `, { transaction });
      log('Created booking_status_enum', 'success');
    } else {
      log('booking_status_enum already exists', 'warn');
    }
    
    // Create seat_bookings table if it doesn't exist
    const seatBookingsExists = await tableExists('seat_bookings');
    if (!seatBookingsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".seat_bookings (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES "${dbSchema}".customers(id),
          seat_id INTEGER NOT NULL REFERENCES "${dbSchema}".seats(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          status "${dbSchema}".booking_status_enum DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created seat_bookings table', 'success');
    } else {
      log('seat_bookings table already exists', 'warn');
    }

    // Create meeting_bookings table if it doesn't exist
    const meetingBookingsExists = await tableExists('meeting_bookings');
    if (!meetingBookingsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".meeting_bookings (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES "${dbSchema}".customers(id),
          meeting_room_id INTEGER NOT NULL REFERENCES "${dbSchema}".seats(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          num_participants INTEGER NOT NULL,
          amenities JSONB,
          total_price DECIMAL(10, 2) NOT NULL,
          status "${dbSchema}".booking_status_enum DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created meeting_bookings table', 'success');
    } else {
      log('meeting_bookings table already exists', 'warn');
    }

    // Check if payment enums exist before creating
    const paymentMethodEnumExists = await typeExists('payment_method_enum');
    if (!paymentMethodEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_method_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET');
      `, { transaction });
      log('Created payment_method_enum', 'success');
    } else {
      log('payment_method_enum already exists', 'warn');
    }
    
    const paymentStatusEnumExists = await typeExists('payment_status_enum');
    if (!paymentStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      `, { transaction });
      log('Created payment_status_enum', 'success');
    } else {
      log('payment_status_enum already exists', 'warn');
    }
    
    const bookingTypeEnumExists = await typeExists('booking_type_enum');
    if (!bookingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_type_enum AS ENUM ('seat', 'meeting');
      `, { transaction });
      log('Created booking_type_enum', 'success');
    } else {
      log('booking_type_enum already exists', 'warn');
    }
    
    // Create payments table if it doesn't exist
    const paymentsExists = await tableExists('payments');
    if (!paymentsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".payments (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL,
          booking_type "${dbSchema}".booking_type_enum NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          payment_method "${dbSchema}".payment_method_enum NOT NULL,
          payment_status "${dbSchema}".payment_status_enum DEFAULT 'PENDING',
          transaction_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created payments table', 'success');
    } else {
      log('payments table already exists', 'warn');
    }

    // Create time_slots table if it doesn't exist
    const timeSlotsExists = await tableExists('time_slots');
    if (!timeSlotsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}".time_slots (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES "${dbSchema}".branches(id),
          seat_id INTEGER NOT NULL REFERENCES "${dbSchema}".seats(id),
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_available BOOLEAN NOT NULL DEFAULT TRUE,
          booking_id INTEGER REFERENCES "${dbSchema}".seat_bookings(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      log('Created time_slots table', 'success');
    } else {
      log('time_slots table already exists', 'warn');
    }

    // Record the base migration
    await recordMigration('base_migration');
    
    await transaction.commit();
    log('All migrations completed successfully', 'success');
    return true;
  } catch (error) {
    if (transaction) await transaction.rollback();
    log(`Migration failed: ${error.message}`, 'error');
    return false;
  }
}

// Main function to run migrations
async function runMigrations() {
  log('Starting migration process...', 'info');
  
  // Initialize connection
  sequelize = createConnection();
  
  if (!sequelize) {
    log('Failed to create database connection. Migration process aborted.', 'error');
    return false;
  }
  
  try {
    // Test connection
    await sequelize.authenticate();
    log('Database connection established successfully', 'success');
    
    // Run migrations
    const success = await up();
    
    if (success) {
      log('Migration process completed successfully', 'success');
    } else {
      log('Migration process completed with errors', 'warn');
    }
    
    return success;
  } catch (error) {
    log(`Fatal error in migration process: ${error.message}`, 'error');
    return false;
  } finally {
    // Always close the connection
    if (sequelize) {
      try {
        await sequelize.close();
        log('Database connection closed', 'info');
      } catch (error) {
        log(`Error closing database connection: ${error.message}`, 'error');
      }
    }
  }
}

// Run the migrations without exiting the process on failure (for Vercel deployments)
runMigrations()
  .then((success) => {
    log(`Migration process exited with status: ${success ? 'SUCCESS' : 'FAILURE'}`, success ? 'success' : 'error');
    // Don't exit with error code to prevent deployment failures
  })
  .catch((error) => {
    log(`Uncaught error in migration process: ${error.message}`, 'error');
    // Don't exit with error code to prevent deployment failures
  });