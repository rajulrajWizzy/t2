#!/usr/bin/env node

/**
 * Test data initialization script for development
 * 
 * This script creates:
 * 1. Test customer accounts
 * 2. Test branch data
 * 3. Test seating types and seats
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get database configuration from environment variables
const DB_NAME = process.env.DB_NAME || 'coworks_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'postgres123';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
const DB_SSL = process.env.DB_SSL === 'true';

console.log('Test Data Setup Script');
console.log('=====================');
console.log(`Database: ${DB_NAME}`);
console.log(`Schema: ${DB_SCHEMA}`);
console.log(`Host: ${DB_HOST}:${DB_PORT}`);
console.log(`User: ${DB_USER}`);
console.log(`Password type: ${typeof DB_PASS}`);
console.log(`Password length: ${DB_PASS ? DB_PASS.length : 0}`);
console.log(`SSL: ${DB_SSL ? 'Enabled' : 'Disabled'}`);
console.log('=====================\n');

// Create a Sequelize instance with explicit string password
const sequelize = new Sequelize(DB_NAME, DB_USER, typeof DB_PASS === 'string' ? DB_PASS : '', {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: DB_SSL ? {
      require: true,
      rejectUnauthorized: false
    } : undefined
  }
});

// Main function
async function setupTestData() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');
    
    // Create schema if it doesn't exist
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
    console.log(`✅ Ensured schema "${DB_SCHEMA}" exists`);
    
    // Create test customers
    await createTestCustomers();
    
    // Create test branches
    await createTestBranches();
    
    // Create test seating types
    await createTestSeatingTypes();
    
    console.log('\n🎉 Test data setup completed successfully!\n');
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Create test customers
async function createTestCustomers() {
  try {
    // Check if customers table exists
    const [customerTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'customers'
      ) as exists;
    `);
    
    if (!customerTableExists[0].exists) {
      console.log('Creating customers table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."customers" (
          "id" SERIAL PRIMARY KEY,
          "name" VARCHAR(100) NOT NULL,
          "email" VARCHAR(100) NOT NULL UNIQUE,
          "phone" VARCHAR(20),
          "password" VARCHAR(255) NOT NULL,
          "profile_picture" VARCHAR(255),
          "company_name" VARCHAR(100),
          "proof_of_identity" VARCHAR(255),
          "proof_of_address" VARCHAR(255),
          "address" TEXT,
          "is_identity_verified" BOOLEAN NOT NULL DEFAULT FALSE,
          "is_address_verified" BOOLEAN NOT NULL DEFAULT FALSE,
          "verification_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          "verification_notes" TEXT,
          "verification_date" TIMESTAMP WITH TIME ZONE,
          "verified_by" INTEGER,
          "last_login" TIMESTAMP WITH TIME ZONE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Generate password hash
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('Customer@123', salt);
    
    // Create test customers
    const testCustomers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        company_name: 'Test Company',
        verification_status: 'APPROVED',
        is_identity_verified: true,
        is_address_verified: true
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '8765432109',
        company_name: 'Smith Inc',
        verification_status: 'PENDING',
        is_identity_verified: false,
        is_address_verified: false
      }
    ];
    
    for (const customer of testCustomers) {
      // Check if customer already exists
      const [existingCustomer] = await sequelize.query(`
        SELECT id FROM "${DB_SCHEMA}"."customers" WHERE email = :email
      `, {
        replacements: { email: customer.email }
      });
      
      if (existingCustomer.length === 0) {
        await sequelize.query(`
          INSERT INTO "${DB_SCHEMA}"."customers" (
            name, email, phone, password, company_name, 
            verification_status, is_identity_verified, is_address_verified
          ) VALUES (
            :name, :email, :phone, :password, :company_name, 
            :verification_status, :is_identity_verified, :is_address_verified
          )
        `, {
          replacements: {
            ...customer,
            password
          }
        });
        console.log(`✅ Created test customer: ${customer.name} (${customer.email})`);
      } else {
        console.log(`ℹ️ Test customer already exists: ${customer.email}`);
      }
    }
  } catch (error) {
    console.error('Error creating test customers:', error);
    throw error;
  }
}

// Create test branches
async function createTestBranches() {
  try {
    // Check if branches table exists
    const [branchTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'branches'
      ) as exists;
    `);
    
    if (!branchTableExists[0].exists) {
      console.log('Creating branches table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."branches" (
          "id" SERIAL PRIMARY KEY,
          "name" VARCHAR(100) NOT NULL,
          "short_code" VARCHAR(10) NOT NULL UNIQUE,
          "address" TEXT NOT NULL,
          "location" VARCHAR(100) NULL,
          "latitude" NUMERIC(10, 6) NULL,
          "longitude" NUMERIC(10, 6) NULL,
          "cost_multiplier" NUMERIC(5, 2) DEFAULT 1.00,
          "opening_time" TIME NULL,
          "closing_time" TIME NULL,
          "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Get current branch schema
    const [branchColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = '${DB_SCHEMA}' 
      AND table_name = 'branches'
      ORDER BY ordinal_position;
    `);
    
    console.log('Branch table columns:', branchColumns.map(col => col.column_name).join(', '));
    
    // Create test branches
    const testBranches = [
      {
        name: 'Downtown Branch',
        short_code: 'DT01',
        address: '123 Main Street, New York, NY 10001',
        location: 'New York Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        cost_multiplier: 1.2,
        opening_time: '08:00:00',
        closing_time: '20:00:00'
      },
      {
        name: 'Midtown Branch',
        short_code: 'MT02',
        address: '456 Park Avenue, New York, NY 10022',
        location: 'New York Midtown',
        latitude: 40.7589,
        longitude: -73.9851,
        cost_multiplier: 1.5,
        opening_time: '07:00:00',
        closing_time: '22:00:00'
      }
    ];
    
    for (const branch of testBranches) {
      // Check if branch already exists
      const [existingBranch] = await sequelize.query(`
        SELECT id FROM "${DB_SCHEMA}"."branches" WHERE short_code = :code
      `, {
        replacements: { code: branch.short_code }
      });
      
      if (existingBranch.length === 0) {
        // Generate insert query dynamically based on available columns
        const columnNames = Object.keys(branch).filter(key => 
          branchColumns.some(col => col.column_name === key)
        );
        
        const placeholders = columnNames.map(name => `:${name}`).join(', ');
        
        const query = `
          INSERT INTO "${DB_SCHEMA}"."branches" (
            ${columnNames.join(', ')}
          ) VALUES (
            ${placeholders}
          )
        `;
        
        await sequelize.query(query, {
          replacements: branch
        });
        
        console.log(`✅ Created test branch: ${branch.name} (${branch.short_code})`);
      } else {
        console.log(`ℹ️ Test branch already exists: ${branch.short_code}`);
      }
    }
  } catch (error) {
    console.error('Error creating test branches:', error);
    throw error;
  }
}

// Create test seating types
async function createTestSeatingTypes() {
  try {
    // Check if seating_types table exists
    const [seatingTypeTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'seating_types'
      ) as exists;
    `);
    
    if (!seatingTypeTableExists[0].exists) {
      console.log('Creating seating_types table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."seating_types" (
          "id" SERIAL PRIMARY KEY,
          "name" VARCHAR(100) NOT NULL,
          "short_code" VARCHAR(10) NOT NULL UNIQUE,
          "description" TEXT,
          "price_hourly" DECIMAL(10, 2),
          "price_daily" DECIMAL(10, 2),
          "price_weekly" DECIMAL(10, 2),
          "price_monthly" DECIMAL(10, 2),
          "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Get current seating_types schema
    const [seatingTypeColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = '${DB_SCHEMA}' 
      AND table_name = 'seating_types'
      ORDER BY ordinal_position;
    `);
    
    console.log('Seating types table columns:', seatingTypeColumns.map(col => col.column_name).join(', '));
    
    // Create test seating types
    const testSeatingTypes = [
      {
        name: 'Hot Desk',
        short_code: 'HD01',
        description: 'Flexible desk space, first come first served',
        hourly_rate: 5.99,
        daily_rate: 29.99,
        weekly_rate: 149.99,
        monthly_rate: 499.99,
        capacity: 1,
        is_meeting_room: false,
        is_active: true
      },
      {
        name: 'Dedicated Desk',
        short_code: 'DD02',
        description: 'Your own dedicated desk with storage',
        hourly_rate: 9.99,
        daily_rate: 49.99,
        weekly_rate: 249.99,
        monthly_rate: 799.99,
        capacity: 1,
        is_meeting_room: false,
        is_active: true
      },
      {
        name: 'Private Office',
        short_code: 'PO03',
        description: 'Private office space for teams',
        hourly_rate: 19.99,
        daily_rate: 99.99,
        weekly_rate: 499.99,
        monthly_rate: 1499.99,
        capacity: 4,
        is_meeting_room: false,
        is_active: true
      }
    ];
    
    for (const seatingType of testSeatingTypes) {
      // Check if seating type already exists
      let existingSeatingType;
      try {
        // Try with short_code first
        [existingSeatingType] = await sequelize.query(`
          SELECT id FROM "${DB_SCHEMA}"."seating_types" WHERE short_code = :code
        `, {
          replacements: { code: seatingType.short_code }
        });
      } catch (err) {
        // Fallback to name if short_code doesn't exist
        [existingSeatingType] = await sequelize.query(`
          SELECT id FROM "${DB_SCHEMA}"."seating_types" WHERE name = :name
        `, {
          replacements: { name: seatingType.name }
        });
      }
      
      if (existingSeatingType.length === 0) {
        // Generate insert query dynamically based on available columns
        const columnNames = Object.keys(seatingType).filter(key => 
          seatingTypeColumns.some(col => col.column_name === key)
        );
        
        const placeholders = columnNames.map(name => `:${name}`).join(', ');
        
        const query = `
          INSERT INTO "${DB_SCHEMA}"."seating_types" (
            ${columnNames.join(', ')}
          ) VALUES (
            ${placeholders}
          )
        `;
        
        await sequelize.query(query, {
          replacements: seatingType
        });
        
        console.log(`✅ Created test seating type: ${seatingType.name} (${seatingType.short_code})`);
      } else {
        console.log(`ℹ️ Test seating type already exists: ${seatingType.short_code}`);
      }
    }
    
    // Now create seats table if it doesn't exist
    const [seatsTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'seats'
      ) as exists;
    `);
    
    if (!seatsTableExists[0].exists) {
      console.log('Creating seats table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."seats" (
          "id" SERIAL PRIMARY KEY,
          "branch_id" INTEGER NOT NULL,
          "seating_type_id" INTEGER NOT NULL,
          "seat_number" VARCHAR(20) NOT NULL,
          "status" VARCHAR(20) NOT NULL DEFAULT 'available',
          "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(branch_id, seat_number)
        )
      `);
    }
    
    // Now add some test seats
    // First get the branch IDs
    const [branches] = await sequelize.query(`
      SELECT id, short_code FROM "${DB_SCHEMA}"."branches"
    `);
    
    // Get seating type IDs
    const [seatingTypes] = await sequelize.query(`
      SELECT id, short_code FROM "${DB_SCHEMA}"."seating_types"
    `);
    
    if (branches.length > 0 && seatingTypes.length > 0) {
      // Map branch and seating type codes to IDs
      const branchMap = branches.reduce((map, branch) => {
        map[branch.short_code] = branch.id;
        return map;
      }, {});
      
      const seatingTypeMap = seatingTypes.reduce((map, type) => {
        map[type.short_code] = type.id;
        return map;
      }, {});
      
      // Create test seats
      for (const branchCode of Object.keys(branchMap)) {
        for (const typeCode of Object.keys(seatingTypeMap)) {
          // Create 5 seats for each branch and seating type
          for (let i = 1; i <= 5; i++) {
            const seatNumber = `${typeCode}-${i}`;
            
            // Check if seat already exists
            const [existingSeat] = await sequelize.query(`
              SELECT id FROM "${DB_SCHEMA}"."seats" 
              WHERE branch_id = :branch_id AND seat_number = :seat_number
            `, {
              replacements: { 
                branch_id: branchMap[branchCode],
                seat_number: seatNumber
              }
            });
            
            if (existingSeat.length === 0) {
              await sequelize.query(`
                INSERT INTO "${DB_SCHEMA}"."seats" (
                  branch_id, seating_type_id, seat_number, status
                ) VALUES (
                  :branch_id, :seating_type_id, :seat_number, 'available'
                )
              `, {
                replacements: {
                  branch_id: branchMap[branchCode],
                  seating_type_id: seatingTypeMap[typeCode],
                  seat_number: seatNumber
                }
              });
              console.log(`✅ Created test seat: ${seatNumber} in branch ${branchCode}`);
            } else {
              console.log(`ℹ️ Test seat already exists: ${seatNumber} in branch ${branchCode}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error creating test seating types:', error);
    throw error;
  }
}

// Run the setup
setupTestData(); 