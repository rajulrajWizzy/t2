#!/usr/bin/env node
/**
 * Admin Manager Utility
 * 
 * This script provides a command-line interface for managing admin users.
 * It allows creating, updating, listing, and deleting admin users with proper validation.
 * 
 * Usage:
 * node scripts/admin-manager.js [command] [options]
 * 
 * Commands:
 *   create    - Create a new admin user
 *   list      - List all admin users
 *   update    - Update an existing admin user
 *   delete    - Delete an admin user
 *   reset-pwd - Reset admin password
 *   help      - Show help
 * 
 * Examples:
 *   node scripts/admin-manager.js create --username admin --password Admin123! --role super_admin
 *   node scripts/admin-manager.js list
 *   node scripts/admin-manager.js reset-pwd --id 1 --password NewPass123!
 */

const bcrypt = require('bcrypt');
const { Sequelize, Op } = require('sequelize');
const readline = require('readline');
const crypto = require('crypto');
require('dotenv').config();

// Determine environment and get DB config
const env = process.env.NODE_ENV || 'development';
let sequelize;

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Admin roles
const AdminRoles = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  SUPPORT_ADMIN: 'support_admin'
};

// Available commands
const COMMANDS = ['create', 'list', 'update', 'delete', 'reset-pwd', 'help'];

// Setup database connection based on environment
async function setupDatabase() {
  try {
    // Get database configuration from environment variables
    const dbUrl = process.env.DATABASE_URL;
    
    if (dbUrl) {
      // Connect using DATABASE_URL if available
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

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { command: '', options: {} };
  
  if (args.length === 0) {
    result.command = 'help';
    return result;
  }
  
  result.command = args[0].toLowerCase();
  
  if (!COMMANDS.includes(result.command)) {
    console.error(`Unknown command: ${result.command}`);
    result.command = 'help';
    return result;
  }
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const option = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      result.options[option] = value;
      if (value !== true) i++;
    }
  }
  
  return result;
}

// Validate password complexity
function isPasswordValid(password) {
  if (typeof password !== 'string') return false;
  
  // Password must be at least 8 characters long
  if (password.length < 8) return false;
  
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Must contain at least one number
  if (!/[0-9]/.test(password)) return false;
  
  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  
  return true;
}

// Validate email format
function isEmailValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Hash password using bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Check if super admin exists
async function countSuperAdmins() {
  try {
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin' AND is_active = true"
    );
    return parseInt(results[0].count);
  } catch (error) {
    console.error('Error counting super admins:', error);
    return 0;
  }
}

// Create a new admin user
async function createAdmin(options) {
  try {
    const { username, email, password, name, role, branch_id } = options;
    
    // Validate required fields
    if (!username || !email || !password || !name) {
      console.error('Missing required fields: username, email, password, and name are required');
      return false;
    }
    
    // Validate email format
    if (!isEmailValid(email)) {
      console.error('Invalid email format');
      return false;
    }
    
    // Validate password complexity
    if (!isPasswordValid(password)) {
      console.error('Password does not meet complexity requirements');
      console.error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return false;
    }
    
    // Validate role
    const validRole = role in AdminRoles ? role : AdminRoles.BRANCH_ADMIN;
    
    // Branch admin requires branch_id
    if (validRole === AdminRoles.BRANCH_ADMIN && !branch_id) {
      console.error('Branch ID is required for branch admin role');
      return false;
    }
    
    // Check if username or email already exists
    const [existingUsers] = await sequelize.query(`
      SELECT * FROM admins 
      WHERE username = '${username}' OR email = '${email}'
    `);
    
    if (existingUsers.length > 0) {
      console.error('Username or email already exists');
      return false;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create admin user
    const [result] = await sequelize.query(`
      INSERT INTO admins (
        username, 
        email, 
        password, 
        name, 
        role, 
        branch_id,
        is_active, 
        created_at, 
        updated_at
      ) VALUES (
        '${username}',
        '${email}',
        '${hashedPassword}',
        '${name}',
        '${validRole}',
        ${branch_id ? branch_id : 'NULL'},
        true,
        NOW(),
        NOW()
      ) RETURNING id
    `);
    
    if (result && result.length > 0) {
      console.log(`Admin user created with ID: ${result[0].id}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return false;
  }
}

// List all admin users
async function listAdmins() {
  try {
    const [admins] = await sequelize.query(`
      SELECT id, username, email, name, role, branch_id, is_active, last_login, created_at
      FROM admins
      ORDER BY id ASC
    `);
    
    if (admins.length === 0) {
      console.log('No admin users found');
      return;
    }
    
    console.log('\nAdmin Users:');
    console.log('===========================================================');
    console.log('ID | Username | Email | Name | Role | Active | Last Login');
    console.log('-----------------------------------------------------------');
    
    admins.forEach(admin => {
      console.log(`${admin.id} | ${admin.username} | ${admin.email} | ${admin.name} | ${admin.role} | ${admin.is_active ? 'Yes' : 'No'} | ${admin.last_login || 'Never'}`);
    });
    
    console.log('===========================================================');
    console.log(`Total: ${admins.length} admin(s)\n`);
  } catch (error) {
    console.error('Error listing admin users:', error);
  }
}

// Update an existing admin user
async function updateAdmin(options) {
  try {
    const { id, username, email, name, role, branch_id, is_active } = options;
    
    if (!id) {
      console.error('Admin ID is required');
      return false;
    }
    
    // Check if admin exists
    const [admins] = await sequelize.query(`
      SELECT * FROM admins WHERE id = ${id}
    `);
    
    if (admins.length === 0) {
      console.error(`Admin with ID ${id} not found`);
      return false;
    }
    
    const admin = admins[0];
    
    // Check if deactivating the last super admin
    if (is_active === 'false' && admin.role === AdminRoles.SUPER_ADMIN) {
      const superAdminCount = await countSuperAdmins();
      
      if (superAdminCount <= 1) {
        console.error('Cannot deactivate the last super admin');
        return false;
      }
    }
    
    // Check if changing role from super admin and it's the last one
    if (role && role !== AdminRoles.SUPER_ADMIN && admin.role === AdminRoles.SUPER_ADMIN) {
      const superAdminCount = await countSuperAdmins();
      
      if (superAdminCount <= 1) {
        console.error('Cannot change role of the last super admin');
        return false;
      }
    }
    
    // Validate email if provided
    if (email && !isEmailValid(email)) {
      console.error('Invalid email format');
      return false;
    }
    
    // Build update query
    let updateFields = [];
    if (username) updateFields.push(`username = '${username}'`);
    if (email) updateFields.push(`email = '${email}'`);
    if (name) updateFields.push(`name = '${name}'`);
    if (role) updateFields.push(`role = '${role}'`);
    if (branch_id !== undefined) {
      if (branch_id === 'null') {
        updateFields.push(`branch_id = NULL`);
      } else {
        updateFields.push(`branch_id = ${branch_id}`);
      }
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = ${is_active === 'true'}`);
    }
    
    if (updateFields.length === 0) {
      console.error('No fields to update');
      return false;
    }
    
    // Update admin
    await sequelize.query(`
      UPDATE admins
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ${id}
    `);
    
    console.log(`Admin with ID ${id} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating admin user:', error);
    return false;
  }
}

// Delete an admin user
async function deleteAdmin(options) {
  try {
    const { id } = options;
    
    if (!id) {
      console.error('Admin ID is required');
      return false;
    }
    
    // Check if admin exists
    const [admins] = await sequelize.query(`
      SELECT * FROM admins WHERE id = ${id}
    `);
    
    if (admins.length === 0) {
      console.error(`Admin with ID ${id} not found`);
      return false;
    }
    
    const admin = admins[0];
    
    // Check if deleting the last super admin
    if (admin.role === AdminRoles.SUPER_ADMIN) {
      const superAdminCount = await countSuperAdmins();
      
      if (superAdminCount <= 1) {
        console.error('Cannot delete the last super admin');
        return false;
      }
    }
    
    // Confirm deletion
    return new Promise((resolve) => {
      rl.question(`Are you sure you want to delete admin ${admin.username}? (y/n): `, async (answer) => {
        if (answer.toLowerCase() === 'y') {
          // Delete admin
          await sequelize.query(`
            DELETE FROM admins
            WHERE id = ${id}
          `);
          
          console.log(`Admin with ID ${id} deleted successfully`);
          resolve(true);
        } else {
          console.log('Deletion cancelled');
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return false;
  }
}

// Reset admin password
async function resetPassword(options) {
  try {
    const { id, password, generate } = options;
    
    if (!id) {
      console.error('Admin ID is required');
      return false;
    }
    
    // Check if admin exists
    const [admins] = await sequelize.query(`
      SELECT * FROM admins WHERE id = ${id}
    `);
    
    if (admins.length === 0) {
      console.error(`Admin with ID ${id} not found`);
      return false;
    }
    
    let newPassword = password;
    
    // Generate random password if requested
    if (generate) {
      newPassword = crypto.randomBytes(10).toString('hex').slice(0, 8) + 'Aa1!';
    }
    
    // Validate password complexity
    if (!isPasswordValid(newPassword)) {
      console.error('Password does not meet complexity requirements');
      console.error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return false;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await sequelize.query(`
      UPDATE admins
      SET password = '${hashedPassword}', updated_at = NOW()
      WHERE id = ${id}
    `);
    
    console.log(`Password for admin with ID ${id} reset successfully`);
    
    if (generate) {
      console.log(`New password: ${newPassword}`);
      console.log('IMPORTANT: Save this password immediately, it won\'t be shown again!');
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return false;
  }
}

// Display help
function showHelp() {
  console.log(`
Admin Manager Utility
=====================

This script provides a command-line interface for managing admin users.

Usage:
  node scripts/admin-manager.js [command] [options]

Commands:
  create    - Create a new admin user
  list      - List all admin users
  update    - Update an existing admin user
  delete    - Delete an admin user
  reset-pwd - Reset admin password
  help      - Show this help

Options for 'create':
  --username    Username for the admin (required)
  --email       Email address (required)
  --password    Password (required)
  --name        Full name (required)
  --role        Role (super_admin, branch_admin, support_admin)
  --branch_id   Branch ID (required for branch_admin)

Options for 'update':
  --id          Admin ID (required)
  --username    New username
  --email       New email address
  --name        New full name
  --role        New role
  --branch_id   New branch ID
  --is_active   Set active status (true/false)

Options for 'delete':
  --id          Admin ID (required)

Options for 'reset-pwd':
  --id          Admin ID (required)
  --password    New password
  --generate    Generate a random password (no value needed)

Examples:
  node scripts/admin-manager.js create --username admin --password Admin123! --email admin@example.com --name "Admin User" --role super_admin
  node scripts/admin-manager.js list
  node scripts/admin-manager.js update --id 1 --name "Updated Name" --is_active true
  node scripts/admin-manager.js delete --id 2
  node scripts/admin-manager.js reset-pwd --id 1 --generate
  `);
}

// Main function
async function main() {
  const { command, options } = parseArgs();
  
  if (command === 'help') {
    showHelp();
    rl.close();
    return;
  }
  
  // Setup database connection
  const dbConnected = await setupDatabase();
  if (!dbConnected) {
    console.error('Failed to connect to the database. Exiting...');
    rl.close();
    process.exit(1);
  }
  
  let result = false;
  
  // Execute command
  switch (command) {
    case 'create':
      result = await createAdmin(options);
      break;
    case 'list':
      await listAdmins();
      result = true;
      break;
    case 'update':
      result = await updateAdmin(options);
      break;
    case 'delete':
      result = await deleteAdmin(options);
      break;
    case 'reset-pwd':
      result = await resetPassword(options);
      break;
    default:
      showHelp();
      break;
  }
  
  // Close database connection
  await sequelize.close();
  console.log('Database connection closed.');
  
  // Close readline interface
  rl.close();
  
  // Exit with appropriate code
  process.exit(result ? 0 : 1);
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
  rl.close();
  process.exit(1);
}); 