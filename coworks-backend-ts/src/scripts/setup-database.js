#!/usr/bin/env node

/**
 * Database initialization script
 * 
 * This script:
 * 1. Creates the database schema if it doesn't exist
 * 2. Creates necessary tables if they don't exist
 * 3. Creates a default admin user if none exists
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
// Handle empty password correctly - convert empty quotes to empty string
const DB_PASS = process.env.DB_PASS === '""' ? '' : (process.env.DB_PASS || '');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
const DB_SSL = process.env.DB_SSL === 'true';

console.log('Database Setup Script');
console.log('=====================');
console.log(`Database: ${DB_NAME}`);
console.log(`Schema: ${DB_SCHEMA}`);
console.log(`Host: ${DB_HOST}:${DB_PORT}`);
console.log(`User: ${DB_USER}`);
console.log(`SSL: ${DB_SSL ? 'Enabled' : 'Disabled'}`);
console.log('=====================\n');

// Create a Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
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
async function setupDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');
    
    // Create schema if it doesn't exist
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
    console.log(`✅ Ensured schema "${DB_SCHEMA}" exists`);
    
    // Create BlacklistedTokens table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."blacklisted_tokens" (
        "id" SERIAL PRIMARY KEY,
        "token" TEXT NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created blacklisted_tokens table');
    
    // Create Admins table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."admins" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(50) NOT NULL UNIQUE,
        "email" VARCHAR(100) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "phone" VARCHAR(20),
        "profile_image" VARCHAR(255),
        "role" VARCHAR(20) NOT NULL DEFAULT 'branch_admin',
        "branch_id" INTEGER,
        "permissions" JSONB,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "last_login" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created admins table');
    
    // Create Customers table
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
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created customers table');
    
    // Check if default admin exists
    const [adminResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "${DB_SCHEMA}"."admins"
      WHERE username = 'admin' OR email = 'admin@example.com'
    `);
    
    const adminExists = parseInt(adminResult[0].count, 10) > 0;
    
    if (!adminExists) {
      // Create default super admin
      const salt = bcrypt.genSaltSync(10);
      const password = bcrypt.hashSync('Admin@123', salt);
      
      await sequelize.query(`
        INSERT INTO "${DB_SCHEMA}"."admins" (
          username, email, password, name, role, permissions, is_active
        ) VALUES (
          'admin',
          'admin@example.com',
          :password,
          'Default Admin',
          'super_admin',
          :permissions,
          TRUE
        )
      `, {
        replacements: {
          password,
          permissions: JSON.stringify({
            seats: ['read', 'create', 'update', 'delete'],
            branches: ['read', 'create', 'update', 'delete'],
            bookings: ['read', 'create', 'update', 'delete'],
            customers: ['read', 'create', 'update', 'delete'],
            admins: ['read', 'create', 'update', 'delete']
          })
        }
      });
      
      console.log('✅ Created default admin user:');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
    } else {
      console.log('✅ Default admin already exists');
    }
    
    console.log('\n🎉 Database setup completed successfully!\n');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
setupDatabase(); 