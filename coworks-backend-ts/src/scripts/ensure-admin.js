#!/usr/bin/env node

/**
 * Script to ensure admin user exists in the database
 * This creates the admin table and default admin if they don't exist
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
const DB_PASS = process.env.DB_PASS === '""' ? '' : (process.env.DB_PASS || '');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
const DB_SSL = process.env.DB_SSL === 'true';

console.log('Admin User Setup Script');
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
async function setupAdmin() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');
    
    // Create schema if it doesn't exist
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
    console.log(`✅ Ensured schema "${DB_SCHEMA}" exists`);
    
    // Check if admins table exists
    const [adminTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'admins'
      ) as exists;
    `);
    
    if (!adminTableExists[0].exists) {
      console.log('Creating admins table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'staff',
          branch_id INTEGER NULL,
          permissions JSONB NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Admins table created');
    }
    
    // Check if admin user exists
    const [adminExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "${DB_SCHEMA}"."admins"
      WHERE username = 'admin' OR email = 'admin@example.com'
    `);
    
    const exists = parseInt(adminExists[0]?.count) > 0;
    
    if (!exists) {
      console.log('Creating default admin user...');
      
      // Generate password hash
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('Admin@123', salt);
      
      // Create default admin
      await sequelize.query(`
        INSERT INTO "${DB_SCHEMA}"."admins" (
          username, email, password, name, role, permissions, is_active, created_at, updated_at
        ) VALUES (
          'admin',
          'admin@example.com',
          :password,
          'Default Admin',
          'super_admin',
          :permissions,
          TRUE,
          NOW(),
          NOW()
        )
      `, {
        replacements: {
          password: hashedPassword,
          permissions: JSON.stringify({
            seats: ['read', 'create', 'update', 'delete'],
            branches: ['read', 'create', 'update', 'delete'],
            bookings: ['read', 'create', 'update', 'delete'],
            customers: ['read', 'create', 'update', 'delete']
          })
        }
      });
      
      console.log('✅ Default admin created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    console.log('\n🎉 Admin setup completed successfully!');
    console.log('\nYou can now log in with:');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('\nUse this curl command to test the login:');
    
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
setupAdmin(); 