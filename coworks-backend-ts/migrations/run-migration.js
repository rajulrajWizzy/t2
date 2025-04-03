/**
 * Excel Coworks Database Migration Script
 * This script sets up the necessary database schema and tables for the Excel Coworks application
 */

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Database connection settings
const database = process.env.DB_NAME || 'excel_coworks';
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASS || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';

console.log('='.repeat(50));
console.log('EXCEL COWORKS DATABASE MIGRATION SCRIPT');
console.log('='.repeat(50));
console.log(`Database: ${database}`);
console.log(`Username: ${username}`);
console.log(`Host: ${host}:${port}`);
console.log(`Schema: ${schema}`);
console.log('-'.repeat(50));

// Create Sequelize instance
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres',
  logging: console.log,
});

// SQL script to run for migration
const migrationSQL = `
-- Create the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS ${schema};

-- Create branches table
CREATE TABLE IF NOT EXISTS ${schema}.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  opening_time TIME WITHOUT TIME ZONE NOT NULL,
  closing_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create seating types table
CREATE TABLE IF NOT EXISTS ${schema}.seating_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create seats table
CREATE TABLE IF NOT EXISTS ${schema}.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES ${schema}.branches(id),
  seating_type_id UUID REFERENCES ${schema}.seating_types(id),
  name VARCHAR(255) NOT NULL,
  seat_number VARCHAR(50) NOT NULL,
  seat_code VARCHAR(50),
  price DECIMAL(10,2),
  capacity INTEGER DEFAULT 1,
  is_configurable BOOLEAN DEFAULT false,
  availability_status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS ${schema}.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES ${schema}.seats(id),
  user_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  booking_reference VARCHAR(100),
  notes TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  checkin_time TIMESTAMP WITH TIME ZONE,
  checkout_time TIMESTAMP WITH TIME ZONE
);

-- Create maintenance blocks table
CREATE TABLE IF NOT EXISTS ${schema}.maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES ${schema}.seats(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  notes TEXT
);

-- Insert sample data for testing
INSERT INTO ${schema}.branches (
  id, name, short_code, address, city, state, country, postal_code, 
  phone, email, opening_time, closing_time
)
VALUES (
  gen_random_uuid(), 'Digital Ocean HQ', 'DOHQ', '101 Avenue of the Americas', 
  'New York', 'NY', 'USA', '10013', 
  '123-456-7890', 'info@digitalocean.com', 
  '09:00', '18:00'
)
ON CONFLICT DO NOTHING;

INSERT INTO ${schema}.seating_types (
  id, name, short_code, description
)
VALUES 
(gen_random_uuid(), 'Hot Desk', 'HD', 'Flexible workspace for daily use'),
(gen_random_uuid(), 'Dedicated Desk', 'DD', 'Fixed desk for regular use'),
(gen_random_uuid(), 'Private Office', 'PO', 'Enclosed office space')
ON CONFLICT DO NOTHING;
`;

// Function to run the migration script
async function runMigration() {
  try {
    // Test the database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');

    // Run the migration SQL
    console.log('Running migration script...');
    await sequelize.query(migrationSQL);
    console.log('✅ Schema and tables created successfully.');

    // Insert sample seats
    console.log('Inserting sample seats...');
    
    // Get branch and seating type IDs
    const [branchResult] = await sequelize.query(`
      SELECT id FROM ${schema}.branches LIMIT 1
    `);
    
    if (branchResult.length === 0) {
      throw new Error('No branches found in the database');
    }
    
    const branchId = branchResult[0].id;
    
    // Get seating type IDs
    const [seatingTypes] = await sequelize.query(`
      SELECT id, short_code FROM ${schema}.seating_types
    `);
    
    if (seatingTypes.length === 0) {
      throw new Error('No seating types found in the database');
    }
    
    // Create a mapping for seating type IDs
    const typeIds = {};
    seatingTypes.forEach(type => {
      typeIds[type.short_code] = type.id;
    });
    
    // Insert sample seats with proper references
    const seatInsertSQL = `
    INSERT INTO ${schema}.seats (
      branch_id, seating_type_id, name, seat_number, seat_code,
      price, capacity, is_configurable, availability_status
    )
    VALUES 
    ('${branchId}', '${typeIds['HD']}', 'Hot Desk 1', 'HD1', 'DOHQ-HD1', 25.00, 1, false, 'available'),
    ('${branchId}', '${typeIds['HD']}', 'Hot Desk 2', 'HD2', 'DOHQ-HD2', 25.00, 1, false, 'available'),
    ('${branchId}', '${typeIds['DD']}', 'Dedicated Desk 1', 'DD1', 'DOHQ-DD1', 45.00, 1, false, 'available'),
    ('${branchId}', '${typeIds['PO']}', 'Private Office 1', 'PO1', 'DOHQ-PO1', 85.00, 4, true, 'available')
    ON CONFLICT DO NOTHING;
    `;
    
    await sequelize.query(seatInsertSQL);
    console.log('✅ Sample seats inserted successfully.');
    
    // Show the IDs for testing
    const [seats] = await sequelize.query(`
      SELECT id, name, seat_number, seat_code
      FROM ${schema}.seats
      LIMIT 5
    `);
    
    console.log('-'.repeat(50));
    console.log('AVAILABLE SEAT IDs FOR TESTING:');
    seats.forEach(seat => {
      console.log(`- ID: ${seat.id}`);
      console.log(`  Name: ${seat.name} (${seat.seat_number})`);
      console.log(`  Code: ${seat.seat_code}`);
      console.log('');
    });
    
    console.log('-'.repeat(50));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('You can now use the application with the database properly set up.');
    console.log('-'.repeat(50));
    
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration
runMigration(); 