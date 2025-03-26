'use strict';

/**
 * Migration: add-payment-metadata
 * Generated: 2025-03-26T18:31:46.975Z
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Set schema
      const dbSchema = process.env.DB_SCHEMA || 'public';
      await queryInterface.sequelize.query(`SET search_path TO "${dbSchema}";`);
      
      // Implement your migration logic here
      // Example:
      // await queryInterface.addColumn('users', 'preferences', {
      //   type: Sequelize.JSONB,
      //   allowNull: true,
      //   defaultValue: null
      // });
      
      // Create indexes if needed
      // Example:
      // await queryInterface.addIndex('users', ['preferences'], {
      //   name: 'idx_users_preferences'
      // });
      
      // Record this migration
      await queryInterface.sequelize.query(`
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('add-payment-metadata', NOW())
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error(`Migration error: ${error.message}`);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Implement rollback logic here
      // Example:
      // await queryInterface.removeColumn('users', 'preferences');
    } catch (error) {
      console.error(`Rollback error: ${error.message}`);
      throw error;
    }
  }
};
