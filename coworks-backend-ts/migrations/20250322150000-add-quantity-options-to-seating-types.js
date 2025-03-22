'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Add quantity_options JSON column to seating_types table
      await queryInterface.addColumn('seating_types', 'quantity_options', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Available quantity options for booking multiple units (JSON array)'
      });
      
      // Update hot desk seating type with quantity options
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET quantity_options = '[1, 2, 3, 4, 5, 10]'::jsonb
        WHERE name = 'HOT_DESK';
      `);
      
      // Update dedicated desk seating type with quantity options
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET quantity_options = '[1, 2, 3, 4, 5]'::jsonb
        WHERE name = 'DEDICATED_DESK';
      `);
      
      console.log('Added quantity options to seating types');
      
    } catch (error) {
      console.error('Error adding quantity options to seating types:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove column
      await queryInterface.removeColumn('seating_types', 'quantity_options');
      
      console.log('Removed quantity options from seating types');
      
    } catch (error) {
      console.error('Error removing quantity options from seating types:', error);
      throw error;
    }
  }
}; 