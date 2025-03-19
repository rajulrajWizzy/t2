// scripts/migrate-branch-fields.js
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

async function migrateBranchFields() {
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
        WHERE name = 'branch_images_amenities'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for branch images and amenities has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if columns already exist
    const columnsExist = await sequelize.query(`
      SELECT 
        COUNT(*) as count
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = '${dbSchema}' 
        AND table_name = 'branches' 
        AND column_name IN ('images', 'amenities');
    `, { type: Sequelize.QueryTypes.SELECT });

    if (parseInt(columnsExist[0].count) === 2) {
      console.log('Columns already exist in the branches table. Recording migration...');
    } else {
      // Add new columns to branches table
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches"
        ADD COLUMN IF NOT EXISTS images JSONB,
        ADD COLUMN IF NOT EXISTS amenities JSONB;
      `);
      console.log('Added images and amenities columns to branches table');
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('branch_images_amenities', NOW());
    `);
    console.log('Recorded migration for branch images and amenities');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateBranchFields();