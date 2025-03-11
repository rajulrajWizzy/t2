// scripts/add-reset-token.js
// Run this script with: node scripts/add-reset-token.js
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

// Function to check if a column exists in a table
async function columnExists(tableName, columnName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}'
        AND table_name = '${tableName}'
        AND column_name = '${columnName}'
      );
    `;
    const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
    return false;
  }
}

// Function to record a migration
async function recordMigration(name) {
  try {
    // Create migration tracking table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sequelize.query(
      `INSERT INTO "${dbSchema}"."migrations" (name) VALUES ('${name}');`
    );
    console.log(`Recorded migration: ${name}`);
  } catch (error) {
    console.error(`Error recording migration ${name}:`, error);
  }
}

async function addResetTokenColumns() {
  const transaction = await sequelize.transaction();

  try {
    // Set search path
    await sequelize.query(`SET search_path TO "${dbSchema}";`, { transaction });
    
    // Check if company_name column exists
    const companyNameExists = await columnExists('customers', 'company_name');
    if (!companyNameExists) {
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers" 
        ADD COLUMN company_name VARCHAR(255) NULL;
      `, { transaction });
      console.log('Added company_name column to customers table');
    } else {
      console.log('company_name column already exists');
    }
    
    // Check if reset_token column exists
    const resetTokenExists = await columnExists('customers', 'reset_token');
    if (!resetTokenExists) {
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers" 
        ADD COLUMN reset_token VARCHAR(255) NULL;
      `, { transaction });
      console.log('Added reset_token column to customers table');
    } else {
      console.log('reset_token column already exists');
    }
    
    // Check if reset_token_expires column exists
    const resetTokenExpiresExists = await columnExists('customers', 'reset_token_expires');
    if (!resetTokenExpiresExists) {
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers" 
        ADD COLUMN reset_token_expires TIMESTAMP WITH TIME ZONE NULL;
      `, { transaction });
      console.log('Added reset_token_expires column to customers table');
    } else {
      console.log('reset_token_expires column already exists');
    }

    // Record the migration
    await recordMigration('add_reset_token_columns');

    await transaction.commit();
    console.log('Migration completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in migration:', error);
    throw error;
  }
}

// Run the migration
async function runMigration() {
  try {
    // Test connection first
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    console.log('Running migration to add reset token columns...');
    await addResetTokenColumns();
    console.log('Migration process completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();