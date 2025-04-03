/**
 * Migration to add total_price column to seat_bookings table
 * This resolves the "column SeatBookingModel.total_price does not exist" error
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    console.log('Checking seat_bookings table for missing total_price column...');
    
    // Check if the seat_bookings table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'seat_bookings'
      );
    `);
    
    if (tableExists[0]?.exists) {
      // Get current columns in seat_bookings table
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = '${schema}' 
        AND table_name = 'seat_bookings';
      `);
      
      const columnNames = columns.map(col => col.column_name);
      console.log('Current seat_bookings columns:', columnNames.join(', '));
      
      // Check if total_price column exists
      if (!columnNames.includes('total_price')) {
        // Add the missing total_price column
        await sequelize.query(`
          ALTER TABLE "${schema}"."seat_bookings"
          ADD COLUMN "total_price" DECIMAL(10, 2) NOT NULL DEFAULT 0;
        `);
        
        console.log('✅ Added total_price column to seat_bookings table');
        return { message: 'Migration completed successfully: Added total_price column to seat_bookings table' };
      } else {
        console.log('ℹ️ Column total_price already exists in seat_bookings table');
        return { message: 'No changes needed: total_price column already exists' };
      }
    } else {
      console.log('⚠️ seat_bookings table does not exist, skipping migration');
      return { message: 'Migration skipped: seat_bookings table does not exist' };
    }
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};