// scripts/migrate-seating-types.js
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

async function migrateSeatingTypes() {
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
        WHERE name = 'seating_types_min_seats'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for seating types min_seats has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if table exists
    const tableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'seating_types'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!tableExists[0].exists) {
      console.log('Seating types table does not exist. Please run migrations first.');
      process.exit(1);
      return;
    }

    // Check if min_seats column already exists
    const columnExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'seating_types'
        AND column_name = 'min_seats'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!columnExists[0].exists) {
      // Add min_seats column if it doesn't exist
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."seating_types"
        ADD COLUMN min_seats INTEGER NOT NULL DEFAULT 1;
      `);
      console.log('Added min_seats column to seating_types table');
    } else {
      console.log('min_seats column already exists in seating_types table');
    }
    
    // Update values for seating types without deleting/recreating them
    await sequelize.query(`
      UPDATE "${dbSchema}"."seating_types"
      SET 
        min_booking_duration = 
          CASE name 
            WHEN 'HOT_DESK' THEN 60
            WHEN 'Hot Desk' THEN 60
            WHEN 'DEDICATED_DESK' THEN 90
            WHEN 'Dedicated Desk' THEN 90
            WHEN 'CUBICLE' THEN 90
            WHEN 'Cubicle' THEN 90
            WHEN 'MEETING_ROOM' THEN 2
            WHEN 'Meeting Room' THEN 2
            WHEN 'DAILY_PASS' THEN 1
            WHEN 'Daily Pass' THEN 1
            ELSE min_booking_duration
          END,
        is_hourly = 
          CASE name 
            WHEN 'HOT_DESK' THEN false
            WHEN 'Hot Desk' THEN false
            WHEN 'DEDICATED_DESK' THEN false
            WHEN 'Dedicated Desk' THEN false
            WHEN 'CUBICLE' THEN false
            WHEN 'Cubicle' THEN false
            WHEN 'MEETING_ROOM' THEN true
            WHEN 'Meeting Room' THEN true
            WHEN 'DAILY_PASS' THEN false
            WHEN 'Daily Pass' THEN false
            ELSE is_hourly
          END,
        min_seats = 
          CASE name 
            WHEN 'HOT_DESK' THEN 1
            WHEN 'Hot Desk' THEN 1
            WHEN 'DEDICATED_DESK' THEN 10
            WHEN 'Dedicated Desk' THEN 10
            WHEN 'CUBICLE' THEN 1
            WHEN 'Cubicle' THEN 1
            WHEN 'MEETING_ROOM' THEN 1
            WHEN 'Meeting Room' THEN 1
            WHEN 'DAILY_PASS' THEN 1
            WHEN 'Daily Pass' THEN 1
            ELSE 1
          END,
        description = 
          CASE name 
            WHEN 'HOT_DESK' THEN 'Flexible desk space with minimum 2-month commitment'
            WHEN 'Hot Desk' THEN 'Flexible desk space with minimum 2-month commitment'
            WHEN 'DEDICATED_DESK' THEN 'Permanently assigned desk with minimum 3-month commitment and 10-seat minimum'
            WHEN 'Dedicated Desk' THEN 'Permanently assigned desk with minimum 3-month commitment and 10-seat minimum'
            WHEN 'CUBICLE' THEN 'Semi-private workspace with minimum 3-month commitment'
            WHEN 'Cubicle' THEN 'Semi-private workspace with minimum 3-month commitment'
            WHEN 'MEETING_ROOM' THEN 'Private room for meetings and conferences'
            WHEN 'Meeting Room' THEN 'Private room for meetings and conferences'
            WHEN 'DAILY_PASS' THEN 'Full day access to hot desk spaces based on availability'
            WHEN 'Daily Pass' THEN 'Full day access to hot desk spaces based on availability'
            ELSE description
          END
    `);
    console.log('Updated seating types configurations');

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('seating_types_min_seats', NOW());
    `);
    console.log('Recorded migration for seating types min_seats');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateSeatingTypes();