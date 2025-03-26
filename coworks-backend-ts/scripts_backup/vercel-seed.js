/**
 * Vercel deployment script to seed a super admin user
 * This script is designed to be run during Vercel deployment
 */

const bcrypt = require('bcryptjs');
const { Sequelize, Op } = require('sequelize');
require('dotenv').config();

console.log('[Vercel Seed] Starting super admin seed process');
console.log('[Vercel Seed] Environment:', process.env.NODE_ENV);

// Database connection parameters handling
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[Vercel Seed] ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('[Vercel Seed] Database URL available (not showing for security)');

// Database connection setup
let sequelize;
try {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });
  console.log('[Vercel Seed] Sequelize instance created');
} catch (err) {
  console.error('[Vercel Seed] Failed to create Sequelize instance:', err);
  process.exit(1);
}

// Admin model definition (simplified version from the main codebase)
const Admin = sequelize.define('Admin', {
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  role: {
    type: Sequelize.STRING,
    allowNull: false
  },
  is_active: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_login: {
    type: Sequelize.DATE,
    allowNull: true
  }
}, {
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function seedSuperAdmin() {
  try {
    // Try to connect to the database with retry logic
    let connected = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!connected && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[Vercel Seed] Attempting to connect to database (attempt ${attempts}/${maxAttempts})`);
        await sequelize.authenticate();
        connected = true;
        console.log('[Vercel Seed] Database connection has been established successfully.');
      } catch (authError) {
        console.error(`[Vercel Seed] Database connection attempt ${attempts} failed:`, authError);
        if (attempts < maxAttempts) {
          console.log('[Vercel Seed] Waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Failed to connect to database after ${maxAttempts} attempts: ${authError.message}`);
        }
      }
    }
    
    // Ensure the admins table exists
    try {
      console.log('[Vercel Seed] Checking if admins table exists...');
      await sequelize.query('SELECT 1 FROM admins LIMIT 1');
      console.log('[Vercel Seed] Admins table exists');
    } catch (tableErr) {
      console.log('[Vercel Seed] Admins table might not exist, attempting to create/sync');
      try {
        await Admin.sync({ force: false });
        console.log('[Vercel Seed] Admin model synced successfully');
      } catch (syncErr) {
        console.error('[Vercel Seed] Error syncing Admin model:', syncErr);
        throw syncErr;
      }
    }

    // Super admin credentials (default)
    const superAdminUsername = 'superadmin';
    const superAdminEmail = 'superadmin@coworks.example.com';
    const superAdminPassword = 'CoWorks@SuperAdmin2023';
    
    // Check if super admin already exists
    let existingSuperAdmin;
    try {
      console.log('[Vercel Seed] Checking if super admin already exists...');
      existingSuperAdmin = await Admin.findOne({
        where: {
          [Op.or]: [
            { username: superAdminUsername },
            { email: superAdminEmail }
          ]
        }
      });
    } catch (findErr) {
      console.error('[Vercel Seed] Error checking for existing super admin:', findErr);
      // Continue to create admin even if check fails
    }

    if (existingSuperAdmin) {
      console.log('[Vercel Seed] Super admin already exists, no need to create a new one.');
      console.log(`[Vercel Seed] Existing super admin ID: ${existingSuperAdmin.id}, username: ${existingSuperAdmin.username}`);
      await sequelize.close();
      return;
    }

    console.log('[Vercel Seed] No existing super admin found, creating one now...');

    // Hash the password
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(superAdminPassword, salt);

      console.log('[Vercel Seed] Password hashed successfully');
      console.log('[Vercel Seed] Attempting to create super admin user');
      
      // Create the super admin
      const superAdmin = await Admin.create({
        username: superAdminUsername,
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log(`[Vercel Seed] Super admin created successfully with ID: ${superAdmin.id}`);
      console.log('[Vercel Seed] Use the following credentials to log in:');
      console.log(`Username: ${superAdminUsername}`);
      console.log(`Password: ${superAdminPassword}`);
    } catch (createError) {
      console.error('[Vercel Seed] Error creating super admin:', createError);
      throw createError;
    }

    // Close the database connection
    await sequelize.close();
    console.log('[Vercel Seed] Database connection closed');
  } catch (error) {
    console.error('[Vercel Seed] Error seeding super admin:', error);
    
    // Try to close the connection if it's open
    try {
      if (sequelize) await sequelize.close();
    } catch (closeErr) {
      console.error('[Vercel Seed] Error closing database connection:', closeErr);
    }
    
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin().then(() => {
  console.log('[Vercel Seed] Seed process completed successfully');
}).catch(err => {
  console.error('[Vercel Seed] Fatal error during seeding:', err);
  process.exit(1);
}); 