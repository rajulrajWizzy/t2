'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes to support_tickets table
    await queryInterface.addIndex('support_tickets', ['customer_id']);
    await queryInterface.addIndex('support_tickets', ['branch_id']);
    await queryInterface.addIndex('support_tickets', ['assigned_to']);
    await queryInterface.addIndex('support_tickets', ['booking_id']);

    // Add indexes to ticket_messages table
    await queryInterface.addIndex('ticket_messages', ['ticket_id']);
    await queryInterface.addIndex('ticket_messages', ['sender_id']);

    // Add notification preferences column to customers table
    await queryInterface.addColumn('customers', 'notification_preferences', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {
        email_notifications: true,
        push_notifications: true,
        ticket_updates: true
      }
    });

    // Add last_viewed_at column to ticket_messages
    await queryInterface.addColumn('ticket_messages', 'last_viewed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add priority column to support_tickets
    await queryInterface.addColumn('support_tickets', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('support_tickets', ['customer_id']);
    await queryInterface.removeIndex('support_tickets', ['branch_id']);
    await queryInterface.removeIndex('support_tickets', ['assigned_to']);
    await queryInterface.removeIndex('support_tickets', ['booking_id']);
    await queryInterface.removeIndex('ticket_messages', ['ticket_id']);
    await queryInterface.removeIndex('ticket_messages', ['sender_id']);

    // Remove columns
    await queryInterface.removeColumn('customers', 'notification_preferences');
    await queryInterface.removeColumn('ticket_messages', 'last_viewed_at');
    
    // Remove priority enum and column
    await queryInterface.removeColumn('support_tickets', 'priority');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_support_tickets_priority;');
  }
};