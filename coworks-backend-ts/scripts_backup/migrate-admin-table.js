const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database connection parameters
const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Better error handling for connection
function createConnection() {
  try {
    // Check if DATABASE_URL exists (Vercel/Production)
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
      return new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false, // Reduce noise in logs
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      });
    } else {
      // Fallback to individual credentials (local development)
      console.log('Using individual credentials for connection');
      return new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
          host: process.env.DB_HOST || 'localhost',
          dialect: 'postgres',
          logging: false, // Reduce noise in logs
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        }
      );
    }
  } catch (error) {
    console.error('Error creating database connection:', error);
    process.exit(1);
  }
}

// Initialize connection
sequelize = createConnection();

// Check if a table exists
async function tableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = '${tableName}'
      );
    `;
    const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

async function migrateAdminTable() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    // Check if migration has already been applied
    const migrationExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM "${dbSchema}"."migrations" 
        WHERE name = 'admin_table_fix'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for admin table fix has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // First check if admin_users table exists (the old table name used in migrations)
    const adminUsersExists = await tableExists('admin_users');
    
    // Check if admins table exists (new table name used in model)
    const adminsExists = await tableExists('admins');

    // If admins table doesn't exist but admin_users does, we need to create admins as a view of admin_users
    if (!adminsExists && adminUsersExists) {
      console.log('Creating admins table from admin_users...');
      
      // Option 1: Create a view (read-only)
      // await sequelize.query(`
      //   CREATE OR REPLACE VIEW "${dbSchema}"."admins" AS
      //   SELECT * FROM "${dbSchema}"."admin_users";
      // `);
      
      // Option 2: Create a new table and copy data (better for write operations)
      console.log('Creating new admins table with data from admin_users');
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          profile_image VARCHAR(255),
          role VARCHAR(255) NOT NULL DEFAULT 'branch_admin',
          branch_id INTEGER,
          permissions JSONB,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create indexes for faster queries
      await sequelize.query(`
        CREATE INDEX idx_admins_username ON "${dbSchema}"."admins" (username);
        CREATE INDEX idx_admins_email ON "${dbSchema}"."admins" (email);
        CREATE INDEX idx_admins_role ON "${dbSchema}"."admins" (role);
        CREATE INDEX idx_admins_branch_id ON "${dbSchema}"."admins" (branch_id);
      `);
      
      // Copy data if admin_users exists
      if (adminUsersExists) {
        console.log('Copying data from admin_users to admins');
        await sequelize.query(`
          INSERT INTO "${dbSchema}"."admins" (
            id, username, email, password, name, role, branch_id, is_active, 
            last_login, profile_image, created_at, updated_at
          )
          SELECT 
            id, username, email, password, name, role, branch_id, is_active,
            last_login, profile_picture, created_at, updated_at
          FROM "${dbSchema}"."admin_users";
        `);
      } else {
        console.log('No admin_users table found, creating default super admin');
        // Create a default super admin
        await sequelize.query(`
          INSERT INTO "${dbSchema}"."admins" (
            username, email, password, name, role, is_active,
            created_at, updated_at
          )
          VALUES (
            'superadmin', 
            'admin@coworks.com', 
            '$2b$10$OMUZjWLfF05YqIZH7/XY9.t0FrSoYvOGNP6rrX9yDEIR5yCHx1.Ly', 
            'Super Admin', 
            'super_admin', 
            TRUE,
            NOW(), 
            NOW()
          );
        `);
      }
    } else if (!adminsExists) {
      console.log('Creating new admins table from scratch');
      // Create the admins table if neither table exists
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          profile_image VARCHAR(255),
          role VARCHAR(255) NOT NULL DEFAULT 'branch_admin',
          branch_id INTEGER,
          permissions JSONB,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_admins_username ON "${dbSchema}"."admins" (username);
        CREATE INDEX idx_admins_email ON "${dbSchema}"."admins" (email);
        CREATE INDEX idx_admins_role ON "${dbSchema}"."admins" (role);
        CREATE INDEX idx_admins_branch_id ON "${dbSchema}"."admins" (branch_id);
        
        -- Create default super admin
        INSERT INTO "${dbSchema}"."admins" (
          username, email, password, name, role, is_active,
          created_at, updated_at
        )
        VALUES (
          'superadmin', 
          'admin@coworks.com', 
          '$2b$10$OMUZjWLfF05YqIZH7/XY9.t0FrSoYvOGNP6rrX9yDEIR5yCHx1.Ly', 
          'Super Admin', 
          'super_admin', 
          TRUE,
          NOW(), 
          NOW()
        );
      `);
    } else {
      console.log('Admins table already exists, no action needed.');
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('admin_table_fix', NOW());
    `);
    console.log('Recorded migration for admin table fix');

    console.log('Migration completed successfully.');
    
    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
    process.exit(1);
  }
}

// Run the migration
migrateAdminTable(); 