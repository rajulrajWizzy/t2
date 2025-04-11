// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { Op } from 'sequelize';

// POST endpoint to create test data
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Starting test data creation...');
    
    // Step 1: Check if we have any seating types with 'MR' code
    const existingMR = await models.SeatingType.findOne({
      where: { short_code: 'MR' }
    });
    
    // Step 2: Create or update the MR seating type
    let seatingTypeId: number;
    
    if (existingMR) {
      seatingTypeId = existingMR.id;
      console.log(`Using existing Meeting Room seating type with ID ${seatingTypeId}`);
      
      // Update it to ensure all fields are set correctly
      await existingMR.update({
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
      const newSeatingType = await models.SeatingType.create({
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
      
      seatingTypeId = newSeatingType.id;
      console.log(`Created new Meeting Room seating type with ID ${seatingTypeId}`);
    }
    
    // Step 3: Create a branch for testing if it doesn't exist
    const existingBranch = await models.Branch.findOne({
      where: { short_code: 'MRB' }
    });
    
    let branchId: number;
    
    if (existingBranch) {
      branchId = existingBranch.id;
      console.log(`Using existing Meeting Room Branch with ID ${branchId}`);
    } else {
      const newBranch = await models.Branch.create({
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
      
      branchId = newBranch.id;
      console.log(`Created new Meeting Room Branch with ID ${branchId}`);
    }
    
    // Step 4: Create seats if they don't exist
    const existingSeats = await models.Seat.findAll({
      where: {
        branch_id: branchId,
        seating_type_id: seatingTypeId
      }
    });
    
    if (existingSeats && existingSeats.length > 0) {
      console.log(`Found ${existingSeats.length} existing seats for this branch and seating type`);
    } else {
      // Create 3 seats
      await models.Seat.bulkCreate([
        {
          branch_id: branchId,
          seating_type_id: seatingTypeId,
          seat_number: 'MR-001',
          price: 300.00,
          capacity: 8,
          is_configurable: true,
          availability_status: 'AVAILABLE',
          seat_code: 'MR-MRB-001'
        },
        {
          branch_id: branchId,
          seating_type_id: seatingTypeId,
          seat_number: 'MR-002',
          price: 300.00,
          capacity: 12,
          is_configurable: true,
          availability_status: 'AVAILABLE',
          seat_code: 'MR-MRB-002'
        },
        {
          branch_id: branchId,
          seating_type_id: seatingTypeId,
          seat_number: 'MR-003',
          price: 300.00,
          capacity: 16,
          is_configurable: true,
          availability_status: 'AVAILABLE',
          seat_code: 'MR-MRB-003'
        }
      ]);
      
      console.log('Created 3 new seats for this branch and seating type');
    }
    
    // Step 5: Verify what was created
    const verificationData = await models.Seat.findAll({
      where: {
        branch_id: branchId,
        seating_type_id: seatingTypeId
      },
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        }
      ]
    });
    
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