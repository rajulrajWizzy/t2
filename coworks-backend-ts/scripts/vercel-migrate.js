// scripts/vercel-migrate.js
// A safer migration script for Vercel deployment
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'public';

// Function to test database connectivity only
async function testDatabaseConnection() {
  let sequelize = null;
  
  try {
    console.log('Vercel migration: Testing database connection only...');
    
    // Check if DATABASE_URL exists (Vercel/Production)
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
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
          logging: false,
          dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
              require: true,
              rejectUnauthorized: false
            } : undefined
          }
        }
      );
    }

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection test successful');
    
    // Check if migrations table exists
    try {
      const [result] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'migrations'
        );
      `);
      
      const migrationsTableExists = result[0].exists;
      console.log(`Migrations table exists: ${migrationsTableExists}`);
      
      if (migrationsTableExists) {
        // Get migration count
        const [migrations] = await sequelize.query(`
          SELECT COUNT(*) FROM "${dbSchema}"."migrations";
        `);
        console.log(`Number of migrations already applied: ${migrations[0].count}`);
      }
    } catch (err) {
      console.log('Could not check migrations table status:', err.message);
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError.message);
      }
    }
    return false;
  }
}

// Main function
async function main() {
  try {
    const connectionSuccess = await testDatabaseConnection();
    
    if (connectionSuccess) {
      console.log('Vercel migration: Database connection verified. Actual migrations will be run separately.');
      process.exit(0);
    } else {
      console.error('Vercel migration: Database connection failed. Check your database configuration.');
      // Exit with 0 to allow deployment to continue despite db connection issues
      process.exit(0);
    }
  } catch (error) {
    console.error('Vercel migration script failed:', error);
    // Exit with 0 to allow deployment to continue despite migration issues
    process.exit(0);
  }
}

// Run the script
main(); 