/**
 * Direct Fix Script
 * 
 * This script directly creates the minimum database structure needed for admin login.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log("Starting direct fix script...");

// Create admin table and user
async function fixAdminLogin() {
  try {
    console.log("Connecting to database...");
    
    // Connect to PostgreSQL with null password (for trusted local connections)
    const client = new Client({
      user: "postgres",
      password: null,
      host: "localhost",
      port: 5432,
      database: "postgres"
    });
    
    await client.connect();
    console.log("Connected to database");
    
    // Create admins table
    console.log("Creating admins table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
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
    
    // Create customers table with is_identity_verified
    console.log("Creating customers table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        address TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if admin exists
    const adminResult = await client.query(`
      SELECT * FROM admins WHERE username = 'admin' OR email = 'admin@example.com'
    `);
    
    // Create default password
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = 'Admin@123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, salt);
    
    if (adminResult.rows.length === 0) {
      console.log("Creating default admin user...");
      // Create default admin
      await client.query(`
        INSERT INTO admins (
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
      console.log("Default admin created");
    } else {
      console.log("Resetting admin password...");
      // Reset admin password
      await client.query(`
        UPDATE admins 
        SET password = $1, is_active = TRUE 
        WHERE username = 'admin' OR email = 'admin@example.com'
      `, [hashedPassword]);
      console.log("Admin password reset");
    }
    
    console.log("\n===== Fix Completed =====");
    console.log("Admin Login Information:");
    console.log("Username: admin");
    console.log("Email: admin@example.com");
    console.log("Password: Admin@123");
    console.log("\nWARNING: Change the default password after login!");
    
    await client.end();
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fixAdminLogin(); 