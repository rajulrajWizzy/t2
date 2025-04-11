/**
 * Migration: Add Payment Status
 * 
 * This migration adds payment status tracking to bookings and payments tables
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database connection parameters
const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'excel_coworks';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// SQL statements to execute
const sqlStatements = `
-- Set search path
SET search_path TO excel_coworks_schema;

-- Add payment status to seat_bookings table
ALTER TABLE excel_coworks_schema.seat_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

-- Add payment status to meeting_bookings table
ALTER TABLE excel_coworks_schema.meeting_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

-- Add payment status to payments table
ALTER TABLE excel_coworks_schema.payments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

-- Create index on payment_status for faster queries
CREATE INDEX IF NOT EXISTS idx_seat_bookings_payment_status 
ON excel_coworks_schema.seat_bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_meeting_bookings_payment_status 
ON excel_coworks_schema.meeting_bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_payment_status 
ON excel_coworks_schema.payments(payment_status);
`;

// Write SQL to a temporary file
const tempFile = path.join(__dirname, 'temp_payment_status.sql');
fs.writeFileSync(tempFile, sqlStatements);

try {
  // Run psql command with the SQL file
  let command = '';
  
  if (DB_PASSWORD) {
    command = `PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d ${DB_NAME} -f "${tempFile}"`;
  } else {
    command = `psql -U ${DB_USER} -d ${DB_NAME} -f "${tempFile}"`;
  }
  
  // Execute command
  const output = execSync(command, { encoding: 'utf8' });
  console.log('✅ Payment status migration successful');
  console.log(output);
} catch (error) {
  console.error('❌ Payment status migration failed');
  console.error(error.toString());
  process.exit(1);
} finally {
  // Clean up temporary file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
} 