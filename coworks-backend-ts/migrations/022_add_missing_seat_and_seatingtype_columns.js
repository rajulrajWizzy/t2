/**
 * Migration to add missing columns to seats and seating_types tables
 * This resolves the various "column does not exist" errors
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    let changes = 0;
    
    // ===== SEATS TABLE FIXES =====
    console.log('Checking seats table for missing columns...');
    
    // Check if the seats table exists
    const [seatsTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'seats'
      );
    `);
    
    if (seatsTableExists[0]?.exists) {
      // Get current columns in seats table
      const [seatsColumns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = '${schema}' 
        AND table_name = 'seats';
      `);
      
      const seatsColumnNames = seatsColumns.map(col => col.column_name);
      console.log('Current seats columns:', seatsColumnNames.join(', '));
      
      // Add missing columns to seats table
      const seatsMissingColumns = [
        {
          name: 'price',
          type: 'DECIMAL(10, 2)',
          nullable: true
        },
        {
          name: 'capacity',
          type: 'INTEGER',
          nullable: true
        },
        {
          name: 'is_configurable',
          type: 'BOOLEAN',
          nullable: false,
          default: 'FALSE'
        },
        {
          name: 'availability_status',
          type: 'VARCHAR(20)',
          nullable: true,
          default: "'available'"
        }
      ];
      
      for (const column of seatsMissingColumns) {
        if (!seatsColumnNames.includes(column.name)) {
          const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
          const nullableClause = column.nullable ? '' : 'NOT NULL';
          
          await sequelize.query(`
            ALTER TABLE "${schema}"."seats"
            ADD COLUMN "${column.name}" ${column.type} ${nullableClause} ${defaultClause};
          `);
          
          console.log(`✅ Added '${column.name}' column to seats table`);
          changes++;
        } else {
          console.log(`ℹ️ Column '${column.name}' already exists in seats table`);
        }
      }
      
      // If status column exists but availability_status doesn't, copy data
      if (seatsColumnNames.includes('status') && seatsColumnNames.includes('availability_status')) {
        await sequelize.query(`
          UPDATE "${schema}"."seats"
          SET "availability_status" = "status"
          WHERE "availability_status" IS NULL;
        `);
        console.log('✅ Copied status data to availability_status column');
        changes++;
      }
    } else {
      console.log('⚠️ Seats table does not exist, skipping seat columns fixes');
    }
    
    // ===== SEATING_TYPES TABLE FIXES =====
    console.log('\nChecking seating_types table for missing columns...');
    
    // Check if the seating_types table exists
    const [seatingTypesTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'seating_types'
      );
    `);
    
    if (seatingTypesTableExists[0]?.exists) {
      // Get current columns in seating_types table
      const [seatingTypesColumns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = '${schema}' 
        AND table_name = 'seating_types';
      `);
      
      const seatingTypesColumnNames = seatingTypesColumns.map(col => col.column_name);
      console.log('Current seating_types columns:', seatingTypesColumnNames.join(', '));
      
      // Add missing columns to seating_types table
      const seatingTypesMissingColumns = [
        {
          name: 'is_hourly',
          type: 'BOOLEAN',
          nullable: false,
          default: 'TRUE'
        },
        {
          name: 'min_booking_duration',
          type: 'INTEGER',
          nullable: true,
          default: '60'
        },
        {
          name: 'min_seats',
          type: 'INTEGER',
          nullable: true,
          default: '1'
        },
        {
          name: 'capacity_options',
          type: 'JSON',
          nullable: true
        },
        {
          name: 'quantity_options',
          type: 'JSON',
          nullable: true
        },
        {
          name: 'cost_multiplier',
          type: 'DECIMAL(5, 2)',
          nullable: true,
          default: '1.0'
        }
      ];
      
      for (const column of seatingTypesMissingColumns) {
        if (!seatingTypesColumnNames.includes(column.name)) {
          const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
          const nullableClause = column.nullable ? '' : 'NOT NULL';
          
          await sequelize.query(`
            ALTER TABLE "${schema}"."seating_types"
            ADD COLUMN "${column.name}" ${column.type} ${nullableClause} ${defaultClause};
          `);
          
          console.log(`✅ Added '${column.name}' column to seating_types table`);
          changes++;
        } else {
          console.log(`ℹ️ Column '${column.name}' already exists in seating_types table`);
        }
      }
      
      // Set is_hourly based on hourly_rate
      if (seatingTypesColumnNames.includes('is_hourly') && seatingTypesColumnNames.includes('hourly_rate')) {
        await sequelize.query(`
          UPDATE "${schema}"."seating_types"
          SET "is_hourly" = CASE WHEN "hourly_rate" IS NOT NULL AND "hourly_rate" > 0 THEN TRUE ELSE FALSE END;
        `);
        console.log('✅ Set is_hourly based on hourly_rate values');
        changes++;
      }
    } else {
      console.log('⚠️ Seating_types table does not exist, skipping seating type columns fixes');
    }
    
    if (changes > 0) {
      console.log(`\n✅ Successfully applied ${changes} changes to database schema`);
      return true;
    } else {
      console.log('\nℹ️ No changes were necessary, all required columns already exist');
      return false;
    }
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
    throw error;
  }
}; 