import { addProfileVerificationFields } from '@/utils/migrations';

/**
 * This script adds profile verification fields to the customers table.
 * Fields added:
 * - is_identity_verified
 * - is_address_verified
 * - verification_status (ENUM: PENDING, APPROVED, REJECTED)
 * - verification_notes
 * - verification_date
 * - verified_by
 */
async function runVerificationMigration() {
  try {
    console.log('Running profile verification fields migration...');
    await addProfileVerificationFields();
    console.log('Profile verification fields migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in profile verification migration:', error);
    process.exit(1);
  }
}

runVerificationMigration(); 