// scripts/migrate-branch-structure.js
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

async function migrateBranchStructure() {
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
        WHERE name = 'update_branch_structure'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for branch structure has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if branches table exists
    const branchesExist = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'branches'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!branchesExist[0].exists) {
      console.log('Branches table does not exist. Run migrations first.');
      process.exit(0);
      return;
    }

    // Add new columns to branches table
    const columnsToAdd = [
      { name: 'location', type: 'VARCHAR(255)', constraints: 'NULL' },
      { name: 'latitude', type: 'FLOAT', constraints: 'NOT NULL DEFAULT 0' },
      { name: 'longitude', type: 'FLOAT', constraints: 'NOT NULL DEFAULT 0' },
      { name: 'cost_multiplier', type: 'FLOAT', constraints: 'NOT NULL DEFAULT 1.0' },
      { name: 'opening_time', type: 'TIME', constraints: "NOT NULL DEFAULT '08:00:00'" },
      { name: 'closing_time', type: 'TIME', constraints: "NOT NULL DEFAULT '22:00:00'" }
    ];

    // Check which columns already exist
    for (const column of columnsToAdd) {
      const columnExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}' 
          AND table_name = 'branches' 
          AND column_name = '${column.name}'
        );
      `, { type: Sequelize.QueryTypes.SELECT });

      if (!columnExists[0].exists) {
        // Add the column
        await sequelize.query(`
          ALTER TABLE "${dbSchema}"."branches" 
          ADD COLUMN ${column.name} ${column.type} ${column.constraints};
        `);
        console.log(`Added ${column.name} column to branches table`);
      } else {
        console.log(`Column ${column.name} already exists in branches table`);
      }
    }

    // Make some columns nullable
    const columnsToMakeNullable = [
      'city', 'state', 'country', 'postal_code', 'phone', 'email', 'capacity'
    ];

    for (const column of columnsToMakeNullable) {
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches" 
        ALTER COLUMN ${column} DROP NOT NULL;
      `);
      console.log(`Made ${column} column nullable`);
    }

    // Update operating_hours column to opening_time and closing_time if needed
    const operatingHoursExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'branches' 
        AND column_name = 'operating_hours'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (operatingHoursExists[0].exists) {
      // Drop operating_hours column as it's replaced by opening_time and closing_time
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches" 
        DROP COLUMN IF EXISTS operating_hours;
      `);
      console.log('Dropped operating_hours column from branches table');
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('update_branch_structure', NOW());
    `);
    console.log('Recorded migration for branch structure');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

migrateBranchStructure();