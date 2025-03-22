'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Get all seating types
      const seatingTypes = await queryInterface.sequelize.query(`
        SELECT id, name, short_code FROM "${dbSchema}"."seating_types";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log(`Found ${seatingTypes.length} seating types`);
      
      // Find the dedicated desk seating type
      const dedicatedDeskType = seatingTypes.find(st => st.name === 'DEDICATED_DESK');
      
      if (!dedicatedDeskType) {
        console.warn('DEDICATED_DESK seating type not found');
        return;
      }
      
      console.log(`DEDICATED_DESK type ID: ${dedicatedDeskType.id}`);
      
      // For non-dedicated desk types, update seat numbers to be more generic
      // This reflects that seat_id is only important for dedicated desks
      for (const seatingType of seatingTypes) {
        if (seatingType.id !== dedicatedDeskType.id) {
          // For non-dedicated desks, use a generic identifier based on branch and seating type
          console.log(`Processing seating type: ${seatingType.name} (${seatingType.id})`);
          
          // Get branches with this seating type
          const branchesWithSeatingType = await queryInterface.sequelize.query(`
            SELECT DISTINCT b.id, b.name, b.short_code 
            FROM "${dbSchema}"."branches" b
            JOIN "${dbSchema}"."seats" s ON s.branch_id = b.id
            WHERE s.seating_type_id = ${seatingType.id};
          `, { type: Sequelize.QueryTypes.SELECT });
          
          for (const branch of branchesWithSeatingType) {
            // Count seats of this type in this branch
            const [seatCount] = await queryInterface.sequelize.query(`
              SELECT COUNT(*) as count 
              FROM "${dbSchema}"."seats" 
              WHERE branch_id = ${branch.id} AND seating_type_id = ${seatingType.id};
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log(`Branch ${branch.id} (${branch.name}) has ${seatCount.count} seats of type ${seatingType.name}`);
            
            // For certain seating types, we'll use a different approach to seat numbering
            // Hot desks can be numbered sequentially within branch
            // Meeting rooms might have capacity in the name
            if (seatingType.name === 'HOT_DESK') {
              await queryInterface.sequelize.query(`
                UPDATE "${dbSchema}"."seats"
                SET seat_number = CONCAT('Hotdesk-', ROW_NUMBER() OVER (
                  PARTITION BY branch_id, seating_type_id 
                  ORDER BY id
                ))
                WHERE branch_id = ${branch.id} 
                AND seating_type_id = ${seatingType.id};
              `);
              console.log(`Updated seat numbers for HOT_DESK in branch ${branch.id}`);
            } 
            else if (seatingType.name === 'MEETING_ROOM') {
              await queryInterface.sequelize.query(`
                UPDATE "${dbSchema}"."seats"
                SET seat_number = CONCAT('Meeting Room ', ROW_NUMBER() OVER (
                  PARTITION BY branch_id, seating_type_id 
                  ORDER BY id
                ))
                WHERE branch_id = ${branch.id} 
                AND seating_type_id = ${seatingType.id};
              `);
              console.log(`Updated seat numbers for MEETING_ROOM in branch ${branch.id}`);
            }
            else if (seatingType.name === 'CUBICLE') {
              await queryInterface.sequelize.query(`
                UPDATE "${dbSchema}"."seats"
                SET seat_number = CONCAT('Cubicle ', ROW_NUMBER() OVER (
                  PARTITION BY branch_id, seating_type_id 
                  ORDER BY id
                ))
                WHERE branch_id = ${branch.id} 
                AND seating_type_id = ${seatingType.id};
              `);
              console.log(`Updated seat numbers for CUBICLE in branch ${branch.id}`);
            }
            else if (seatingType.name === 'DAILY_PASS') {
              await queryInterface.sequelize.query(`
                UPDATE "${dbSchema}"."seats"
                SET seat_number = CONCAT('Daily Pass ', ROW_NUMBER() OVER (
                  PARTITION BY branch_id, seating_type_id 
                  ORDER BY id
                ))
                WHERE branch_id = ${branch.id} 
                AND seating_type_id = ${seatingType.id};
              `);
              console.log(`Updated seat numbers for DAILY_PASS in branch ${branch.id}`);
            }
          }
        }
      }
      
      console.log('Seat updates completed successfully');
    } catch (error) {
      console.error('Error updating seats:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This migration doesn't have a clean rollback since it changes data values
    // If needed, you would have to restore from a backup
    console.log('No rollback implemented for this migration - please restore from backup if needed');
  }
}; 