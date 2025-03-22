'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Add capacity column to seats table
      await queryInterface.addColumn('seats', 'capacity', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Seating capacity for cubicles and meeting rooms'
      });
      
      // Add is_configurable flag to seats table
      await queryInterface.addColumn('seats', 'is_configurable', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether seat capacity can be configured in admin panel'
      });
      
      // Add capacity_options JSON column to seating_types table
      await queryInterface.addColumn('seating_types', 'capacity_options', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Available capacity options for this seating type (JSON array)'
      });
      
      // Update existing seating types with capacity options
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET capacity_options = '[1, 2, 4, 6, 8]'::jsonb
        WHERE name = 'CUBICLE';
      `);
      
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seating_types"
        SET capacity_options = '[4, 6, 8, 10, 12, 16, 20]'::jsonb
        WHERE name = 'MEETING_ROOM';
      `);
      
      // Set default capacity for existing cubicles
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seats" s
        SET capacity = 1, is_configurable = true
        FROM "${dbSchema}"."seating_types" st
        WHERE s.seating_type_id = st.id AND st.name = 'CUBICLE';
      `);
      
      // Set default capacity for existing meeting rooms
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."seats" s
        SET capacity = 8, is_configurable = true
        FROM "${dbSchema}"."seating_types" st
        WHERE s.seating_type_id = st.id AND st.name = 'MEETING_ROOM';
      `);
      
      // Add index for faster querying by capacity
      await queryInterface.addIndex('seats', ['capacity', 'seating_type_id']);
      
      console.log('Added capacity configuration to cubicles and meeting rooms');
      
    } catch (error) {
      console.error('Error adding capacity to cubicles and meeting rooms:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove index first
      await queryInterface.removeIndex('seats', ['capacity', 'seating_type_id']);
      
      // Remove columns
      await queryInterface.removeColumn('seating_types', 'capacity_options');
      await queryInterface.removeColumn('seats', 'is_configurable');
      await queryInterface.removeColumn('seats', 'capacity');
      
      console.log('Removed capacity configuration from cubicles and meeting rooms');
      
    } catch (error) {
      console.error('Error removing capacity from cubicles and meeting rooms:', error);
      throw error;
    }
  }
}; 