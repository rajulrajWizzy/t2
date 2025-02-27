// app/api/seating-types/route.js
import { NextResponse } from 'next/server';
import SeatingType from '../../../models/seatingtype';
import { verifyToken } from '../../../config/jwt.js';

// GET all seating types
export async function GET() {
  try {
    const seatingTypes = await SeatingType.findAll();
    return NextResponse.json({
      success: true,
      data: seatingTypes
    });
  } catch (error) {
    console.error('Error fetching seating types:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch seating types', error: error.message },
      { status: 500 }
    );
  }
}

// POST create a new seating type
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
    const { name, description, hourly_rate, is_hourly, min_booking_duration } = body;
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Check if seating type already exists
    const existingType = await SeatingType.findOne({ where: { name } });
    if (existingType) {
      return NextResponse.json(
        { success: false, message: 'Seating type already exists' },
        { status: 409 }
      );
    }
    
    // Create a new seating type
    const seatingType = await SeatingType.create({
      name,
      description,
      hourly_rate: hourly_rate || 0.00,
      is_hourly: is_hourly !== undefined ? is_hourly : true,
      min_booking_duration: min_booking_duration || 2
    });
    
    return NextResponse.json(
      { success: true, message: 'Seating type created successfully', data: seatingType },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating seating type:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create seating type', error: error.message },
      { status: 500 }
    );
  }
}