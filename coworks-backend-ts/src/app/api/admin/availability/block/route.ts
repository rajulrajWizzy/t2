import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';

// Define the request body interface
interface BlockSeatRequest {
  seat_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes?: string;
  created_by?: string;
}

// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: BlockSeatRequest = await request.json();
    console.log('Request to block seat:', body);
    
    // Validate required fields
    if (!body.seat_id || !body.start_time || !body.end_time || !body.reason) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'seat_id, start_time, end_time, and reason are required'
      }, { status: 400 });
    }

    // Ensure dates are valid
    try {
      new Date(body.start_time);
      new Date(body.end_time);
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid date format',
        details: 'start_time and end_time must be valid date strings'
      }, { status: 400 });
    }

    // Check if end_time is after start_time
    if (new Date(body.end_time) <= new Date(body.start_time)) {
      return NextResponse.json({
        error: 'Invalid time range',
        details: 'end_time must be after start_time'
      }, { status: 400 });
    }

    // First, verify the seat exists
    const seatQuery = `
      SELECT id, name, branch_id 
      FROM excel_coworks_schema.seats 
      WHERE id = '${body.seat_id}'
    `;
    
    const [seatsResult] = await models.sequelize.query(seatQuery);
    if (!seatsResult || seatsResult.length === 0) {
      return NextResponse.json({
        error: 'Seat not found',
        details: `Seat with ID ${body.seat_id} does not exist`
      }, { status: 404 });
    }

    // Create maintenance_blocks table if it doesn't exist
    try {
      await models.sequelize.query(`
        -- Create the uuid extension if it doesn't exist
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        CREATE TABLE IF NOT EXISTS excel_coworks_schema.maintenance_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seat_id UUID REFERENCES excel_coworks_schema.seats(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID,
          notes TEXT
        );
      `);
    } catch (error: any) {
      console.warn("Error creating maintenance_blocks table:", error);
      // Continue as table might already exist
    }

    // Check for conflicting bookings
    const conflictQuery = `
      SELECT id, start_time, end_time, status
      FROM excel_coworks_schema.bookings
      WHERE 
        seat_id = '${body.seat_id}'
        AND status = 'confirmed'
        AND (
          (start_time BETWEEN '${body.start_time}' AND '${body.end_time}')
          OR (end_time BETWEEN '${body.start_time}' AND '${body.end_time}')
          OR (start_time <= '${body.start_time}' AND end_time >= '${body.end_time}')
        )
    `;

    const [conflictsResult] = await models.sequelize.query(conflictQuery);
    if (conflictsResult && conflictsResult.length > 0) {
      return NextResponse.json({
        error: 'Booking conflict',
        details: 'There are existing bookings that conflict with this maintenance block',
        conflicts: conflictsResult
      }, { status: 409 });
    }

    // Insert the maintenance block
    const insertQuery = `
      INSERT INTO excel_coworks_schema.maintenance_blocks 
      (seat_id, start_time, end_time, reason, created_by, notes)
      VALUES 
      (
        '${body.seat_id}', 
        '${body.start_time}', 
        '${body.end_time}', 
        '${body.reason}',
        ${body.created_by ? `'${body.created_by}'` : 'NULL'},
        ${body.notes ? `'${body.notes}'` : 'NULL'}
      )
      RETURNING id, seat_id, start_time, end_time, reason, created_at
    `;

    const [insertResult] = await models.sequelize.query(insertQuery);
    
    return NextResponse.json({
      message: 'Maintenance block created successfully',
      block: insertResult[0]
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating maintenance block:', error);
    return NextResponse.json({
      error: 'Failed to create maintenance block',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
} 