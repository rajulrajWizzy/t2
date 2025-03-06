// src/config/database.ts
import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure environment variables are properly typed
const dbName = process.env.DB_NAME || 'coworks_db';
const dbUser = process.env.DB_USER || 'postgres';
const dbPass = String(process.env.DB_PASS || ''); // Explicitly convert to string
const dbHost = process.env.DB_HOST || 'localhost';
const dbSchema = process.env.DB_SCHEMA || 'public';

// Debug environment variables
console.log('Database connection info:');
console.log('DB_NAME:', dbName);
console.log('DB_USER:', dbUser);
console.log('DB_PASS:', dbPass ? '[PASSWORD SET]' : '[NO PASSWORD]');
console.log('DB_HOST:', dbHost);
console.log('DB_SCHEMA:', dbSchema);

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPass,
  {
    host: dbHost,
    dialect: 'postgres',
    dialectModule: pg,
    logging: console.log,
    define: {
      schema: "excel_coworks_schema", // Ensure this is defined
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  }
);

// Test the connection
async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Call this function when the server starts
testConnection();

export default sequelize;