import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { SeatInput } from '@/types/seating';
import { AvailabilityStatusEnum } from '@/types/seating';

// GET all seats or filter by branch_id
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const seating_type_id = url.searchParams.get('seating_type_id');
    
    // Prepare filter conditions
    const whereConditions: any = {};
    
    // Filter by branch_id if provided
    if (branch_id) {
      whereConditions.branch_id = parseInt(branch_id);
    }
    
    // Filter by seating_type_id if provided
    if (seating_type_id) {
      whereConditions.seating_type_id = parseInt(seating_type_id);
    }
    
    // Find seats with associated branch and seating type
    // Give explicit aliases to avoid conflicts
    const seats = await models.Seat.findAll({
      where: whereConditions,
      include: [
        {
          model: models.Branch,
          as: 'Branch', // Add explicit alias
          attributes: ['name', 'address', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType', // Add explicit alias
          attributes: ['name', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration']
        }
      ],
      order: [['id', 'ASC']]
    });
    
    return NextResponse.json({
      success: true,
      data: seats
    });
  } catch (error) {
    console.error('Error fetching seats:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch seats',
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST create a new seat
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as SeatInput;
    const { branch_id, seating_type_id, seat_number, price } = body;
    
    // Basic validation
    if (!branch_id || !seating_type_id || !seat_number || !price) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID, seating type ID, seat number, and price are required'
      }, { status: 400 });
    }
    
    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      return NextResponse.json({
        success: false,
        message: 'Branch not found'
      }, { status: 404 });
    }
    
    // Check if seating type exists
    const seatingType = await models.SeatingType.findByPk(seating_type_id);
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404 });
    }
    
    // Check if seat number already exists for this branch
    const existingSeat = await models.Seat.findOne({
      where: {
        branch_id,
        seat_number
      }
    });
    
    if (existingSeat) {
      return NextResponse.json({
        success: false,
        message: 'Seat number already exists for this branch'
      }, { status: 409 });
    }
    
    // Create a new seat
    const seat = await models.Seat.create({
      branch_id,
      seating_type_id,
      seat_number,
      price,
      availability_status: body.availability_status || AvailabilityStatusEnum.AVAILABLE
    });
    
    return NextResponse.json({
      success: true,
      message: 'Seat created successfully',
      data: seat
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating seat:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create seat',
      error: (error as Error).message
    }, { status: 500 });
  }
}