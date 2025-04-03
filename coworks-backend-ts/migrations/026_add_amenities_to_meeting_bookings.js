/**
 * Migration: Add amenities column to meeting_bookings table
 * 
 * This migration adds the amenities column to the meeting_bookings table
 * to store various amenities associated with meeting bookings.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    try {
      // Check if the column already exists
      const [columns] = await queryInterface.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = '${schema}'
        AND table_name = 'meeting_bookings'
        AND column_name = 'amenities';
      `);
      
      if (columns.length === 0) {
        // Add amenities column as JSON type
        await queryInterface.query(`
          ALTER TABLE "${schema}"."meeting_bookings"
          ADD COLUMN "amenities" JSON DEFAULT '[]';
        `);
        
        console.log('✅ Added amenities column to meeting_bookings table');
      } else {
        console.log('ℹ️ amenities column already exists');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return Promise.reject(error);
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    try {
      // Remove the amenities column
      await queryInterface.sequelize.query(`
        ALTER TABLE "${schema}"."meeting_bookings"
        DROP COLUMN IF EXISTS "amenities";
      `);
      
      console.log('✅ Removed amenities column from meeting_bookings table');
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Migration rollback failed:', error);
      return Promise.reject(error);
    }
  }
};