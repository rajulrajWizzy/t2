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

    // 1. Add code column to seating_types if it doesn't exist
    await sequelize.query(`
      ALTER TABLE "${dbSchema}"."seating_types"
      ADD COLUMN IF NOT EXISTS code VARCHAR(10) NOT NULL DEFAULT '';
    `);
    console.log('Added code column to seating_types table');
    
    // 2. Add code column to branches if it doesn't exist
    await sequelize.query(`
      ALTER TABLE "${dbSchema}"."branches"
      ADD COLUMN IF NOT EXISTS code VARCHAR(10) NOT NULL DEFAULT '';
    `);
    console.log('Added code column to branches table');
    
    // 3. Update seating type names and codes
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
          END,
        code = 
          CASE 
            WHEN name = 'HOT_DESK' THEN 'hot'
            WHEN name = 'DEDICATED_DESK' THEN 'ded'
            WHEN name = 'CUBICLE' THEN 'cub'
            WHEN name = 'MEETING_ROOM' THEN 'meet'
            WHEN name = 'DAILY_PASS' THEN 'day'
            ELSE ''
          END
    `);
    console.log('Updated seating type names and added codes');
    
    // 4. Update branch codes based on their names
    await sequelize.query(`
      UPDATE "${dbSchema}"."branches"
      SET code = SUBSTRING(UPPER(name), 1, 3)
      WHERE code = '';
    `);
    console.log('Updated branch codes');
    
    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('add_codes_and_update_names', NOW());
    `);
    console.log('Recorded migration for codes and names');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateCodesAndNames();