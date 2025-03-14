// scripts/smart-seed.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const seatingTypes = require('../src/utils/seeders/seatingTypes').default;
const branches = require('../src/utils/seeders/branches').default;

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

async function smartSeed() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);

    // First, seed the seating types
    console.log('Starting seating types seed...');
    
    // Check if seating types table exists and has data
    const seatingTypesExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'seating_types'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (seatingTypesExist[0].exists) {
      const seatingTypesCount = await sequelize.query(`
        SELECT COUNT(*) FROM "${dbSchema}"."seating_types";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (parseInt(seatingTypesCount[0].count) === 0) {
        // Table exists but is empty, seed seating types
        for (const seatingType of seatingTypes) {
          await sequelize.query(`
            INSERT INTO "${dbSchema}"."seating_types" 
            (name, code, display_name, description, hourly_rate, is_hourly, min_booking_duration, min_seats, created_at, updated_at)
            VALUES 
            (:name, :code, :display_name, :description, :hourly_rate, :is_hourly, :min_booking_duration, :min_seats, NOW(), NOW());
          `, { 
            replacements: seatingType,
            type: Sequelize.QueryTypes.INSERT 
          });
        }
        console.log('Seating types seeded successfully.');
      } else {
        console.log('Seating types table already has data. Skipping seeding.');
      }
    } else {
      console.log('Seating types table does not exist. Run migrations first.');
    }
    
    // Then, seed the branches after seating types are set up
    console.log('Starting branches seed...');
    
    // Check if branches table exists and has data
    const branchesExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'branches'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (branchesExist[0].exists) {
      const branchesCount = await sequelize.query(`
        SELECT COUNT(*) FROM "${dbSchema}"."branches";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (parseInt(branchesCount[0].count) === 0) {
        // Table exists but is empty, seed branches
        for (const branch of branches) {
          await sequelize.query(`
            INSERT INTO "${dbSchema}"."branches" 
            (name, code, address, city, state, country, postal_code, phone, email, capacity, operating_hours, is_active, created_at, updated_at)
            VALUES 
            (:name, :code, :address, :city, :state, :country, :postal_code, :phone, :email, :capacity, :operating_hours, :is_active, NOW(), NOW());
          `, { 
            replacements: branch,
            type: Sequelize.QueryTypes.INSERT 
          });
        }
        console.log('Branches seeded successfully.');
      } else {
        console.log('Branches table already has data. Skipping seeding.');
      }
    } else {
      console.log('Branches table does not exist. Run migrations first.');
    }

    console.log('Smart seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in smart seeding:', error);
    process.exit(1);
  }
}

smartSeed();