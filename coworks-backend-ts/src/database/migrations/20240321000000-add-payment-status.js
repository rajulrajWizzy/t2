'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'payment_status', {
      type: Sequelize.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
      defaultValue: 'PENDING',
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payments', 'payment_status');
  }
}; 