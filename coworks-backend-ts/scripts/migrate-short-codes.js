const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';

// Create Sequelize instance
let sequelize;

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
    schema: dbSchema,
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
      schema: dbSchema,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
}

async function migrateShortCodes() {
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
        WHERE name = 'short_codes'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for short codes has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Add short_code column to seating_types table
    await sequelize.query(`
      ALTER TABLE "${dbSchema}"."seating_types"
      ADD COLUMN IF NOT EXISTS short_code VARCHAR(10) UNIQUE;
    `);
    console.log('Added short_code column to seating_types table');

    // Update short codes for seating types
    await sequelize.query(`
      UPDATE "${dbSchema}"."seating_types"
      SET short_code = 
        CASE name 
          WHEN 'HOT_DESK' THEN 'hot'
          WHEN 'DEDICATED_DESK' THEN 'ded'
          WHEN 'CUBICLE' THEN 'cub'
          WHEN 'MEETING_ROOM' THEN 'meet'
          WHEN 'DAILY_PASS' THEN 'day'
          ELSE short_code
        END;
    `);
    console.log('Updated short codes for seating types');

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('short_codes', NOW());
    `);
    console.log('Recorded migration for short codes');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrateShortCodes(); 