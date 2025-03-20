'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('payment_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      booking_type: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      payment_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      order_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'created',
      },
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      refund_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      refund_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      refund_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      notes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Add indexes for faster lookups
    await queryInterface.addIndex('payment_logs', ['booking_id', 'booking_type']);
    await queryInterface.addIndex('payment_logs', ['payment_id']);
    await queryInterface.addIndex('payment_logs', ['order_id']);
    await queryInterface.addIndex('payment_logs', ['status']);
    await queryInterface.addIndex('payment_logs', ['created_at']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_logs');
  }
};
