#!/usr/bin/env node
/**
 * Super Admin Seeder
 * 
 * This script creates the initial super admin account if none exists.
 * It ensures there's always at least one super admin in the system.
 * 
 * Usage:
 * node scripts/seed-superadmin.js
 */

const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determine environment and get DB config
const env = process.env.NODE_ENV || 'development';
let sequelize;

// Default super admin credentials - CHANGE AFTER FIRST LOGIN!
const DEFAULT_SUPERADMIN = {
  username: 'superadmin',
  email: 'superadmin@coworks.com',
  password: 'CoWorks@SuperAdmin2023', // This will be hashed before storage
  name: 'Super Admin',
  role: 'super_admin',
  is_active: true
};

// Setup database connection based on environment
async function setupDatabase() {
  try {
    // Get database configuration from environment variables
    const dbUrl = process.env.DATABASE_URL;
    
    if (dbUrl) {
      // Connect using DATABASE_URL if available (typical in production/Vercel)
      sequelize = new Sequelize(dbUrl, {
        dialect: 'postgres', // Adjust if using a different database
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      });
    } else {
      // Connect using individual credentials
      sequelize = new Sequelize(
        process.env.DB_NAME || 'coworks',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          dialect: 'postgres', // Adjust if using a different database
          logging: false
        }
      );
    }
    
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

// Hash password using bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Check if super admin exists
async function checkSuperAdminExists() {
  try {
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin'"
    );
    return results[0].count > 0;
  } catch (error) {
    console.error('Error checking if super admin exists:', error);
    return false;
  }
}

// Create super admin
async function createSuperAdmin() {
  try {
    const hashedPassword = await hashPassword(DEFAULT_SUPERADMIN.password);
    
    const [results] = await sequelize.query(`
      INSERT INTO admins (
        username, 
        email, 
        password, 
        name, 
        role, 
        is_active, 
        created_at, 
        updated_at
      ) VALUES (
        '${DEFAULT_SUPERADMIN.username}',
        '${DEFAULT_SUPERADMIN.email}',
        '${hashedPassword}',
        '${DEFAULT_SUPERADMIN.name}',
        '${DEFAULT_SUPERADMIN.role}',
        ${DEFAULT_SUPERADMIN.is_active},
        NOW(),
        NOW()
      ) RETURNING id
    `);
    
    if (results && results.length > 0) {
      console.log(`Super admin created with ID: ${results[0].id}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating super admin:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting super admin seeder...');
  
  // Setup database connection
  const dbConnected = await setupDatabase();
  if (!dbConnected) {
    console.error('Failed to connect to the database. Exiting...');
    process.exit(1);
  }
  
  // Check if super admin exists
  const superAdminExists = await checkSuperAdminExists();
  
  if (superAdminExists) {
    console.log('Super admin already exists. Seeding not necessary.');
  } else {
    console.log('No super admin found. Creating default super admin...');
    const created = await createSuperAdmin();
    
    if (created) {
      console.log('Super admin created successfully with the following credentials:');
      console.log(`Username: ${DEFAULT_SUPERADMIN.username}`);
      console.log(`Password: ${DEFAULT_SUPERADMIN.password}`);
      console.log('IMPORTANT: Change the default password after first login!');
    } else {
      console.error('Failed to create super admin.');
      process.exit(1);
    }
  }
  
  // Close database connection
  await sequelize.close();
  console.log('Database connection closed.');
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 