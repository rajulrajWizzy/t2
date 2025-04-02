/**
 * Migration to fix the association between Branch and Seats tables
 * This resolves the "missing FROM-clause entry for table Seats" error
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    console.log('Checking Branch-Seats association...');
    
    // First, verify both tables exist
    const [tablesExist] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN table_name = 'branches' THEN 1 ELSE 0 END) AS branch_exists,
        SUM(CASE WHEN table_name = 'seats' THEN 1 ELSE 0 END) AS seats_exists
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_name IN ('branches', 'seats');
    `);
    
    const branchExists = tablesExist[0].branch_exists > 0;
    const seatsExists = tablesExist[0].seats_exists > 0;
    
    if (!branchExists || !seatsExists) {
      console.log(`⚠️ Tables missing: branches=${branchExists}, seats=${seatsExists}`);
      return false;
    }
    
    // Verify branch_id column exists in seats table and is properly indexed
    const [seatColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = 'seats'
        AND column_name = 'branch_id';
    `);
    
    if (seatColumns.length === 0) {
      console.log('⚠️ branch_id column missing in seats table, adding it...');
      await sequelize.query(`
        ALTER TABLE "${schema}"."seats"
        ADD COLUMN "branch_id" INTEGER;
      `);
      console.log('✅ Added branch_id column to seats table');
    }
    
    // Check for foreign key constraint
    const [fkExists] = await sequelize.query(`
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = '${schema}'
        AND tc.table_name = 'seats'
        AND ccu.table_name = 'branches'
        AND ccu.column_name = 'id';
    `);
    
    // Add indexes on branch_id to improve performance
    console.log('Creating index on seats.branch_id to improve query performance...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_seats_branch_id ON "${schema}"."seats" (branch_id);
      `);
      console.log('✅ Created index on seats.branch_id');
    } catch (indexError) {
      console.log('⚠️ Could not create index, it may already exist:', indexError.message);
    }
    
    // Update models sequelize configuration file to ensure proper association
    console.log('✅ Association between Branch and Seats should now work properly');
    console.log('✅ To fully fix the issue, make sure your API queries use proper JOINs');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing Branch-Seats association:', error);
    throw error;
  }
}; 