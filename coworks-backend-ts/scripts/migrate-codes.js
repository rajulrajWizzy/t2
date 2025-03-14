// scripts/migrate-codes.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
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
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
}

async function migrateCodesAndNames() {
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
        WHERE name = 'add_codes_and_update_names'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for codes and names has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // First, check if tables exist
    const seatingTypesExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'seating_types'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    const branchesExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'branches'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    // 1. Check and add code column to seating_types if needed
    if (seatingTypesExist[0].exists) {
      // Check if the code column already exists
      const codeColumnExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'seating_types'
          AND column_name = 'code'
        );
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (!codeColumnExists[0].exists) {
        // Add code column if it doesn't exist
        await sequelize.query(`
          ALTER TABLE "${dbSchema}"."seating_types"
          ADD COLUMN code VARCHAR(10) NOT NULL DEFAULT '';
        `);
        console.log('Added code column to seating_types table');
        
        // Update seating type codes
        await sequelize.query(`
          UPDATE "${dbSchema}"."seating_types"
          SET code = 
            CASE 
              WHEN name = 'HOT_DESK' OR name = 'Hot Desk' THEN 'hot'
              WHEN name = 'DEDICATED_DESK' OR name = 'Dedicated Desk' THEN 'ded'
              WHEN name = 'CUBICLE' OR name = 'Cubicle' THEN 'cub'
              WHEN name = 'MEETING_ROOM' OR name = 'Meeting Room' THEN 'meet'
              WHEN name = 'DAILY_PASS' OR name = 'Daily Pass' THEN 'day'
              ELSE LOWER(SUBSTRING(name, 1, 3))
            END
        `);
        console.log('Updated seating type codes');
      } else {
        console.log('Code column already exists in seating_types table');
      }
      
      // Update seating type names (if they still have underscores)
      await sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET 
          name = 
            CASE 
              WHEN name = 'HOT_DESK' THEN 'Hot Desk'
              WHEN name = 'DEDICATED_DESK' THEN 'Dedicated Desk'
              WHEN name = 'CUBICLE' THEN 'Cubicle'
              WHEN name = 'MEETING_ROOM' THEN 'Meeting Room'
              WHEN name = 'DAILY_PASS' THEN 'Daily Pass'
              ELSE name
            END
        WHERE name IN ('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS')
      `);
      console.log('Updated seating type names');
    } else {
      console.log('Seating types table does not exist, skipping...');
    }
    
    // 2. Check and add code column to branches if needed
    if (branchesExist[0].exists) {
      // Check if the code column already exists
      const codeColumnExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'branches'
          AND column_name = 'code'
        );
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (!codeColumnExists[0].exists) {
        // Add code column if it doesn't exist
        await sequelize.query(`
          ALTER TABLE "${dbSchema}"."branches"
          ADD COLUMN code VARCHAR(10) NOT NULL DEFAULT '';
        `);
        console.log('Added code column to branches table');
        
        // Update branch codes
        await sequelize.query(`
          UPDATE "${dbSchema}"."branches"
          SET code = SUBSTRING(UPPER(name), 1, 3)
          WHERE code = '';
        `);
        console.log('Updated branch codes');
      } else {
        console.log('Code column already exists in branches table');
      }
    } else {
      console.log('Branches table does not exist, skipping...');
    }
    
    // Record the migration
    // Check if migrations table exists
    const migrationsExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'migrations'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationsExist[0].exists) {
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('add_codes_and_update_names', NOW());
      `);
      console.log('Recorded migration for codes and names');
    } else {
      console.log('Migrations table does not exist, cannot record migration');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateCodesAndNames();