// app/api/slots/route.js
import { NextResponse } from 'next/server';
import TimeSlot from '../../../models/timeSlot.js';
import Branch from '../../../models/branch.js';
import Seat from '../../../models/seat.js';
import { Op } from 'sequelize';
import { verifyToken } from '../../../config/jwt.js';

// GET slots based on filters
export async function GET(request) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const seat_id = url.searchParams.get('seat_id');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Validate required filters
    if (!branch_id) {
      return NextResponse.json(
        { success: false, message: 'Branch ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare filter conditions
    const whereConditions = {
      branch_id,
      date,
      is_available: true,
    };
    
    // Add seat_id filter if provided
    if (seat_id) {
      whereConditions.seat_id = seat_id;
    }
    
    // Find available time slots
    const timeSlots = await TimeSlot.findAll({
      where: whereConditions,
      order: [['start_time', 'ASC']],
      include: [
        {
          model: Branch,
          attributes: ['name', 'address']
        },
        {
          model: Seat,
          attributes: ['seat_number', 'price', 'seating_type_id']
        }
      ]
    });
    
    return NextResponse.json({
      success: true,
      data: timeSlots
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch time slots', error: error.message },
      { status: 500 }
    );
  }
}

// Generate time slots for a specific date and branch
export async function POST(request) {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { branch_id, date, regenerate } = body;
    
    // Validate input
    if (!branch_id || !date) {
      return NextResponse.json(
        { success: false, message: 'Branch ID and date are required' },
        { status: 400 }
      );
    }
    
    // Check if branch exists
    const branch = await Branch.findByPk(branch_id);
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // If regenerate is true, delete existing slots for this branch and date
    if (regenerate) {
      await TimeSlot.destroy({
        where: {
          branch_id,
          date,
          is_available: true, // Only delete available slots
          booking_id: null    // Don't delete booked slots
        }
      });
    }
    
    // Check if slots already exist
    const existingSlots = await TimeSlot.count({
      where: {
        branch_id,
        date
      }
    });
    
    if (existingSlots > 0 && !regenerate) {
      return NextResponse.json({
        success: false,
        message: 'Time slots already exist for this branch and date. Set regenerate to true to recreate.',
        count: existingSlots
      });
    }
    
    // Get all seats for this branch
    const seats = await Seat.findAll({
      where: {
        branch_id,
        availability_status: 'AVAILABLE'
      }
    });
    
    if (seats.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No available seats found for this branch' },
        { status: 404 }
      );
    }
    
    // Parse branch opening and closing hours
    const opening = branch.opening_time.split(':');
    const closing = branch.closing_time.split(':');
    
    const startHour = parseInt(opening[0]);
    const endHour = parseInt(closing[0]);
    
    // Create slots (2-hour intervals from opening to closing)
    const newSlots = [];
    
    for (const seat of seats) {
      for (let hour = startHour; hour < endHour; hour += 2) {
        // Create time strings (HH:00:00 format)
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${(hour + 2).toString().padStart(2, '0')}:00:00`;
        
        newSlots.push({
          branch_id,
          seat_id: seat.id,
          date,
          start_time: startTime,
          end_time: endTime,
          is_available: true,
          booking_id: null
        });
      }
    }
    
    // Bulk create slots
    const createdSlots = await TimeSlot.bulkCreate(newSlots);
    
    return NextResponse.json({
      success: true,
      message: 'Time slots created successfully',
      count: createdSlots.length
    });
  } catch (error) {
    console.error('Error creating time slots:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create time slots', error: error.message },
      { status: 500 }
    );
  }
}