'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First ensure we're in the right schema
      await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
      
      // Check if column exists
      const [result] = await queryInterface.sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'payments' AND column_name = 'order_id'"
      );
      
      if (result.length === 0) {
        // Add the order_id column if it doesn't exist
        await queryInterface.sequelize.query(
          "ALTER TABLE excel_coworks_schema.payments ADD COLUMN order_id VARCHAR(255)"
        );
        console.log('order_id column added successfully to payments table');
      } else {
        console.log('order_id column already exists in payments table, skipping');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding order_id column:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Set the schema
      await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
      
      // Check if column exists
      const [result] = await queryInterface.sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'payments' AND column_name = 'order_id'"
      );
      
      if (result.length > 0) {
        // Remove the column in the down migration
        await queryInterface.sequelize.query(
          "ALTER TABLE excel_coworks_schema.payments DROP COLUMN order_id"
        );
        console.log('order_id column removed successfully from payments table');
      } else {
        console.log('order_id column does not exist in payments table, skipping');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing order_id column:', error);
      return Promise.reject(error);
    }
  }
}; 