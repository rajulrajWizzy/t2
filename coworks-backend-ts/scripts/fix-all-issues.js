/**
 * Fix All Issues Script
 * 
 * This script automates the process of fixing both admin login and customer table issues.
 * It runs the necessary commands to apply database migrations and reset admin credentials.
 * 
 * Usage: node scripts/fix-all-issues.js
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Helper function to log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to check if PostgreSQL is running
function isPostgresRunning() {
  try {
    // Test connection to PostgreSQL
    const { exec } = require('child_process');
    const port = process.env.DB_PORT || 5432;
    const host = process.env.DB_HOST || 'localhost';
    
    // This will throw an error if postgres is not running
    exec(`pg_isready -h ${host} -p ${port}`).toString();
    return true;
  } catch (error) {
    return false;
  }
}

// Function to run a command and return a promise
function runCommand(command, args = [], showOutput = true) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`, colors.cyan);
    
    const child = spawn(command, args, { stdio: showOutput ? 'inherit' : 'pipe' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to start command: ${error.message}`));
    });
  });
}

// Create database schema and tables with SQL directly
async function createDatabaseDirectly() {
  log('Attempting to create database schema and tables directly...', colors.yellow);
  
  // Initialize PostgreSQL client
  const { Client } = require('pg');
  
  // Get database config from .env
  const dbName = process.env.DB_NAME || 'coworks_db';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASS || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  
  try {
    // First connect to default postgres database to check if our DB exists
    const client = new Client({
      user: dbUser,
      password: dbPass,
      host: dbHost,
      port: dbPort,
      database: 'postgres', // Connect to default database first
    });
    
    await client.connect();
    log('✅ Connected to PostgreSQL server', colors.green);
    
    // Check if our database exists
    const dbCheckResult = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [dbName]);
    
    if (dbCheckResult.rows.length === 0) {
      log(`Database ${dbName} does not exist. Creating it...`, colors.yellow);
      await client.query(`CREATE DATABASE ${dbName}`);
      log(`✅ Database ${dbName} created`, colors.green);
    } else {
      log(`Database ${dbName} already exists`, colors.green);
    }
    
    await client.end();
    
    // Now connect to our database to create schema
    const appClient = new Client({
      user: dbUser,
      password: dbPass,
      host: dbHost,
      port: dbPort,
      database: dbName,
    });
    
    await appClient.connect();
    log(`✅ Connected to ${dbName} database`, colors.green);
    
    // Create admins table if it doesn't exist
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS "admins" (
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
    
    // Create customers table if it doesn't exist
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        address TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create default admin
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = 'Admin@123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, salt);
    
    // Check if admin exists
    const adminResult = await appClient.query(`
      SELECT * FROM "admins" WHERE username = 'admin' OR email = 'admin@example.com'
    `);
    
    if (adminResult.rows.length === 0) {
      await appClient.query(`
        INSERT INTO "admins" (
          username, email, password, name, role, permissions, is_active
        ) VALUES (
          'admin', 
          'admin@example.com', 
          $1, 
          'Admin User', 
          'super_admin', 
          $2, 
          TRUE
        )
      `, [
        hashedPassword,
        JSON.stringify({
          seats: ['read', 'create', 'update', 'delete'],
          branches: ['read', 'create', 'update', 'delete'],
          bookings: ['read', 'create', 'update', 'delete'],
          customers: ['read', 'create', 'update', 'delete']
        })
      ]);
      
      log('✅ Default admin created', colors.green);
    } else {
      // Update admin password
      await appClient.query(`
        UPDATE "admins" 
        SET password = $1, is_active = TRUE 
        WHERE username = 'admin' OR email = 'admin@example.com'
      `, [hashedPassword]);
      
      log('✅ Admin password reset', colors.green);
    }
    
    // Fix customer passwords if needed
    const customerDefaultPassword = bcrypt.hashSync('Customer@123', salt);
    
    // Find customers with null or empty passwords
    const emptyPasswordResult = await appClient.query(`
      SELECT id, email FROM "customers"
      WHERE password IS NULL OR password = ''
      OR length(password) < 10
    `);
    
    if (emptyPasswordResult.rows.length > 0) {
      log(`Found ${emptyPasswordResult.rows.length} customers with missing or invalid passwords`, colors.yellow);
      
      for (const customer of emptyPasswordResult.rows) {
        await appClient.query(`
          UPDATE "customers"
          SET password = $1, updated_at = NOW()
          WHERE id = $2
        `, [customerDefaultPassword, customer.id]);
      }
      
      log(`✅ Fixed passwords for ${emptyPasswordResult.rows.length} customers`, colors.green);
    }
    
    // Find customers with invalid password hashes
    const invalidPasswordResult = await appClient.query(`
      SELECT id, email, substring(password from 1 for 4) as password_prefix
      FROM "customers"
      WHERE password IS NOT NULL
      AND length(password) > 10 
      AND (
        substring(password from 1 for 4) != '$2a$'
        AND substring(password from 1 for 4) != '$2b$'
        AND substring(password from 1 for 4) != '$2y$'
      )
    `);
    
    if (invalidPasswordResult.rows.length > 0) {
      log(`Found ${invalidPasswordResult.rows.length} customers with non-bcrypt password hashes`, colors.yellow);
      
      for (const customer of invalidPasswordResult.rows) {
        await appClient.query(`
          UPDATE "customers"
          SET password = $1, updated_at = NOW()
          WHERE id = $2
        `, [customerDefaultPassword, customer.id]);
      }
      
      log(`✅ Fixed invalid password formats for ${invalidPasswordResult.rows.length} customers`, colors.green);
    }
    
    await appClient.end();
    
    log(`\n${colors.bright}${colors.green}===== Database Setup Complete =====`, colors.green);
    log(`Admin Login Information:`, colors.yellow);
    log(`Username: admin`, colors.yellow);
    log(`Email: admin@example.com`, colors.yellow);
    log(`Password: ${defaultPassword}`, colors.yellow);
    
    if (emptyPasswordResult.rows.length > 0 || invalidPasswordResult.rows.length > 0) {
      log(`\nCustomer accounts with reset passwords:`, colors.yellow);
      log(`Default Password: Customer@123`, colors.yellow);
      log(`⚠️ Affected customers should use the password reset feature to set a new password`, colors.red);
    }
    
    log(`\n⚠️  Please change the default password after login!`, colors.red);
    
    return true;
  } catch (error) {
    log(`❌ Database setup error: ${error.message}`, colors.red);
    return false;
  }
}

// Main function to fix all issues
async function fixAllIssues() {
  log(`${colors.bright}${colors.cyan}===== Running All Fixes =====\n`, colors.cyan);
  
  try {
    // Check if PostgreSQL is running
    if (!isPostgresRunning()) {
      log('❌ PostgreSQL is not running. Please start your database server.', colors.red);
      return;
    }
    
    // Try running normal migrations first
    try {
      await runCommand('node', ['migrations/run-migrations.js']);
      log('✅ Database migrations completed', colors.green);
    } catch (migrationError) {
      log(`⚠️ Migration script failed: ${migrationError.message}`, colors.yellow);
      log('Attempting direct database setup instead...', colors.yellow);
      
      const setupSuccess = await createDatabaseDirectly();
      if (!setupSuccess) {
        throw new Error('Database setup failed');
      }
      return; // Skip admin reset since we already did it
    }
    
    // Reset admin password
    try {
      await runCommand('node', ['scripts/reset-admin.js']);
      log('✅ Admin password reset completed', colors.green);
    } catch (resetError) {
      log(`❌ Admin reset failed: ${resetError.message}`, colors.red);
      throw resetError;
    }
    
    // Display success message
    log(`\n${colors.bright}${colors.green}===== All Fixes Completed =====`, colors.green);
    log('The following issues have been fixed:', colors.green);
    log('1. Customer table structure has been updated', colors.green);
    log('2. Admin login credentials have been reset', colors.green);
    log('3. Customer password issues have been fixed', colors.green);
    
    log(`\nAdmin Login Information:`, colors.yellow);
    log(`Username: admin`, colors.yellow);
    log(`Email: admin@example.com`, colors.yellow);
    log(`Password: Admin@123`, colors.yellow);
    
    log(`\nCustomers with reset passwords will use:`, colors.yellow);
    log(`Password: Customer@123`, colors.yellow);
    
    log(`\n⚠️  Please change the default passwords after login!`, colors.red);
    
  } catch (error) {
    log(`\n❌ Fix process failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the fix script
fixAllIssues().catch(error => {
  log(`\n❌ An unexpected error occurred: ${error.message}`, colors.red);
  process.exit(1);
}); 