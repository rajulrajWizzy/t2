// src/utils/migrations.js
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Run all database migrations
 */
async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    // Create connection to database
    const sequelize = getSequelizeInstance();
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Run all migrations in order
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating one...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    console.log('Looking for migrations in:', migrationsDir);
    
    try {
      // Get list of migration files
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.js'))
        .sort(); // Sort to ensure execution order
      
      console.log(`Found ${migrationFiles.length} migration files.`);
      
      // Execute each migration
      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const migration = require(path.join(migrationsDir, file));
        
        if (typeof migration.up === 'function') {
          await migration.up(sequelize.getQueryInterface(), sequelize);
          console.log(`Migration ${file} completed successfully.`);
        } else {
          console.warn(`Migration ${file} does not have an 'up' function. Skipping.`);
        }
      }
      
      await sequelize.close();
      console.log('All migrations completed successfully.');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
}

/**
 * Create Sequelize instance with proper configuration
 */
function getSequelizeInstance() {
  const dbSchema = process.env.DB_SCHEMA || 'public';
  
  // SSL configuration for production
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };
  
  let sequelize;
  
  // Check if DATABASE_URL exists (production)
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      schema: dbSchema,
      dialectOptions: {
        ssl: sslConfig
      }
    });
  } else {
    // Use individual credentials (local development)
    console.log('Using individual database credentials for connection');
    sequelize = new Sequelize(
      process.env.DB_NAME || 'coworks_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASS || '',
      {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
        schema: dbSchema
      }
    );
  }
  
  return sequelize;
}

module.exports = {
  runMigrations
}; 