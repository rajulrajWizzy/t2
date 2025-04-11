const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database configuration
const DB_NAME = process.env.DB_NAME || 'excel_coworks';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
const DB_SSL = process.env.DB_SSL === 'true';

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: DB_SSL ? {
      require: true,
      rejectUnauthorized: false
    } : undefined
  }
});

async function createPasswordResetsTable() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Create schema if it doesn't exist
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
    console.log(`✅ Ensured schema "${DB_SCHEMA}" exists`);

    // Create password_resets table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${DB_SCHEMA}"."password_resets" (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES "${DB_SCHEMA}"."customers" (id)
      );
    `);
    console.log('✅ Created password_resets table');

    // Add indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON "${DB_SCHEMA}"."password_resets" (token);
      CREATE INDEX IF NOT EXISTS idx_password_resets_customer_id ON "${DB_SCHEMA}"."password_resets" (customer_id);
    `);
    console.log('✅ Created indexes for password_resets table');

    console.log('\n🎉 Password resets table setup completed successfully!\n');
  } catch (error) {
    console.error('❌ Error creating password_resets table:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createPasswordResetsTable(); 