/**
 * Migration to fix the BlacklistedToken table structure
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    // Check if the BlacklistedToken table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'excel_coworks_schema'
        AND table_name = 'blacklisted_tokens'
      );
    `);
    
    const exists = tableExists[0]?.exists || false;
    console.log(`BlacklistedToken table exists: ${exists}`);

    if (exists) {
      // Check if the table has the expected columns
      const [columnsResult] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'excel_coworks_schema' 
        AND table_name = 'blacklisted_tokens';
      `);
      
      console.log('Current BlacklistedToken table structure:');
      console.log(columnsResult);
      
      // Check for the updated_at column - if it exists, we'll remove it
      const hasUpdatedAt = columnsResult.some(col => col.column_name === 'updated_at');
      if (hasUpdatedAt) {
        console.log('Removing updated_at column from BlacklistedToken table');
        await sequelize.query(`
          ALTER TABLE "excel_coworks_schema"."blacklisted_tokens" 
          DROP COLUMN IF EXISTS "updated_at";
        `);
      }
      
      // Check for the blacklisted_at column - if it doesn't exist, we'll add it
      const hasBlacklistedAt = columnsResult.some(col => col.column_name === 'blacklisted_at');
      if (!hasBlacklistedAt) {
        console.log('Adding blacklisted_at column to BlacklistedToken table');
        await sequelize.query(`
          ALTER TABLE "excel_coworks_schema"."blacklisted_tokens" 
          ADD COLUMN "blacklisted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
      }
      
      // Check for the user_id column - if it exists but has issues, we'll make it nullable
      const hasUserId = columnsResult.some(col => col.column_name === 'user_id');
      if (hasUserId) {
        console.log('Making user_id column nullable in BlacklistedToken table');
        await sequelize.query(`
          ALTER TABLE "excel_coworks_schema"."blacklisted_tokens" 
          ALTER COLUMN "user_id" DROP NOT NULL;
        `);
      }

      console.log('BlacklistedToken table structure has been fixed');
    } else {
      // Create the table with the correct structure
      console.log('Creating BlacklistedToken table with correct structure');
      await sequelize.query(`
        CREATE TABLE "excel_coworks_schema"."blacklisted_tokens" (
          "id" SERIAL PRIMARY KEY,
          "token" TEXT NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "blacklisted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "user_id" INTEGER,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX "idx_blacklisted_tokens_token" ON "excel_coworks_schema"."blacklisted_tokens" ("token");
      `);
      console.log('BlacklistedToken table created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing BlacklistedToken table:', error);
    throw error;
  }
}; 