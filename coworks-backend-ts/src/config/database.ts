// src/config/database.ts
import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the schema from environment variables or set default
const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';
console.log(`Using database schema: ${dbSchema}`);

// Parse database credentials
const DB_NAME = process.env.DB_NAME || 'coworks_db';
const DB_USER = process.env.DB_USER || 'postgres';
// Better handling for empty password
const DB_PASS = process.env.DB_PASS === undefined ? '' : 
               (process.env.DB_PASS === '""' ? '' : process.env.DB_PASS);
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

// Log connection info (without password)
console.log(`Database connection: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
console.log(`Password is ${DB_PASS === '' ? 'empty' : 'set'}`);

// Retry configuration for connection attempts
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds between retries

// Create Sequelize instance
let sequelize: Sequelize;

// Fix for pg client to handle empty password
// This ensures that an empty password is explicitly set as an empty string
pg.defaults.parseInputDatesAsUTC = true;
if (DB_PASS === '') {
  console.log('Setting empty password for PostgreSQL client');
  // @ts-ignore - Direct modification to handle empty password case
  pg.types.setTypeParser = pg.types.setTypeParser || function() {};
}

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    retry: {
      max: MAX_RETRIES,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /SASL/
      ]
    }
  });
} else {
  // Fallback to individual credentials (local development)
  console.log('Using individual credentials for connection');
  
  // Connection options
  const options = {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres' as const,
    dialectModule: pg,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : undefined
    },
    retry: {
      max: MAX_RETRIES,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /SASL/
      ]
    }
  };
  
  // Create the Sequelize instance with null password handling
  sequelize = new Sequelize(
    DB_NAME, 
    DB_USER, 
    // Here's where we need to ensure the password is really a string
    typeof DB_PASS === 'string' ? DB_PASS : '', 
    options
  );
}

// Test the connection
async function testConnection(): Promise<void> {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      // Create schema if it doesn't exist
      await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
      console.log(`Ensured schema "${dbSchema}" exists.`);
      
      return;
    } catch (error: any) {
      retries++;
      console.error(`Database connection attempt ${retries}/${MAX_RETRIES} failed:`, error);
      
      if (error.message && error.message.includes('SASL')) {
        console.error('SASL authentication error detected:');
        console.error('- This is likely due to password format issues');
        console.error('- Check that DB_PASS in .env is properly set (empty value should be DB_PASS= with no quotes)');
        console.error('- Current password value type:', typeof DB_PASS);
      }
      
      if (retries >= MAX_RETRIES) {
        console.error('Maximum connection retries reached. Unable to connect to database.');
        throw error;
      }
      
      console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Call test connection in development but don't block startup
if (process.env.NODE_ENV !== 'production') {
  testConnection().catch(err => {
    console.error('Initial database connection test failed:', err);
  });
}

// Export the sequelize instance
export default sequelize;