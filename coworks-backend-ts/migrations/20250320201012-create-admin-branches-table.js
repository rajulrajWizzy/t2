'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_branches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'admin_users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate admin-branch pairs
    await queryInterface.addIndex('admin_branches', ['admin_id', 'branch_id'], {
      unique: true,
      name: 'admin_branch_unique'
    });

    // Add indexes for faster lookups
    await queryInterface.addIndex('admin_branches', ['admin_id'], {
      name: 'admin_branch_admin_idx'
    });

    await queryInterface.addIndex('admin_branches', ['branch_id'], {
      name: 'admin_branch_branch_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_branches');
  }
};
