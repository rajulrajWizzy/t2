'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Check if permissions column already exists
      const tableInfo = await queryInterface.describeTable('admins');
      if (tableInfo.permissions) {
        console.log('Permissions column already exists in admins table');
        return;
      }
      
      // Add permissions JSONB column to admins table
      await queryInterface.addColumn('admins', 'permissions', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Admin permissions as JSON object with resource keys and permission values'
      });
      
      // Update super_admin with all permissions
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."admins"
        SET permissions = '${JSON.stringify({
          "seats": ["read", "create", "update", "delete"],
          "seating_types": ["read", "create", "update", "delete"],
          "branches": ["read", "create", "update", "delete"],
          "customers": ["read", "create", "update", "delete"],
          "bookings": ["read", "create", "update", "delete"],
          "payments": ["read", "create", "update", "delete"],
          "reports": ["read", "create", "update", "delete"],
          "admins": ["read", "create", "update", "delete"],
          "support": ["read", "create", "update", "delete"],
          "settings": ["read", "update"]
        })}'::jsonb
        WHERE role = 'super_admin';
      `);
      
      // Update branch_admin with branch-limited permissions
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."admins"
        SET permissions = '${JSON.stringify({
          "seats": ["read", "update"],
          "seating_types": ["read"],
          "branches": ["read"],
          "customers": ["read"],
          "bookings": ["read", "create", "update"],
          "payments": ["read"],
          "reports": ["read"],
          "admins": [],
          "support": ["read", "create", "update"],
          "settings": []
        })}'::jsonb
        WHERE role = 'branch_admin';
      `);
      
      // Update support_admin with support-only permissions
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."admins"
        SET permissions = '${JSON.stringify({
          "seats": [],
          "seating_types": [],
          "branches": ["read"],
          "customers": ["read"],
          "bookings": ["read"],
          "payments": [],
          "reports": [],
          "admins": [],
          "support": ["read", "create", "update", "delete"],
          "settings": []
        })}'::jsonb
        WHERE role = 'support_admin';
      `);
      
      console.log('Added permissions to admins table and set defaults by role');
      
    } catch (error) {
      console.error('Error adding permissions to admins:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove permissions column
      await queryInterface.removeColumn('admins', 'permissions');
      
      console.log('Removed permissions from admins table');
      
    } catch (error) {
      console.error('Error removing permissions from admins:', error);
      throw error;
    }
  }
}; 