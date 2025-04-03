/**
 * Script to fix the seat_code column in the seats table
 * 
 * This script:
 * 1. Checks if the seats table exists
 * 2. Adds the seat_code column if it doesn't exist
 * 3. Populates it with generated values
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get database configuration from environment variables
const DB_NAME = process.env.DB_NAME || 'coworks_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS === '""' ? '' : (process.env.DB_PASS || '');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
const DB_SSL = process.env.DB_SSL === 'true';

console.log('Fix Seat Code Script');
console.log('=====================');
console.log(`Database: ${DB_NAME}`);
console.log(`Schema: ${DB_SCHEMA}`);
console.log(`Host: ${DB_HOST}:${DB_PORT}`);
console.log(`User: ${DB_USER}`);
console.log(`SSL: ${DB_SSL ? 'Enabled' : 'Disabled'}`);
console.log('=====================\n');

// Create a Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: DB_SSL ? {
      require: true,
      rejectUnauthorized: false
    } : undefined
  }
});

// Main function
async function fixSeatCode() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');
    
    // Check if the seats table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${DB_SCHEMA}'
        AND table_name = 'seats'
      );
    `);
    
    const exists = tableExists[0]?.exists || false;
    console.log(`Seats table exists: ${exists}`);
    
    if (exists) {
      // Check if the seat_code column already exists
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${DB_SCHEMA}'
          AND table_name = 'seats'
          AND column_name = 'seat_code'
        );
      `);
      
      const hasColumn = columnExists[0]?.exists || false;
      
      if (!hasColumn) {
        console.log('Adding seat_code column to seats table');
        await sequelize.query(`
          ALTER TABLE "${DB_SCHEMA}"."seats"
          ADD COLUMN "seat_code" VARCHAR(50) NULL;
        `);
        
        // Update existing records to generate seat_code from their ID and seat_number
        console.log('Updating existing seats with generated seat_code values');
        await sequelize.query(`
          UPDATE "${DB_SCHEMA}"."seats"
          SET "seat_code" = CONCAT('SEAT', LPAD(id::text, 4, '0'))
          WHERE "seat_code" IS NULL;
        `);
        
        console.log('✅ seat_code column added and populated successfully');
      } else {
        console.log('✅ seat_code column already exists');
        
        // Check for null seat_code values
        const [nullCodes] = await sequelize.query(`
          SELECT COUNT(*) as count FROM "${DB_SCHEMA}"."seats"
          WHERE "seat_code" IS NULL;
        `);
        
        const nullCount = parseInt(nullCodes[0].count);
        
        if (nullCount > 0) {
          console.log(`Found ${nullCount} seats with NULL seat_code, updating...`);
          await sequelize.query(`
            UPDATE "${DB_SCHEMA}"."seats"
            SET "seat_code" = CONCAT('SEAT', LPAD(id::text, 4, '0'))
            WHERE "seat_code" IS NULL;
          `);
          console.log('✅ Updated seats with NULL seat_code values');
        } else {
          console.log('✅ All seats have valid seat_code values');
        }
      }
    } else {
      console.log('Seats table does not exist, nothing to modify');
    }
    
    console.log('\n🎉 Database update completed successfully!\n');
  } catch (error) {
    console.error('❌ Database update failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
fixSeatCode(); 