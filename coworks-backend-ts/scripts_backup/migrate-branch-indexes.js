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
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    }
  );
}

async function migrateBranchIndexes() {
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
        WHERE name = 'branch_indexes'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for branch indexes has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if short_code column exists in branches table
    const shortCodeExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'branches'
        AND column_name = 'short_code'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!shortCodeExists[0].exists) {
      console.log('Adding short_code column to branches table first');
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches"
        ADD COLUMN IF NOT EXISTS short_code VARCHAR(10) UNIQUE;
      `);
    }

    // Create index on short_code if it doesn't exist
    // First check if index exists
    const shortCodeIndexExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = '${dbSchema}'
        AND tablename = 'branches'
        AND indexname = 'branches_short_code_idx'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!shortCodeIndexExists[0].exists) {
      console.log('Creating index on short_code in branches table');
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS branches_short_code_idx 
        ON "${dbSchema}"."branches" (short_code);
      `);
    } else {
      console.log('Index on short_code already exists');
    }

    // Create index on name for faster search
    const nameIndexExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = '${dbSchema}'
        AND tablename = 'branches'
        AND indexname = 'branches_name_idx'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!nameIndexExists[0].exists) {
      console.log('Creating index on name in branches table');
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS branches_name_idx 
        ON "${dbSchema}"."branches" (name);
      `);
    } else {
      console.log('Index on name already exists');
    }

    // Create index on location for faster search
    const locationIndexExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = '${dbSchema}'
        AND tablename = 'branches'
        AND indexname = 'branches_location_idx'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!locationIndexExists[0].exists) {
      console.log('Creating index on location in branches table');
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS branches_location_idx 
        ON "${dbSchema}"."branches" (location);
      `);
    } else {
      console.log('Index on location already exists');
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('branch_indexes', NOW());
    `);
    console.log('Recorded migration for branch indexes');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateBranchIndexes(); 