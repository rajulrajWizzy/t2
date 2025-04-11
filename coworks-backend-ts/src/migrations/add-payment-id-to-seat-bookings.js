'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First ensure we're in the right schema
      await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
      
      // Check if column exists
      const [result] = await queryInterface.sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'seat_bookings' AND column_name = 'payment_id'"
      );
      
      if (result.length === 0) {
        // Add the payment_id column if it doesn't exist
        await queryInterface.sequelize.query(
          "ALTER TABLE excel_coworks_schema.seat_bookings ADD COLUMN payment_id VARCHAR(255)"
        );
        console.log('payment_id column added successfully to seat_bookings table');
      } else {
        console.log('payment_id column already exists in seat_bookings table, skipping');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding payment_id column:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Set the schema
      await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
      
      // Check if column exists
      const [result] = await queryInterface.sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'seat_bookings' AND column_name = 'payment_id'"
      );
      
      if (result.length > 0) {
        // Remove the column in the down migration
        await queryInterface.sequelize.query(
          "ALTER TABLE excel_coworks_schema.seat_bookings DROP COLUMN payment_id"
        );
        console.log('payment_id column removed successfully from seat_bookings table');
      } else {
        console.log('payment_id column does not exist in seat_bookings table, skipping');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing payment_id column:', error);
      return Promise.reject(error);
    }
  }
}; 