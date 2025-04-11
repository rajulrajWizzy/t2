-- Comprehensive schema creation for Excel Coworks database
-- This script creates all the base tables required for the application
-- Run with: psql -U postgres -d excel_coworks -f src/migrations/create_schema.sql

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS excel_coworks_schema;

-- Set the search path to our schema
SET search_path TO excel_coworks_schema;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (comment out in production)
-- DROP TABLE IF EXISTS excel_coworks_schema.coin_transactions CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.customer_coins CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.maintenance_blocks CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.payments CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.seat_bookings CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.meeting_bookings CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.customers CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.seats CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.seating_types CASCADE;
-- DROP TABLE IF EXISTS excel_coworks_schema.branches CASCADE;

-- Create branches table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_code VARCHAR(20) NOT NULL UNIQUE,
  location VARCHAR(255),
  address TEXT,
  opening_time TIME DEFAULT '09:00:00',
  closing_time TIME DEFAULT '18:00:00',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create seating types table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.seating_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create seats table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.seats (
  id SERIAL PRIMARY KEY,
  seat_number VARCHAR(50) NOT NULL,
  branch_id INTEGER REFERENCES excel_coworks_schema.branches(id),
  seating_type_id INTEGER REFERENCES excel_coworks_schema.seating_types(id),
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create meeting bookings table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.meeting_bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES excel_coworks_schema.customers(id),
  meeting_room_id INTEGER REFERENCES excel_coworks_schema.seats(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create seat bookings table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.seat_bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES excel_coworks_schema.customers(id),
  seat_id INTEGER REFERENCES excel_coworks_schema.seats(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  order_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  booking_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  order_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create maintenance blocks table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.maintenance_blocks (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES excel_coworks_schema.branches(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer coins table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.customer_coins (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES excel_coworks_schema.customers(id),
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create coin transactions table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.coin_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES excel_coworks_schema.customers(id),
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create password resets table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seat_bookings_customer_id ON excel_coworks_schema.seat_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_seat_id ON excel_coworks_schema.seat_bookings(seat_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_status ON excel_coworks_schema.seat_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_customer_id ON excel_coworks_schema.meeting_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_meeting_room_id ON excel_coworks_schema.meeting_bookings(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON excel_coworks_schema.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON excel_coworks_schema.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_coins_customer_id ON excel_coworks_schema.customer_coins(customer_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_customer_id ON excel_coworks_schema.coin_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON excel_coworks_schema.coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_order_id ON excel_coworks_schema.seat_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON excel_coworks_schema.payments(order_id);

-- Success message
SELECT 'Schema created successfully!' as message; 