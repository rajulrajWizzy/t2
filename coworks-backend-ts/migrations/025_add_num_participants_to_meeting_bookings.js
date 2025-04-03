/**
 * Migration: Add num_participants column to meeting_bookings table
 * 
 * This migration adds the num_participants column to the meeting_bookings table
 * to properly track the number of participants for each meeting booking.
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
        AND column_name = 'num_participants';
      `);
      
      if (columns.length === 0) {
        // Add num_participants column
        await queryInterface.query(`
          ALTER TABLE "${schema}"."meeting_bookings"
          ADD COLUMN "num_participants" INTEGER NOT NULL DEFAULT 1;
        `);
        
        // Update existing records to use attendees value
        await queryInterface.query(`
          UPDATE "${schema}"."meeting_bookings"
          SET num_participants = attendees
          WHERE attendees IS NOT NULL;
        `);
        
        console.log('✅ Added num_participants column to meeting_bookings table');
      } else {
        console.log('ℹ️ num_participants column already exists');
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
      // Remove the num_participants column
      await queryInterface.sequelize.query(`
        ALTER TABLE "${schema}"."meeting_bookings"
        DROP COLUMN IF EXISTS "num_participants";
      `);
      
      console.log('✅ Removed num_participants column from meeting_bookings table');
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Migration rollback failed:', error);
      return Promise.reject(error);
    }
  }
};