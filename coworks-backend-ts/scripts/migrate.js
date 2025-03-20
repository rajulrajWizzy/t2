// scripts/smart-migrate.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Better error handling for connection
function createConnection() {
  try {
    // Check if DATABASE_URL exists (Vercel/Production)
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
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
      console.log('Using individual credentials for connection');
      return new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
          host: process.env.DB_HOST || 'localhost',
          dialect: 'postgres',
          logging: false, // Reduce noise in logs
          dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
              require: true,
              rejectUnauthorized: false
            } : undefined
          }
        }
      );
    }
  } catch (error) {
    console.error('Error creating database connection:', error);
    process.exit(1);
  }
}

// Initialize connection
sequelize = createConnection();

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
    console.error(`Error checking if table ${tableName} exists:`, error);
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
    console.error(`Error checking if type ${typeName} exists:`, error);
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
    console.error('Error checking migration status:', error);
    return false;
  }
}

// Function to record a migration
async function recordMigration(name) {
  try {
    await sequelize.query(
      `INSERT INTO "${dbSchema}"."migrations" (name) VALUES ('${name}');`
    );
    console.log(`Recorded migration: ${name}`);
  } catch (error) {
    console.error(`Error recording migration ${name}:`, error);
  }
}

// Migration Up Function - Only creates tables that don't exist
async function up() {
  const transaction = await sequelize.transaction();

  try {
    // Set search path
    await sequelize.query(`SET search_path TO "${dbSchema}";`, { transaction });
    
    // Check if migrations have already been applied
    const migrationsApplied = await checkMigrationStatus();
    
    if (migrationsApplied) {
      console.log('Migrations have already been applied. Skipping...');
      await transaction.commit();
      return;
    }
    
    console.log('Starting migrations...');

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
      console.log('Created branches table');
    } else {
      console.log('Branches table already exists');
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
      console.log('Created customers table');
    } else {
      console.log('Customers table already exists');
    }

    // Check if seating_type_enum exists before creating
    const seatingTypeEnumExists = await typeExists('seating_type_enum');
    if (!seatingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".seating_type_enum AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS');
      `, { transaction });
      console.log('Created seating_type_enum');
    } else {
      console.log('seating_type_enum already exists');
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
      console.log('Created seating_types table');
    } else {
      console.log('seating_types table already exists');
    }

    // Check if availability_status_enum exists before creating
    const availabilityStatusEnumExists = await typeExists('availability_status_enum');
    if (!availabilityStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".availability_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      `, { transaction });
      console.log('Created availability_status_enum');
    } else {
      console.log('availability_status_enum already exists');
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
      console.log('Created seats table');
    } else {
      console.log('seats table already exists');
    }

    // Check if booking_status_enum exists before creating
    const bookingStatusEnumExists = await typeExists('booking_status_enum');
    if (!bookingStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
      `, { transaction });
      console.log('Created booking_status_enum');
    } else {
      console.log('booking_status_enum already exists');
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
      console.log('Created seat_bookings table');
    } else {
      console.log('seat_bookings table already exists');
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
      console.log('Created meeting_bookings table');
    } else {
      console.log('meeting_bookings table already exists');
    }

    // Check if payment enums exist before creating
    const paymentMethodEnumExists = await typeExists('payment_method_enum');
    if (!paymentMethodEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_method_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET');
      `, { transaction });
      console.log('Created payment_method_enum');
    } else {
      console.log('payment_method_enum already exists');
    }
    
    const paymentStatusEnumExists = await typeExists('payment_status_enum');
    if (!paymentStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      `, { transaction });
      console.log('Created payment_status_enum');
    } else {
      console.log('payment_status_enum already exists');
    }
    
    const bookingTypeEnumExists = await typeExists('booking_type_enum');
    if (!bookingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_type_enum AS ENUM ('seat', 'meeting');
      `, { transaction });
      console.log('Created booking_type_enum');
    } else {
      console.log('booking_type_enum already exists');
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
      console.log('Created payments table');
    } else {
      console.log('payments table already exists');
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
      console.log('Created time_slots table');
    } else {
      console.log('time_slots table already exists');
    }

    // Record the base migration
    await recordMigration('base_migration');
    
    console.log('All migrations completed successfully');
    await transaction.commit();
    
  } catch (error) {
    await transaction.rollback();
    console.error('Migration error:', error);
    
    // More detailed error reporting
    if (error.parent) {
      console.error('Database error details:', {
        code: error.parent.code,
        message: error.parent.message,
        detail: error.parent.detail
      });
    }
    
    throw error;
  }
}

// Main function to run migrations with better error handling
async function runMigrations() {
  try {
    // Test database connection before proceeding
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Check if we're running down migrations
    const isDown = process.argv[2] === 'down';
    
    if (isDown) {
      console.log('Running down migrations...');
      await down();
    } else {
      console.log('Running up migrations...');
      await up();
    }
    
    console.log('Migration process completed successfully.');
    await sequelize.close();
    
  } catch (error) {
    console.error('Migration process failed:', error);
    
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    
    process.exit(1);
  }
}

// Run the migrations
runMigrations();