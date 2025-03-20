'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ticket_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      seating_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'seating_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      seating_type_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      booking_type: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'assigned',
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
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reopened_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'admin_users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    // Add indexes for faster lookups
    await queryInterface.addIndex('support_tickets', ['ticket_number']);
    await queryInterface.addIndex('support_tickets', ['customer_id']);
    await queryInterface.addIndex('support_tickets', ['branch_id']);
    await queryInterface.addIndex('support_tickets', ['branch_code']);
    await queryInterface.addIndex('support_tickets', ['status']);
    await queryInterface.addIndex('support_tickets', ['assigned_to']);
    await queryInterface.addIndex('support_tickets', ['created_at']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('support_tickets');
  }
};
