// scripts/migrate.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
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
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
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
        CREATE TABLE "${dbSchema}"."branches" (
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
        CREATE TABLE "${dbSchema}"."customers" (
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

    // Create seating_type_enum in the correct schema
    const seatingTypeEnumExists = await typeExists('enum_seating_types_name');
    if (!seatingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_seating_types_name" AS ENUM (
          'HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS'
        );
      `, { transaction });
      console.log('Created enum_seating_types_name type');
    } else {
      console.log('enum_seating_types_name already exists');
    }
    
    // Create seating_types table if it doesn't exist
    const seatingTypesExists = await tableExists('seating_types');
    if (!seatingTypesExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."seating_types" (
          id SERIAL PRIMARY KEY,
          name "${dbSchema}"."enum_seating_types_name" NOT NULL,
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

    // Create availability_status_enum in the correct schema
    const availabilityStatusEnumExists = await typeExists('enum_seats_availability_status');
    if (!availabilityStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_seats_availability_status" AS ENUM (
          'AVAILABLE', 'BOOKED', 'MAINTENANCE'
        );
      `, { transaction });
      console.log('Created enum_seats_availability_status type');
    } else {
      console.log('enum_seats_availability_status already exists');
    }
    
    // Create seats table if it doesn't exist
    const seatsExists = await tableExists('seats');
    if (!seatsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."seats" (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES "${dbSchema}"."branches"(id),
          seating_type_id INTEGER NOT NULL REFERENCES "${dbSchema}"."seating_types"(id),
          seat_number VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          availability_status "${dbSchema}"."enum_seats_availability_status" DEFAULT 'AVAILABLE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      console.log('Created seats table');
    } else {
      console.log('seats table already exists');
    }

    // Create booking_status_enum in the correct schema
    const bookingStatusEnumExists = await typeExists('enum_seat_bookings_status');
    if (!bookingStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_seat_bookings_status" AS ENUM (
          'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
        );
      `, { transaction });
      console.log('Created enum_seat_bookings_status type');
    } else {
      console.log('enum_seat_bookings_status already exists');
    }
    
    // Create seat_bookings table if it doesn't exist
    const seatBookingsExists = await tableExists('seat_bookings');
    if (!seatBookingsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."seat_bookings" (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES "${dbSchema}"."customers"(id),
          seat_id INTEGER NOT NULL REFERENCES "${dbSchema}"."seats"(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          status "${dbSchema}"."enum_seat_bookings_status" DEFAULT 'PENDING',
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
        CREATE TABLE "${dbSchema}"."meeting_bookings" (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES "${dbSchema}"."customers"(id),
          meeting_room_id INTEGER NOT NULL REFERENCES "${dbSchema}"."seats"(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          num_participants INTEGER NOT NULL,
          amenities JSONB,
          total_price DECIMAL(10, 2) NOT NULL,
          status "${dbSchema}"."enum_seat_bookings_status" DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      console.log('Created meeting_bookings table');
    } else {
      console.log('meeting_bookings table already exists');
    }

    // Create payment_method_enum in the correct schema
    const paymentMethodEnumExists = await typeExists('enum_payments_payment_method');
    if (!paymentMethodEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_payments_payment_method" AS ENUM (
          'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET'
        );
      `, { transaction });
      console.log('Created enum_payments_payment_method type');
    } else {
      console.log('enum_payments_payment_method already exists');
    }
    
    // Create payment_status_enum in the correct schema
    const paymentStatusEnumExists = await typeExists('enum_payments_payment_status');
    if (!paymentStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_payments_payment_status" AS ENUM (
          'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
        );
      `, { transaction });
      console.log('Created enum_payments_payment_status type');
    } else {
      console.log('enum_payments_payment_status already exists');
    }
    
    // Create booking_type_enum in the correct schema
    const bookingTypeEnumExists = await typeExists('enum_payments_booking_type');
    if (!bookingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}"."enum_payments_booking_type" AS ENUM (
          'seat', 'meeting'
        );
      `, { transaction });
      console.log('Created enum_payments_booking_type type');
    } else {
      console.log('enum_payments_booking_type already exists');
    }
    
    // Create payments table if it doesn't exist
    const paymentsExists = await tableExists('payments');
    if (!paymentsExists) {
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."payments" (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL,
          booking_type "${dbSchema}"."enum_payments_booking_type" NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          payment_method "${dbSchema}"."enum_payments_payment_method" NOT NULL,
          payment_status "${dbSchema}"."enum_payments_payment_status" DEFAULT 'PENDING',
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
        CREATE TABLE "${dbSchema}"."time_slots" (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES "${dbSchema}"."branches"(id),
          seat_id INTEGER NOT NULL REFERENCES "${dbSchema}"."seats"(id),
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_available BOOLEAN NOT NULL DEFAULT TRUE,
          booking_id INTEGER REFERENCES "${dbSchema}"."seat_bookings"(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });
      console.log('Created time_slots table');
    } else {
      console.log('time_slots table already exists');
    }

    // Record the migration
    await recordMigration('initial_schema');

    await transaction.commit();
    console.log('Migrations completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in migration:', error);
    throw error;
  }
}

// Runner Function
async function runMigrations() {
  try {
    // Test connection first
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    console.log('Running migrations in smart mode...');
    await up();
    console.log('Smart migration process completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();