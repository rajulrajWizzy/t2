'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      try {
        // First ensure we're in the right schema
        await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
        
        // Check if the table exists
        try {
          const hasTable = await queryInterface.sequelize.query(
            "SELECT to_regclass('excel_coworks_schema.payments') IS NOT NULL AS exists",
            { type: queryInterface.sequelize.QueryTypes.SELECT }
          );
          
          if (!hasTable[0].exists) {
            console.log('Payments table does not exist yet. Migration will be applied when table is created.');
            return Promise.resolve();
          }
          
          // Check if column exists
          const [result] = await queryInterface.sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'payments' AND column_name = 'payment_status'"
          );
          
          if (result.length === 0) {
            // Add ENUM type if it doesn't exist
            try {
              await queryInterface.sequelize.query(
                "CREATE TYPE excel_coworks_schema.enum_payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')"
              );
              console.log("Created ENUM type for payment_status");
            } catch (error) {
              // Type might already exist, which is fine
              console.log("ENUM type for payment_status might already exist, continuing...");
            }
            
            // Add column
            await queryInterface.sequelize.query(
              "ALTER TABLE excel_coworks_schema.payments ADD COLUMN payment_status excel_coworks_schema.enum_payment_status DEFAULT 'PENDING'"
            );
            console.log('payment_status column added successfully');
          } else {
            console.log('payment_status column already exists, skipping');
          }
          
        } catch (error) {
          console.error('Error checking if table exists:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error running migration:', error);
        throw error;
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding payment_status column:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Set the schema
      await queryInterface.sequelize.query('SET search_path TO excel_coworks_schema');
      
      // Check if column exists
      const [result] = await queryInterface.sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'excel_coworks_schema' AND table_name = 'payments' AND column_name = 'payment_status'"
      );
      
      if (result.length > 0) {
        // Remove the column in the down migration
        await queryInterface.sequelize.query(
          "ALTER TABLE excel_coworks_schema.payments DROP COLUMN payment_status"
        );
        console.log('payment_status column removed successfully');
      } else {
        console.log('payment_status column does not exist, skipping');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing payment_status column:', error);
      return Promise.reject(error);
    }
  }
}; 