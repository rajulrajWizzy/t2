import { addProfileVerificationFields } from '../utils/migrations';

/**
 * Script to add profile verification fields to customers table
 */
async function runMigration() {
  try {
    console.log('Starting migration: Add profile verification fields');
    await addProfileVerificationFields();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 