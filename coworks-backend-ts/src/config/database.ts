// src/config/database.ts
import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the schema from environment variables
const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize: Sequelize;

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: console.log,
    schema: dbSchema,
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
    process.env.DB_NAME || 'coworks_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      dialectModule: pg,
      logging: console.log,
      schema: dbSchema,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
}

// Test the connection
async function testConnection(): Promise<void> {
  try {
    // Set the search path to the specified schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Check if the tables are accessible
    const tablesResult = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbSchema}';`
    );
    
    console.log('Available tables:', (tablesResult[0] as any[]).map(row => row.table_name).join(', '));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Call this function when the server starts
testConnection();

export default sequelize;