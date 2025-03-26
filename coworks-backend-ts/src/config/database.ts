// src/config/database.ts
import { Sequelize, Options } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the schema from environment variables
const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize: Sequelize;

// Connection configuration
const getConnectionConfig = (): Options => {
  // SSL configuration - always require SSL
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };

  // Common options
  const commonOptions: Options = {
    dialect: 'postgres',
    dialectModule: pg,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    pool: {
      max: process.env.NODE_ENV === 'production' ? 5 : 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
      // Neon serverless connection handling
      evict: 1000
    },
    dialectOptions: {
      ssl: sslConfig,
      // Prevent idle timeout issues
      statement_timeout: 30000,
      query_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    },
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /ECONNRESET/
      ]
    }
  };

  // Check if DATABASE_URL exists (Vercel/Production)
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    return {
      ...commonOptions,
      // Add any additional options specific to DATABASE_URL
    };
  } else {
    // Fallback to individual credentials (local development)
    console.log('Using individual credentials for connection');
    return {
      ...commonOptions,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    };
  }
};

// Initialize Sequelize
try {
  const config = getConnectionConfig();
  
  if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, config);
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'coworks_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASS || '',
      config
    );
  }
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  throw error; // Re-throw to handle in the calling code
}

// Test the connection
async function testConnection(): Promise<void> {
  try {
    // Set the search path to the specified schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Check if migrations table exists and create if not
    try {
      const [migrationResult] = await sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'migrations'
        );`
      );
      
      if (!(migrationResult as any[])[0].exists) {
        console.log('Creating migrations table...');
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS "${dbSchema}"."migrations" (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }
    } catch (err) {
      console.error('Error checking/creating migrations table:', err);
      // Don't throw here, as this is not critical for the application to function
    }
    
    // Check if the tables are accessible
    const tablesResult = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbSchema}';`
    );
    
    console.log('Available tables:', (tablesResult[0] as any[]).map(row => row.table_name).join(', '));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error; // Re-throw to handle in the calling code
  }
}

// Call this function when the server starts, but don't block
testConnection().catch(err => {
  console.error('Database test connection failed:', err);
  // Don't throw here, as we want the application to start even if the initial connection fails
});

export default sequelize;