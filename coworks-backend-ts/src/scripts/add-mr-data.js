// Simple script to add test meeting room data for API testing
const { Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const models = require('../../models');

async function addMeetingRoomData() {
  try {
    console.log('Starting to add meeting room test data...');
    
    // Check if the Meeting Room seating type exists
    let seatingType = await models.SeatingType.findOne({
      where: { short_code: 'MR' }
    });
    
    // Create or update the seating type
    if (seatingType) {
      console.log(`Using existing Meeting Room seating type with ID ${seatingType.id}`);
      
      // Update to ensure all fields are correct
      await seatingType.update({
        name: 'Meeting Room',
        description: 'Conference room for meetings',
        hourly_rate: 300.00,
        daily_rate: 1500.00,
        weekly_rate: 9000.00,
        monthly_rate: 30000.00,
        capacity: 10,
        is_meeting_room: true,
        is_active: true,
        is_hourly: true,
        min_booking_duration: 1,
        min_seats: 2
      });
    } else {
      // Create new seating type
      seatingType = await models.SeatingType.create({
        name: 'Meeting Room',
        description: 'Conference room for meetings',
        hourly_rate: 300.00,
        daily_rate: 1500.00,
        weekly_rate: 9000.00,
        monthly_rate: 30000.00,
        capacity: 10,
        is_meeting_room: true,
        is_active: true,
        short_code: 'MR',
        is_hourly: true,
        min_booking_duration: 1,
        min_seats: 2
      });
      console.log(`Created new Meeting Room seating type with ID ${seatingType.id}`);
    }
    
    // Check if the Meeting Room branch exists
    let branch = await models.Branch.findOne({
      where: { short_code: 'MRB' }
    });
    
    // Create branch if it doesn't exist
    if (branch) {
      console.log(`Using existing Meeting Room Branch with ID ${branch.id}`);
    } else {
      branch = await models.Branch.create({
        name: 'Meeting Room Branch',
        address: '100 Meeting St',
        location: 'Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        cost_multiplier: 1.0,
        opening_time: '08:00:00',
        closing_time: '20:00:00',
        is_active: true,
        short_code: 'MRB'
      });
      console.log(`Created new Meeting Room Branch with ID ${branch.id}`);
    }
    
    // Check if seats exist for this branch and seating type
    const existingSeats = await models.Seat.findAll({
      where: {
        branch_id: branch.id,
        seating_type_id: seatingType.id
      }
    });
    
    if (existingSeats.length > 0) {
      console.log(`Found ${existingSeats.length} existing seats for this branch and seating type`);
    } else {
      // Create seats
      await models.Seat.bulkCreate([
        {
          branch_id: branch.id,
          seating_type_id: seatingType.id,
          seat_number: 'MR-001',
          price: 300.00,
          capacity: 8,
          is_configurable: true,
          availability_status: 'available',
          seat_code: 'MR-MRB-001'
        },
        {
          branch_id: branch.id,
          seating_type_id: seatingType.id,
          seat_number: 'MR-002',
          price: 300.00,
          capacity: 12,
          is_configurable: true,
          availability_status: 'available',
          seat_code: 'MR-MRB-002'
        },
        {
          branch_id: branch.id,
          seating_type_id: seatingType.id,
          seat_number: 'MR-003',
          price: 300.00,
          capacity: 16,
          is_configurable: true,
          availability_status: 'available',
          seat_code: 'MR-MRB-003'
        }
      ]);
      console.log('Created 3 new seats for this branch and seating type');
    }
    
    // Verify the data
    const verificationData = await models.Branch.findOne({
      where: { id: branch.id },
      include: [
        {
          model: models.Seat,
          as: 'Seats',
          where: { seating_type_id: seatingType.id },
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType'
            }
          ]
        }
      ]
    });
    
    console.log('Test data created successfully. Branch details:');
    console.log(`- Branch ID: ${verificationData.id}`);
    console.log(`- Branch Name: ${verificationData.name}`);
    console.log(`- Branch Short Code: ${verificationData.short_code}`);
    console.log(`- Seats Count: ${verificationData.Seats.length}`);
    
    console.log('Meeting room data creation completed successfully!');
    
  } catch (error) {
    console.error('Error adding meeting room data:', error);
  } finally {
    // Close the database connection and exit
    await models.sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the script
addMeetingRoomData(); 