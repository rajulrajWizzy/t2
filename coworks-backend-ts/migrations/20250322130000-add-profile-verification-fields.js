'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Add verification fields to customers table
      await queryInterface.addColumn('customers', 'is_identity_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Identity verification status approved by admin'
      });
      
      await queryInterface.addColumn('customers', 'is_address_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Address verification status approved by admin'
      });

      await queryInterface.addColumn('customers', 'verification_status', {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Overall verification status of customer profile'
      });

      await queryInterface.addColumn('customers', 'verification_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin notes on verification process'
      });

      await queryInterface.addColumn('customers', 'verification_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when verification was completed'
      });

      await queryInterface.addColumn('customers', 'verified_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin ID who verified the customer',
        references: {
          model: 'admin_users',
          key: 'id'
        }
      });

      console.log('Added verification fields to customers table');
      
      // Add index for faster searches
      await queryInterface.addIndex('customers', ['verification_status']);
      await queryInterface.addIndex('customers', ['verified_by']);
      
      console.log('Added indexes for verification fields');
      
    } catch (error) {
      console.error('Error adding verification fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove indexes first
      await queryInterface.removeIndex('customers', ['verification_status']);
      await queryInterface.removeIndex('customers', ['verified_by']);
      
      // Remove the columns
      await queryInterface.removeColumn('customers', 'verified_by');
      await queryInterface.removeColumn('customers', 'verification_date');
      await queryInterface.removeColumn('customers', 'verification_notes');
      await queryInterface.removeColumn('customers', 'verification_status');
      await queryInterface.removeColumn('customers', 'is_address_verified');
      await queryInterface.removeColumn('customers', 'is_identity_verified');
      
      console.log('Removed verification fields from customers table');
      
    } catch (error) {
      console.error('Error removing verification fields:', error);
      throw error;
    }
  }
}; 