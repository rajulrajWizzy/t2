/**
 * Database Migration Runner
 * 
 * This script runs all SQL migrations in the migrations directory
 * in a specific order to ensure database consistency.
 * 
 * Usage:
 * node src/migrations/run-migrations.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database connection parameters
const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'excel_coworks';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Migration file order - define the exact order of execution
const migrationOrder = [
  'create_schema.sql',             // Base schema creation
  'coins.sql',                      // Customer coins
  'create_maintenance_blocks_table.sql', // Maintenance blocks
  'add_payment_method_to_bookings.sql',  // Add payment method
  'add_order_id_to_payments_and_bookings.sql', // Add order ID
  '20240321000000-add-payment-status.js' // Add payment status
];

// Directory containing migrations
const migrationsDir = path.join(__dirname);

console.log('Starting database migrations...');

// Validate migration files exist
migrationOrder.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Migration file not found: ${file}`);
    process.exit(1);
  }
});

// Run migrations in order
let successCount = 0;
let errorCount = 0;

migrationOrder.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  console.log(`Running migration: ${file}`);
  
  try {
    // Run psql command with specified file
    let command = '';
    
    if (DB_PASSWORD) {
      // If password is provided, use PGPASSWORD environment variable
      command = `PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d ${DB_NAME} -f "${filePath}"`;
    } else {
      // Without password (e.g., when using trust authentication)
      command = `psql -U ${DB_USER} -d ${DB_NAME} -f "${filePath}"`;
    }
    
    // Execute command
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`✅ Migration successful: ${file}`);
    console.log(output);
    successCount++;
  } catch (error) {
    console.error(`❌ Migration failed: ${file}`);
    console.error(error.toString());
    errorCount++;
    
    // Continue with next migration despite errors
    // Remove the comment on the next line if you want to stop on first error
    // process.exit(1);
  }
});

console.log(`\nMigration summary:`);
console.log(`Total migrations: ${migrationOrder.length}`);
console.log(`Successful: ${successCount}`);
console.log(`Failed: ${errorCount}`);

if (errorCount > 0) {
  console.log(`\n⚠️ Some migrations failed. Please check the logs and fix any issues.`);
  process.exit(1);
} else {
  console.log(`\n🎉 All migrations completed successfully!`);
} 