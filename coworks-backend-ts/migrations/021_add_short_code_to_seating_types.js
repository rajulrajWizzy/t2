/**
 * Migration to add short_code column to seating_types table
 * This resolves the "column short_code does not exist" error
 */
module.exports = async (sequelize, DataTypes) => {
  try {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    // Check if the seating_types table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'seating_types'
      );
    `);
    
    const exists = tableExists[0]?.exists || false;
    console.log(`Seating types table exists: ${exists}`);
    
    if (exists) {
      // Check if the short_code column already exists
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'seating_types'
          AND column_name = 'short_code'
        );
      `);
      
      const hasColumn = columnExists[0]?.exists || false;
      
      if (!hasColumn) {
        console.log('Adding short_code column to seating_types table');
        await sequelize.query(`
          ALTER TABLE "${schema}"."seating_types"
          ADD COLUMN "short_code" VARCHAR(50) NULL;
        `);
        
        // Update existing records to generate short_code from their name
        console.log('Updating existing seating types with generated short_code values');
        
        // First get all seating types
        const [seatingTypes] = await sequelize.query(`
          SELECT id, name 
          FROM "${schema}"."seating_types" 
          WHERE short_code IS NULL;
        `);
        
        for (const type of seatingTypes) {
          // Create a code from first letter of each word + id
          const code = type.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase() + String(type.id).padStart(2, '0');
            
          await sequelize.query(`
            UPDATE "${schema}"."seating_types"
            SET short_code = :code
            WHERE id = :id
          `, {
            replacements: { code, id: type.id }
          });
        }
        
        console.log('✅ short_code column added and populated successfully');
      } else {
        console.log('✅ short_code column already exists');
      }
      
      return true;
    } else {
      console.log('Seating types table does not exist, nothing to modify');
      return false;
    }
  } catch (error) {
    console.error('Error adding short_code column:', error);
    throw error;
  }
}; 