/**
 * Admin Password Reset Script
 * 
 * This script resets the admin password to the default value.
 * It can be used to recover admin access if password is lost.
 * 
 * Usage: node scripts/reset-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const colors = require('colors');

const log = (message, color = 'white') => {
  console.log(colors[color](message));
};

const DEFAULT_PASSWORD = 'Admin@123';

async function resetAdminPassword() {
  log(`${colors.bright}${colors.cyan}===== Admin Password Reset =====`, colors.cyan);

  try {
    // Create Sequelize instance
    const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });

    // Test connection
    await sequelize.authenticate();
    log('✅ Database connection successful', colors.green);

    // Get schema from environment or use default
    const schema = process.env.DB_SCHEMA || 'public';

    // Check if admins table exists
    const [tableCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'admins'
      );
    `);

    if (!tableCheck[0].exists) {
      log('Creating admins table...', colors.yellow);
      
      await sequelize.query(`
        CREATE TABLE "${schema}"."admins" (
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
      
      log('✅ Admins table created', colors.green);
    }

    // Generate password hash
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, salt);

    // Check if admin exists
    const [adminCheck] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "${schema}"."admins"
      WHERE username = 'admin' OR email = 'admin@coworks.com'
    `);

    if (parseInt(adminCheck[0].count) === 0) {
      // Create admin if doesn't exist
      log('Creating default admin user...', colors.yellow);
      
      await sequelize.query(`
        INSERT INTO "${schema}"."admins" (
          username, 
          email, 
          password, 
          name, 
          role, 
          permissions, 
          is_active, 
          created_at, 
          updated_at
        ) VALUES (
          'admin',
          'admin@coworks.com',
          '${hashedPassword}',
          'Super Admin',
          'super_admin',
          '${JSON.stringify({
            seats: ['read', 'create', 'update', 'delete'],
            branches: ['read', 'create', 'update', 'delete'],
            bookings: ['read', 'create', 'update', 'delete'],
            customers: ['read', 'create', 'update', 'delete']
          }).replace(/'/g, "''")}',
          TRUE,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      `);
      
      log('✅ Default admin created successfully', colors.green);
    } else {
      // Update existing admin password
      log('Resetting admin password...', colors.yellow);
      
      await sequelize.query(`
        UPDATE "${schema}"."admins"
        SET password = '${hashedPassword}',
            is_active = TRUE
        WHERE username = 'admin' OR email = 'admin@coworks.com';
      `);
      
      log('✅ Admin password reset successfully', colors.green);
    }
    
    // Display login information
    log(`\n${colors.bright}${colors.green}===== Admin Login Information =====`, colors.green);
    log(`Username: admin`, colors.yellow);
    log(`Email: admin@coworks.com`, colors.yellow);
    log(`Password: ${DEFAULT_PASSWORD}`, colors.yellow);
    log(`\n⚠️  Please change the default password after login!`, colors.red);
    
    await sequelize.close();
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the reset
resetAdminPassword(); 