'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('admin_users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'branch_admin',
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      profile_picture: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex('admin_users', ['username']);
    await queryInterface.addIndex('admin_users', ['email']);
    await queryInterface.addIndex('admin_users', ['role']);
    await queryInterface.addIndex('admin_users', ['branch_id']);
    
    // Create default super admin user (password: admin123)
    await queryInterface.bulkInsert('admin_users', [{
      username: 'superadmin',
      email: 'admin@coworks.com',
      password: '$2b$10$OMUZjWLfF05YqIZH7/XY9.t0FrSoYvOGNP6rrX9yDEIR5yCHx1.Ly', // admin123 (hashed)
      name: 'Super Admin',
      role: 'super_admin',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_users');
  }
};
