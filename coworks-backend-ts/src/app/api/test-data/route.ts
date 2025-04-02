// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

// POST endpoint to create test data
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Starting test data creation...');
    
    // Step 1: Check if we have any seating types with 'MR' code
    const [existingMR] = await models.sequelize.query(`
      SELECT id FROM excel_coworks_schema.seating_types WHERE short_code = 'MR'
    `) as [any[], unknown];
    
    // Step 2: Create or update the MR seating type
    let seatingTypeId: number;
    
    if (existingMR && existingMR.length > 0) {
      seatingTypeId = existingMR[0].id;
      console.log(`Using existing Meeting Room seating type with ID ${seatingTypeId}`);
      
      // Update it to ensure all fields are set correctly
      await models.sequelize.query(`
        UPDATE excel_coworks_schema.seating_types 
        SET name = 'Meeting Room',
            description = 'Conference room for meetings', 
            hourly_rate = 300.00,
            daily_rate = 1500.00,
            weekly_rate = 9000.00,
            monthly_rate = 30000.00,
            capacity = 10,
            is_meeting_room = true,
            is_active = true,
            is_hourly = true,
            min_booking_duration = 1,
            min_seats = 2
        WHERE id = ${seatingTypeId}
      `);
    } else {
      // Create new seating type
      const [newSeatingType] = await models.sequelize.query(`
        INSERT INTO excel_coworks_schema.seating_types 
        (name, description, hourly_rate, daily_rate, weekly_rate, monthly_rate, capacity, is_meeting_room, is_active, short_code, is_hourly, min_booking_duration, min_seats)
        VALUES
        ('Meeting Room', 'Conference room for meetings', 300.00, 1500.00, 9000.00, 30000.00, 10, true, true, 'MR', true, 1, 2)
        RETURNING id
      `) as [any[], unknown];
      
      seatingTypeId = newSeatingType[0].id;
      console.log(`Created new Meeting Room seating type with ID ${seatingTypeId}`);
    }
    
    // Step 3: Create a branch for testing if it doesn't exist
    const [existingBranch] = await models.sequelize.query(`
      SELECT id FROM excel_coworks_schema.branches WHERE short_code = 'MRB'
    `) as [any[], unknown];
    
    let branchId: number;
    
    if (existingBranch && existingBranch.length > 0) {
      branchId = existingBranch[0].id;
      console.log(`Using existing Meeting Room Branch with ID ${branchId}`);
    } else {
      const [newBranch] = await models.sequelize.query(`
        INSERT INTO excel_coworks_schema.branches
        (name, address, location, latitude, longitude, cost_multiplier, opening_time, closing_time, is_active, short_code)
        VALUES
        ('Meeting Room Branch', '100 Meeting St', 'Downtown', 40.7128, -74.0060, 1.0, '08:00:00', '20:00:00', true, 'MRB')
        RETURNING id
      `) as [any[], unknown];
      
      branchId = newBranch[0].id;
      console.log(`Created new Meeting Room Branch with ID ${branchId}`);
    }
    
    // Step 4: Create seats if they don't exist
    const [existingSeats] = await models.sequelize.query(`
      SELECT id FROM excel_coworks_schema.seats 
      WHERE branch_id = ${branchId} AND seating_type_id = ${seatingTypeId}
    `) as [any[], unknown];
    
    if (existingSeats && existingSeats.length > 0) {
      console.log(`Found ${existingSeats.length} existing seats for this branch and seating type`);
    } else {
      // Create 3 seats
      await models.sequelize.query(`
        INSERT INTO excel_coworks_schema.seats
        (branch_id, seating_type_id, seat_number, price, capacity, is_configurable, availability_status, seat_code)
        VALUES
        (${branchId}, ${seatingTypeId}, 'MR-001', 300.00, 8, true, 'available', 'MR-MRB-001'),
        (${branchId}, ${seatingTypeId}, 'MR-002', 300.00, 12, true, 'available', 'MR-MRB-002'),
        (${branchId}, ${seatingTypeId}, 'MR-003', 300.00, 16, true, 'available', 'MR-MRB-003')
      `);
      
      console.log('Created 3 new seats for this branch and seating type');
    }
    
    // Step 5: Verify what was created
    const [verificationData] = await models.sequelize.query(`
      SELECT 
          b.id AS branch_id, 
          b.name AS branch_name, 
          b.short_code,
          s.id AS seat_id,
          s.seat_number,
          s.seat_code,
          st.id AS seating_type_id,
          st.name AS seating_type_name,
          st.short_code AS seating_type_code
      FROM 
          excel_coworks_schema.branches b
      JOIN 
          excel_coworks_schema.seats s ON b.id = s.branch_id
      JOIN 
          excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
      WHERE 
          st.short_code = 'MR'
    `) as [any[], unknown];
    
    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: verificationData
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Error creating test data:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to create test data',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 