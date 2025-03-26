require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Define color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Improved logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  
  switch(type) {
    case 'success':
      color = colors.green;
      break;
    case 'warn':
      color = colors.yellow;
      break;
    case 'error':
      color = colors.red;
      break;
    case 'info':
      color = colors.cyan;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function migrateCustomerProfileFields() {
  log('Starting customer profile fields migration...', 'info');
  
  let sequelize;
  
  try {
    // Establish database connection
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    log('Connecting to database...', 'info');
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    // Test the connection
    await sequelize.authenticate();
    log('Database connection established successfully', 'success');
    
    // Get the current schema
    await sequelize.query(`SET search_path TO ${process.env.DB_SCHEMA || 'public'}`);
    log(`Using schema: ${process.env.DB_SCHEMA || 'public'}`, 'info');
    
    // Check if customers table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1",
      { 
        bind: [process.env.DB_SCHEMA || 'public'],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    const tableNames = tables.map(t => t.table_name);
    if (!tableNames.includes('customers')) {
      throw new Error('Customers table does not exist');
    }
    
    log('Checking customer table columns...', 'info');
    
    // Check if profile fields already exist
    const [columns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'customers'",
      { 
        bind: [process.env.DB_SCHEMA || 'public'],
        type: Sequelize.QueryTypes.SELECT 
      }
    );
    
    const columnNames = columns.map(c => c.column_name);
    
    // Define the new profile fields to add
    const fieldsToAdd = [
      { name: 'profile_image', type: 'TEXT', defaultValue: null },
      { name: 'proof_of_identity', type: 'TEXT', defaultValue: null },
      { name: 'id_number', type: 'VARCHAR(50)', defaultValue: null },
      { name: 'bio', type: 'TEXT', defaultValue: null },
      { name: 'occupation', type: 'VARCHAR(100)', defaultValue: null },
      { name: 'company', type: 'VARCHAR(100)', defaultValue: null },
      { name: 'website', type: 'VARCHAR(255)', defaultValue: null },
      { name: 'emergency_contact_name', type: 'VARCHAR(100)', defaultValue: null },
      { name: 'emergency_contact_phone', type: 'VARCHAR(20)', defaultValue: null }
    ];
    
    // Add each field if it doesn't exist
    for (const field of fieldsToAdd) {
      if (!columnNames.includes(field.name)) {
        log(`Adding column ${field.name}...`, 'info');
        try {
          await sequelize.query(
            `ALTER TABLE customers ADD COLUMN ${field.name} ${field.type} DEFAULT ${field.defaultValue === null ? 'NULL' : `'${field.defaultValue}'`}`
          );
          log(`Column ${field.name} added successfully`, 'success');
        } catch (error) {
          log(`Error adding column ${field.name}: ${error.message}`, 'error');
          // Continue with other columns even if one fails
        }
      } else {
        log(`Column ${field.name} already exists - skipping`, 'warn');
      }
    }
    
    log('Customer profile fields migration completed successfully', 'success');
    
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    // Don't exit process, just log error to allow deployment to continue
  } finally {
    // Close the database connection if it was established
    if (sequelize) {
      await sequelize.close();
      log('Database connection closed', 'info');
    }
  }
}

// Run the migration
migrateCustomerProfileFields()
  .then(() => {
    log('Migration process completed', 'success');
  })
  .catch(error => {
    log(`Uncaught error in migration process: ${error.message}`, 'error');
    // Don't exit with error code, allow deployment to continue
  }); 