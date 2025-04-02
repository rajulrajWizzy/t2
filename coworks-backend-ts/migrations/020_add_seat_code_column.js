/**
 * Migration to add seat_code column to seats table
 * This resolves the "column Seats.seat_code does not exist" error
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    // Check if the seats table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'seats'
      );
    `);
    
    const exists = tableExists[0]?.exists || false;
    console.log(`Seats table exists: ${exists}`);
    
    if (exists) {
      // Check if the seat_code column already exists
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'seats'
          AND column_name = 'seat_code'
        );
      `);
      
      const hasColumn = columnExists[0]?.exists || false;
      
      if (!hasColumn) {
        console.log('Adding seat_code column to seats table');
        await sequelize.query(`
          ALTER TABLE "${schema}"."seats"
          ADD COLUMN "seat_code" VARCHAR(50) NULL;
        `);
        
        // Update existing records to generate seat_code from their ID and seat_number
        console.log('Updating existing seats with generated seat_code values');
        await sequelize.query(`
          UPDATE "${schema}"."seats"
          SET "seat_code" = CONCAT('SEAT', LPAD(id::text, 4, '0'))
          WHERE "seat_code" IS NULL;
        `);
        
        console.log('✅ seat_code column added and populated successfully');
      } else {
        console.log('✅ seat_code column already exists');
      }
      
      return true;
    } else {
      console.log('Seats table does not exist, nothing to modify');
      return false;
    }
  } catch (error) {
    console.error('Error adding seat_code column:', error);
    throw error;
  }
}; 