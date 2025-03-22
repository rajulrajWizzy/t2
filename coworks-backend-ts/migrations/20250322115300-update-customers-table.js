'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'proof_of_identity', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Path to file showing proof of identity (PDF/JPG/JPEG/PNG)'
    });

    await queryInterface.addColumn('customers', 'proof_of_address', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Path to file showing proof of address (PDF/JPG/JPEG/PNG)'
    });

    await queryInterface.addColumn('customers', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Full address of the customer'
    });

    // Add an index for faster searches
    await queryInterface.addIndex('customers', ['email']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('customers', ['email']);
    await queryInterface.removeColumn('customers', 'address');
    await queryInterface.removeColumn('customers', 'proof_of_address');
    await queryInterface.removeColumn('customers', 'proof_of_identity');
  }
}; 