// migrations/001-create-tables.js
import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

async function up() {
  const transaction = await sequelize.transaction();

  try {
    // Create branches table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create customers table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create seating_types table with ENUM
    await sequelize.query(`
      CREATE TYPE seating_type_enum AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'PRIVATE_OFFICE', 'MEETING_ROOM');
      
      CREATE TABLE IF NOT EXISTS seating_types (
        id SERIAL PRIMARY KEY,
        name seating_type_enum NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create seats table with ENUM
    await sequelize.query(`
      CREATE TYPE availability_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        seating_type_id INTEGER NOT NULL REFERENCES seating_types(id),
        seat_number VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        availability_status availability_status_enum DEFAULT 'AVAILABLE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create seat_bookings table with ENUM
    await sequelize.query(`
      CREATE TYPE booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
      
      CREATE TABLE IF NOT EXISTS seat_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        seat_id INTEGER NOT NULL REFERENCES seats(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status booking_status_enum DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create meeting_bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS meeting_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        meeting_room_id INTEGER NOT NULL REFERENCES seats(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        num_participants INTEGER NOT NULL,
        amenities JSONB,
        total_price DECIMAL(10, 2) NOT NULL,
        status booking_status_enum DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create payments table with ENUMs
    await sequelize.query(`
      CREATE TYPE payment_method_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET');
      CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      CREATE TYPE booking_type_enum AS ENUM ('seat', 'meeting');
      
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        booking_type booking_type_enum NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method payment_method_enum NOT NULL,
        payment_status payment_status_enum DEFAULT 'PENDING',
        transaction_id VARCHAR(255),
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

async function down() {
  const transaction = await sequelize.transaction();
  
  try {
    // Drop tables in reverse order (to handle foreign key constraints)
    await sequelize.query('DROP TABLE IF EXISTS payments;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS meeting_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seat_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seats;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seating_types;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS customers;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS branches;', { transaction });
    
    // Drop custom types
    await sequelize.query('DROP TYPE IF EXISTS booking_type_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS payment_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS payment_method_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS booking_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS availability_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS seating_type_enum;', { transaction });
    
    await transaction.commit();
    console.log('All tables dropped successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in rollback:', error);
    throw error;
  }
}

export { up, down };
