require('dotenv').config();
const { Sequelize } = require('sequelize');

// Define seating type enum values
const SeatingTypeEnum = {
  HOT_DESK: 'HOT_DESK',
  DEDICATED_DESK: 'DEDICATED_DESK',
  CUBICLE: 'CUBICLE',
  MEETING_ROOM: 'MEETING_ROOM',
  DAILY_PASS: 'DAILY_PASS'
};

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    schema: 'excel_coworks_schema',
    logging: console.log
  }
);

async function updateSeatingPrices() {
  try {
    // Define pricing for different seating types
    const seatingTypes = [
      {
        name: SeatingTypeEnum.HOT_DESK,
        description: 'Flexible hot desk seating',
        hourly_rate: 50,    // ₹50 per hour
        daily_rate: 400,    // ₹400 per day
        weekly_rate: 2000,  // ₹2,000 per week
        monthly_rate: 8000, // ₹8,000 per month
        is_hourly: true,
        is_daily: true,
        is_weekly: true,
        is_monthly: true,
        min_booking_duration: 1,
        min_seats: 1
      },
      {
        name: SeatingTypeEnum.DEDICATED_DESK,
        description: 'Dedicated desk with personal storage',
        hourly_rate: 75,    // ₹75 per hour
        daily_rate: 600,    // ₹600 per day
        weekly_rate: 3000,  // ₹3,000 per week
        monthly_rate: 12000, // ₹12,000 per month
        is_hourly: true,
        is_daily: true,
        is_weekly: true,
        is_monthly: true,
        min_booking_duration: 1,
        min_seats: 1
      },
      {
        name: SeatingTypeEnum.CUBICLE,
        description: 'Private cubicle with enhanced privacy',
        hourly_rate: 100,   // ₹100 per hour
        daily_rate: 800,    // ₹800 per day
        weekly_rate: 4000,  // ₹4,000 per week
        monthly_rate: 16000, // ₹16,000 per month
        is_hourly: true,
        is_daily: true,
        is_weekly: true,
        is_monthly: true,
        min_booking_duration: 1,
        min_seats: 1
      },
      {
        name: SeatingTypeEnum.MEETING_ROOM,
        description: 'Private meeting room for team discussions',
        hourly_rate: 500,   // ₹500 per hour
        daily_rate: 4000,   // ₹4,000 per day
        weekly_rate: 20000, // ₹20,000 per week
        monthly_rate: 80000, // ₹80,000 per month
        is_hourly: true,
        is_daily: true,
        is_weekly: true,
        is_monthly: true,
        min_booking_duration: 1,
        min_seats: 4
      },
      {
        name: SeatingTypeEnum.DAILY_PASS,
        description: 'Day pass for flexible workspace access',
        hourly_rate: 0,     // Not available hourly
        daily_rate: 300,    // ₹300 per day
        weekly_rate: 1500,  // ₹1,500 per week
        monthly_rate: 6000, // ₹6,000 per month
        is_hourly: false,
        is_daily: true,
        is_weekly: true,
        is_monthly: true,
        min_booking_duration: 1,
        min_seats: 1
      }
    ];

    console.log('Starting to update seating type prices...');

    // Update each seating type
    for (const seatingType of seatingTypes) {
      const [updated] = await sequelize.query(
        `UPDATE "excel_coworks_schema"."seating_types"
         SET description = :description,
             hourly_rate = :hourly_rate,
             daily_rate = :daily_rate,
             weekly_rate = :weekly_rate,
             monthly_rate = :monthly_rate,
             is_hourly = :is_hourly,
             is_daily = :is_daily,
             is_weekly = :is_weekly,
             is_monthly = :is_monthly,
             min_booking_duration = :min_booking_duration,
             min_seats = :min_seats,
             updated_at = NOW()
         WHERE name = :name`,
        {
          replacements: seatingType,
          type: sequelize.QueryTypes.UPDATE
        }
      );

      if (updated > 0) {
        console.log(`Updated pricing for ${seatingType.name}`);
      } else {
        console.log(`No update needed for ${seatingType.name}`);
      }
    }

    console.log('Finished updating seating type prices');
  } catch (error) {
    console.error('Error updating seating type prices:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateSeatingPrices().catch(console.error); 