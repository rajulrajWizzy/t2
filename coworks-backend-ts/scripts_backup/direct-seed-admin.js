/**
 * Direct script to seed a super admin user
 * This script can be run manually to ensure a super admin exists
 */

const bcrypt = require('bcryptjs');
const { Sequelize, Op } = require('sequelize');
require('dotenv').config();

console.log('[Direct Seed] Starting direct super admin seed process');
console.log('[Direct Seed] Environment:', process.env.NODE_ENV);

// Database connection parameters handling
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[Direct Seed] ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('[Direct Seed] Database URL available (not showing for security)');

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
    logging: msg => console.log('[DB]', msg)
  });
  console.log('[Direct Seed] Sequelize instance created');
} catch (err) {
  console.error('[Direct Seed] Failed to create Sequelize instance:', err);
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
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password) {
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(admin.password, salt);
      }
    }
  }
});

async function directSeedSuperAdmin() {
  try {
    console.log('[Direct Seed] Attempting to connect to database...');
    await sequelize.authenticate();
    console.log('[Direct Seed] Database connection has been established successfully.');
    
    // Ensure the admins table exists
    try {
      console.log('[Direct Seed] Checking if admins table exists...');
      await sequelize.query('SELECT 1 FROM admins LIMIT 1');
      console.log('[Direct Seed] Admins table exists');
    } catch (tableErr) {
      console.log('[Direct Seed] Creating admins table...');
      await Admin.sync({ force: false });
      console.log('[Direct Seed] Admin model synced successfully');
    }

    // Super admin credentials (default)
    const superAdminUsername = 'superadmin';
    const superAdminEmail = 'superadmin@coworks.example.com';
    const superAdminPassword = 'CoWorks@SuperAdmin2023';
    
    // Check if super admin already exists
    console.log('[Direct Seed] Checking if super admin already exists...');
    const existingSuperAdmin = await Admin.findOne({
      where: {
        [Op.or]: [
          { username: superAdminUsername },
          { email: superAdminEmail }
        ]
      }
    });

    if (existingSuperAdmin) {
      console.log('[Direct Seed] Super admin already exists, no need to create a new one.');
      console.log(`[Direct Seed] Existing super admin ID: ${existingSuperAdmin.id}, username: ${existingSuperAdmin.username}`);
      
      // Update password for existing admin
      console.log('[Direct Seed] Updating existing super admin password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(superAdminPassword, salt);
      await existingSuperAdmin.update({ 
        password: hashedPassword,
        updated_at: new Date()
      });
      console.log('[Direct Seed] Super admin password updated successfully');
    } else {
      console.log('[Direct Seed] No existing super admin found, creating one now...');
      
      // Create the super admin directly (hashing handled by hooks)
      const superAdmin = await Admin.create({
        username: superAdminUsername,
        email: superAdminEmail,
        password: superAdminPassword,
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true
      });

      console.log(`[Direct Seed] Super admin created successfully with ID: ${superAdmin.id}`);
    }
    
    console.log('[Direct Seed] Use the following credentials to log in:');
    console.log(`Username: ${superAdminUsername}`);
    console.log(`Password: ${superAdminPassword}`);

    // Close the database connection
    await sequelize.close();
    console.log('[Direct Seed] Database connection closed');
    console.log('[Direct Seed] Process completed successfully');
    
  } catch (error) {
    console.error('[Direct Seed] Error in seeding process:', error);
    
    // Try to close the connection if it's open
    try {
      if (sequelize) await sequelize.close();
    } catch (closeErr) {
      console.error('[Direct Seed] Error closing database connection:', closeErr);
    }
    
    process.exit(1);
  }
}

// Run the seed function
directSeedSuperAdmin(); 