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
      
      // Check if payment_logs table exists
      const [paymentTablesResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'payment_logs'
        );
      `);
      
      if (!paymentTablesResult[0].exists) {
        console.log('Payment logs table does not exist yet, it will be created by the recreate-schema migration');
        return;
      }
      
      // Add metadata column to payment_logs table if it doesn't exist
      const [metadataColumnResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'payment_logs'
          AND column_name = 'metadata'
        );
      `);
      
      if (!metadataColumnResult[0].exists) {
        await queryInterface.addColumn('payment_logs', 'metadata', {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null
        });
        console.log('Added metadata column to payment_logs table');
      }
      
      // Check for transaction_id column and add it if it doesn't exist
      const [txidColumnResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'payment_logs'
          AND column_name = 'transaction_id'
        );
      `);
      
      if (!txidColumnResult[0].exists) {
        await queryInterface.addColumn('payment_logs', 'transaction_id', {
          type: Sequelize.STRING(100),
          allowNull: true
        });
        console.log('Added transaction_id column to payment_logs table');
      }
      
      // Check for gateway_response column and add it if it doesn't exist
      const [gatewayColumnResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'payment_logs'
          AND column_name = 'gateway_response'
        );
      `);
      
      if (!gatewayColumnResult[0].exists) {
        await queryInterface.addColumn('payment_logs', 'gateway_response', {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null
        });
        console.log('Added gateway_response column to payment_logs table');
      }
      
      // Create index for transaction_id if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'payment_logs' 
            AND indexname = 'idx_payment_logs_transaction_id'
          ) THEN
            CREATE INDEX idx_payment_logs_transaction_id ON "${dbSchema}"."payment_logs" (transaction_id);
          END IF;
        END
        $$;
      `);
      
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
      const dbSchema = process.env.DB_SCHEMA || 'public';
      
      // Check if payment_logs table exists before trying to remove columns
      const [paymentTablesResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}'
          AND table_name = 'payment_logs'
        );
      `);
      
      if (!paymentTablesResult[0].exists) {
        return;
      }
      
      // Remove index
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "${dbSchema}"."idx_payment_logs_transaction_id";
      `);
      
      // Remove columns
      await queryInterface.removeColumn('payment_logs', 'metadata');
      await queryInterface.removeColumn('payment_logs', 'transaction_id');
      await queryInterface.removeColumn('payment_logs', 'gateway_response');
    } catch (error) {
      console.error(`Rollback error: ${error.message}`);
      throw error;
    }
  }
};
