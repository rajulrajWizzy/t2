// Database connection test script
const { Sequelize } = require('sequelize');

// Define connection parameters from environment or defaults
const database = process.env.DB_NAME || 'excel_coworks';
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASS || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';

// Create Sequelize instance
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres',
  logging: console.log,
});

// Test function to check database connection
async function testConnection() {
  console.log('------------------------------');
  console.log('TESTING DATABASE CONNECTION');
  console.log('------------------------------');
  console.log(`Database: ${database}`);
  console.log(`Username: ${username}`);
  console.log(`Host: ${host}:${port}`);
  console.log('------------------------------');
  
  try {
    // Test basic connection
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');
    
    // Check if schema exists
    const [schemaResult] = await sequelize.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = '${schema}'
    `);
    
    if (schemaResult.length > 0) {
      console.log(`✅ Schema "${schema}" exists.`);
    } else {
      console.log(`❌ Schema "${schema}" does not exist.`);
    }
    
    // Test if tables exist
    const [tablesResult] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
      ORDER BY table_name
    `);
    
    console.log('------------------------------');
    if (tablesResult.length > 0) {
      console.log(`✅ Found ${tablesResult.length} tables in schema "${schema}":`);
      tablesResult.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log(`❌ No tables found in schema "${schema}".`);
    }
    
    // Check for sample data
    const [branchesResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM ${schema}.branches
    `);
    const branchCount = parseInt(branchesResult[0].count);
    
    const [seatsResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM ${schema}.seats
    `);
    const seatCount = parseInt(seatsResult[0].count);
    
    console.log('------------------------------');
    console.log('SAMPLE DATA CHECK:');
    console.log(`✅ Branch records: ${branchCount}`);
    console.log(`✅ Seat records: ${seatCount}`);
    
    // List some seats for testing
    if (seatCount > 0) {
      const [seatDetails] = await sequelize.query(`
        SELECT id, name, seat_number, seat_code
        FROM ${schema}.seats
        LIMIT 5
      `);
      
      console.log('------------------------------');
      console.log('SAMPLE SEAT IDs (use these for testing):');
      seatDetails.forEach(seat => {
        console.log(`   - ID: ${seat.id}`);
        console.log(`     Name: ${seat.name} (${seat.seat_number})`);
        console.log(`     Code: ${seat.seat_code}`);
        console.log('     ');
      });
    }
    
    console.log('------------------------------');
    console.log('✅ TEST COMPLETE - Database is properly configured.');
    
  } catch (error) {
    console.error('------------------------------');
    console.error('❌ CONNECTION ERROR:', error.message);
    console.error('------------------------------');
  } finally {
    await sequelize.close();
  }
}

// Run the test
testConnection(); 