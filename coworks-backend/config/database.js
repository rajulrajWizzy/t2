// config/database.js
import { Sequelize } from 'sequelize';

// Force require the pg module to avoid webpack issues
// This approach helps Next.js properly load the native PostgreSQL drivers
let pg;
try {
  pg = require('pg');
} catch (e) {
  console.error('Error loading pg:', e.message);
}

const sequelize = new Sequelize(
  process.env.DB_NAME ,
  process.env.DB_USER ,
  process.env.DB_PASS , // use your actual password
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    dialectModule: pg, // This is key - explicitly providing the pg module
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Important for Neon
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test the connection
async function testConnection() {
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