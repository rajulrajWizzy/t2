// scripts/seed-seating-types.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const seatingTypes = require('../src/utils/seeders/seatingTypes').default;

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

async function seedSeatingTypes() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);

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

    // Check if we have data already
    const existingTypes = await sequelize.query(`
      SELECT id, name FROM "${dbSchema}"."seating_types";
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`Found ${existingTypes.length} existing seating types.`);

    // If table is empty, insert new records
    if (existingTypes.length === 0) {
      console.log('No existing seating types found. Inserting new records...');
      for (const seatingType of seatingTypes) {
        await sequelize.query(`
          INSERT INTO "${dbSchema}"."seating_types" 
          (name, code, description, hourly_rate, is_hourly, min_booking_duration, min_seats, created_at, updated_at)
          VALUES 
          (:name, :code, :description, :hourly_rate, :is_hourly, :min_booking_duration, :min_seats, NOW(), NOW());
        `, { 
          replacements: seatingType,
          type: Sequelize.QueryTypes.INSERT 
        });
      }
      console.log('Seating types inserted successfully.');
    } else {
      // If table has data, update existing records (don't delete!)
      console.log('Updating existing seating types...');
      
      // Create a map of existing types by their current names
      const existingTypeMap = {};
      for (const type of existingTypes) {
        existingTypeMap[type.name] = type.id;
      }
      
      // Helper function to get the original enum name
      const getOriginalName = (friendlyName) => {
        switch(friendlyName) {
          case 'Hot Desk': return 'HOT_DESK';
          case 'Dedicated Desk': return 'DEDICATED_DESK';
          case 'Cubicle': return 'CUBICLE';
          case 'Meeting Room': return 'MEETING_ROOM';
          case 'Daily Pass': return 'DAILY_PASS';
          default: return friendlyName; // If it already has the old name format
        }
      };
      
      for (const seatingType of seatingTypes) {
        const originalName = getOriginalName(seatingType.name);
        
        // Check if we have this type already (by original name or new name)
        const typeId = existingTypeMap[originalName] || existingTypeMap[seatingType.name];
        
        if (typeId) {
          // Update existing record
          await sequelize.query(`
            UPDATE "${dbSchema}"."seating_types"
            SET 
              name = :name,
              code = :code,
              description = :description,
              hourly_rate = :hourly_rate,
              is_hourly = :is_hourly,
              min_booking_duration = :min_booking_duration,
              min_seats = :min_seats,
              updated_at = NOW()
            WHERE id = :id;
          `, {
            replacements: {
              ...seatingType,
              id: typeId
            },
            type: Sequelize.QueryTypes.UPDATE
          });
          console.log(`Updated seating type ID ${typeId} to ${seatingType.name}`);
        } else {
          // If not found, insert a new record
          await sequelize.query(`
            INSERT INTO "${dbSchema}"."seating_types" 
            (name, code, description, hourly_rate, is_hourly, min_booking_duration, min_seats, created_at, updated_at)
            VALUES 
            (:name, :code, :description, :hourly_rate, :is_hourly, :min_booking_duration, :min_seats, NOW(), NOW());
          `, { 
            replacements: seatingType,
            type: Sequelize.QueryTypes.INSERT 
          });
          console.log(`Inserted new seating type: ${seatingType.name}`);
        }
      }
      console.log('Seating types updated successfully.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding seating types:', error);
    process.exit(1);
  }
}

seedSeatingTypes();