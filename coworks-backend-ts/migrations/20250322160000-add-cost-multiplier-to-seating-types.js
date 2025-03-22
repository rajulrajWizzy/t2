'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Add cost_multiplier column to seating_types table
      await queryInterface.addColumn('seating_types', 'cost_multiplier', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Cost multipliers for quantity options (JSON object where keys are quantities)'
      });
      
      // Update hot desk seating type with cost multipliers (quantity discounts)
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET cost_multiplier = '{"1": 1.0, "2": 0.95, "3": 0.90, "4": 0.85, "5": 0.80, "10": 0.75}'::jsonb
        WHERE name = 'HOT_DESK';
      `);
      
      // Update dedicated desk seating type with cost multipliers
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET cost_multiplier = '{"1": 1.0, "2": 0.95, "3": 0.92, "4": 0.90, "5": 0.85}'::jsonb
        WHERE name = 'DEDICATED_DESK';
      `);
      
      console.log('Added cost multiplier to seating types');
      
    } catch (error) {
      console.error('Error adding cost multiplier to seating types:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove column
      await queryInterface.removeColumn('seating_types', 'cost_multiplier');
      
      console.log('Removed cost multiplier from seating types');
      
    } catch (error) {
      console.error('Error removing cost multiplier from seating types:', error);
      throw error;
    }
  }
}; 