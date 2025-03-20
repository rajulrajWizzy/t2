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

// Standard seating type mapping
const seatingTypeShortCodes = {
  'HOT_DESK': 'HD',
  'DEDICATED_DESK': 'DD',
  'CUBICLE': 'CB',
  'CUBICLE_3': 'CB3',
  'CUBICLE_4': 'CB4',
  'CUBICLE_6': 'CB6',
  'CUBICLE_10': 'CB10',
  'MEETING_ROOM': 'MR',
  'DAILY_PASS': 'DP'
};

async function updateSeatingTypeShortCodes() {
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
        WHERE name = 'update_seating_type_short_codes'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for updating seating type short codes has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Add cubicle variations if they don't exist
    const existingTypes = await sequelize.query(`
      SELECT name FROM "${dbSchema}"."seating_types";
    `, { type: Sequelize.QueryTypes.SELECT });
    
    const existingNames = existingTypes.map(type => type.name);
    
    // Add cubicle variations if they don't exist
    if (!existingNames.includes('CUBICLE_3')) {
      console.log('Adding CUBICLE_3 seating type');
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."seating_types" (name, short_code, hourly_rate, is_hourly, created_at, updated_at)
        VALUES ('CUBICLE_3', 'CB3', 1500, false, NOW(), NOW());
      `);
    }
    
    if (!existingNames.includes('CUBICLE_4')) {
      console.log('Adding CUBICLE_4 seating type');
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."seating_types" (name, short_code, hourly_rate, is_hourly, created_at, updated_at)
        VALUES ('CUBICLE_4', 'CB4', 1800, false, NOW(), NOW());
      `);
    }
    
    if (!existingNames.includes('CUBICLE_6')) {
      console.log('Adding CUBICLE_6 seating type');
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."seating_types" (name, short_code, hourly_rate, is_hourly, created_at, updated_at)
        VALUES ('CUBICLE_6', 'CB6', 2500, false, NOW(), NOW());
      `);
    }
    
    if (!existingNames.includes('CUBICLE_10')) {
      console.log('Adding CUBICLE_10 seating type');
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."seating_types" (name, short_code, hourly_rate, is_hourly, created_at, updated_at)
        VALUES ('CUBICLE_10', 'CB10', 4000, false, NOW(), NOW());
      `);
    }

    // Update short codes for existing seating types
    for (const [typeName, shortCode] of Object.entries(seatingTypeShortCodes)) {
      await sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET short_code = '${shortCode}'
        WHERE name = '${typeName}';
      `);
      console.log(`Updated ${typeName} with short code: ${shortCode}`);
    }
    
    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('update_seating_type_short_codes', NOW());
    `);
    console.log('Recorded migration for seating type short code updates');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

updateSeatingTypeShortCodes(); 