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

// Function to check if a type exists
async function typeExists(transaction, typeName) {
  const result = await sequelize.query(`
    SELECT 1 FROM pg_type 
    WHERE typname = '${typeName}'
  `, { transaction });
  
  return result[0].length > 0;
}

// Rest of your migration code remains the same...
// Migration Up Function
async function up() {
  const transaction = await sequelize.transaction();

  try {
    // Create branches table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".branches (
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

    // Create customers table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Check if seating_type_enum exists before creating
    const seatingTypeEnumExists = await typeExists(transaction, 'seating_type_enum');
    if (!seatingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".seating_type_enum AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS');
      `, { transaction });
    }
    
    // Create seating_types table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".seating_types (
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

    // Check if availability_status_enum exists before creating
    const availabilityStatusEnumExists = await typeExists(transaction, 'availability_status_enum');
    if (!availabilityStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".availability_status_enum  AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      `, { transaction });
    }
    
    // Create seats table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".seats (
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

    // Check if booking_status_enum exists before creating
    const bookingStatusEnumExists = await typeExists(transaction, 'booking_status_enum');
    if (!bookingStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
      `, { transaction });
    }
    
    // Create seat_bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".seat_bookings (
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

    // Create meeting_bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".meeting_bookings (
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

    // Check if payment enums exist before creating
    const paymentMethodEnumExists = await typeExists(transaction, 'payment_method_enum');
    if (!paymentMethodEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_method_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET');
      `, { transaction });
    }
    
    const paymentStatusEnumExists = await typeExists(transaction, 'payment_status_enum');
    if (!paymentStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      `, { transaction });
    }
    
    const bookingTypeEnumExists = await typeExists(transaction, 'booking_type_enum');
    if (!bookingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE "${dbSchema}".booking_type_enum AS ENUM ('seat', 'meeting');
      `, { transaction });
    }
    
    // Create payments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".payments (
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

    // Create time_slots table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".time_slots (
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

    await transaction.commit();
    console.log('All tables created successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in migration:', error);
    throw error;
  }
}

// Migration Down Function
async function down() {
  const transaction = await sequelize.transaction();
  
  try {
    // Drop tables in reverse order (to handle foreign key constraints)
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".time_slots;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".payments;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".meeting_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".seat_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".seats;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".seating_types;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".customers;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS "${dbSchema}".branches;', { transaction });
    
    // Drop custom types
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".booking_type_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".payment_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".payment_method_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".booking_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".availability_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS "${dbSchema}".seating_type_enum;', { transaction });
    
    await transaction.commit();
    console.log('All tables dropped successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in rollback:', error);
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
    
    // Check command line arguments
    const args = process.argv.slice(2);
    const direction = args[0]?.toLowerCase();
    
    if (direction === 'down') {
      console.log('Rolling back migrations...');
      await down();
      console.log('Migration rollback completed successfully');
    } else {
      console.log('Running migrations...');
      await up();
      console.log('Migrations completed successfully');
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();