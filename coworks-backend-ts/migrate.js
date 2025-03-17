// migrate.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

// Function to check if a type exists
async function typeExists(transaction, typeName) {
  const result = await sequelize.query(`
    SELECT 1 FROM pg_type 
    WHERE typname = '${typeName}'
  `, { transaction });
  
  return result[0].length > 0;
}

// Function to check if a column exists in a table
async function columnExists(transaction, tableName, columnName) {
  const result = await sequelize.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '${tableName}' AND column_name = '${columnName}'
  `, { transaction });
  
  return result[0].length > 0;
}

// Migration Up Function
async function up() {
  const transaction = await sequelize.transaction();

  try {
    // Create branches table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        cost_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
        opening_time TIME NOT NULL DEFAULT '08:00:00',
        closing_time TIME NOT NULL DEFAULT '22:00:00',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        images JSONB,
        amenities JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Add short_code column to branches table if it doesn't exist
    const branchShortCodeExists = await columnExists(transaction, 'branches', 'short_code');
    if (!branchShortCodeExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN short_code VARCHAR(10) UNIQUE;
      `, { transaction });
      
      console.log('Added short_code column to branches table');
    }

    // Add images column to branches table if it doesn't exist
    const branchImagesExists = await columnExists(transaction, 'branches', 'images');
    if (!branchImagesExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN images JSONB;
      `, { transaction });
      
      console.log('Added images column to branches table');
    }

    // Add amenities column to branches table if it doesn't exist
    const branchAmenitiesExists = await columnExists(transaction, 'branches', 'amenities');
    if (!branchAmenitiesExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN amenities JSONB;
      `, { transaction });
      
      console.log('Added amenities column to branches table');
    }

    // Create customers table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        profile_picture VARCHAR(255),
        company_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Add profile_picture column to customers table if it doesn't exist
    const profilePictureExists = await columnExists(transaction, 'customers', 'profile_picture');
    if (!profilePictureExists) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN profile_picture VARCHAR(255);
      `, { transaction });
      
      console.log('Added profile_picture column to customers table');
    }

    // Add company_name column to customers table if it doesn't exist
    const companyNameExists = await columnExists(transaction, 'customers', 'company_name');
    if (!companyNameExists) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN company_name VARCHAR(255);
      `, { transaction });
      
      console.log('Added company_name column to customers table');
    }

    await transaction.commit();
    console.log('All tables and columns created successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in migration:', error);
    throw error;
  }
}

// Runner Function
async function runMigrations() {
  try {
    // Test connection first
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    console.log('Running migrations...');
    await up();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations(); 