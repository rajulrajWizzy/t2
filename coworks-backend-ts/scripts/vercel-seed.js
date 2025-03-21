/**
 * Vercel deployment script to seed a super admin user
 * This script is designed to be run during Vercel deployment
 */

const bcrypt = require('bcryptjs');
const { Sequelize, Op } = require('sequelize');
require('dotenv').config();

console.log('[Vercel Seed] Starting super admin seed process');
console.log('[Vercel Seed] Node env:', process.env.NODE_ENV);
console.log('[Vercel Seed] Database URL exists:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('[Vercel Seed] DATABASE_URL environment variable is not set!');
  // Don't exit with error - allow build to continue
  process.exit(0);
}

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
  // Don't exit with error - allow build to continue
  process.exit(0);
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
  }
}, {
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function seedSuperAdmin() {
  const timeout = setTimeout(() => {
    console.error('[Vercel Seed] Operation timed out after 30 seconds');
    // Don't exit with error - allow build to continue
    process.exit(0);
  }, 30000); // 30 seconds timeout
  
  try {
    // Try to connect to the database
    await sequelize.authenticate();
    console.log('[Vercel Seed] Database connection has been established successfully.');
    
    // Ensure the admins table exists
    try {
      await sequelize.query('SELECT 1 FROM admins LIMIT 1');
      console.log('[Vercel Seed] Admins table exists');
    } catch (tableErr) {
      console.log('[Vercel Seed] Admins table might not exist, attempting to create/sync');
      try {
        await Admin.sync();
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
    try {
      const existingSuperAdmin = await Admin.findOne({
        where: {
          [Op.or]: [
            { username: superAdminUsername },
            { email: superAdminEmail }
          ]
        }
      });

      if (existingSuperAdmin) {
        console.log('[Vercel Seed] Super admin already exists, no need to create a new one.');
        await sequelize.close();
        clearTimeout(timeout);
        return;
      }
    } catch (findErr) {
      console.error('[Vercel Seed] Error checking for existing super admin:', findErr);
      // Continue to create admin even if check fails
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(superAdminPassword, salt);

    console.log('[Vercel Seed] Attempting to create super admin user');
    
    // Create the super admin
    const superAdmin = await Admin.create({
      username: superAdminUsername,
      email: superAdminEmail,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      is_active: true
    });

    console.log(`[Vercel Seed] Super admin created successfully with ID: ${superAdmin.id}`);
    console.log('[Vercel Seed] Use the following credentials to log in:');
    console.log(`Username: ${superAdminUsername}`);
    console.log(`Password: ${superAdminPassword}`);

    // Close the database connection
    await sequelize.close();
    console.log('[Vercel Seed] Database connection closed');
    clearTimeout(timeout);
  } catch (error) {
    console.error('[Vercel Seed] Error seeding super admin:', error);
    
    // Try to close the connection if it's open
    try {
      if (sequelize) await sequelize.close();
    } catch (closeErr) {
      console.error('[Vercel Seed] Error closing database connection:', closeErr);
    }
    
    clearTimeout(timeout);
    // Don't exit with error - allow build to continue
    process.exit(0);
  }
}

// Run the seed function
seedSuperAdmin().catch(err => {
  console.error('[Vercel Seed] Fatal error during seeding:', err);
  // Don't exit with error - allow build to continue
  process.exit(0);
}); 