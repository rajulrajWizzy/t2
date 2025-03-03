import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { SeatInput } from '@/types/seating';

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
    const seats = await models.Seat.findAll({
      where: whereConditions,
      include: [
        {
          model: models.Branch,
          attributes: ['name', 'address', 'location']
        },
        {
          model: models.SeatingType,
          attributes: ['name', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration']
        }
      ],
      order: [['id', 'ASC']]
    });
    
    const response: ApiResponse = {
      success: true,
      data: seats
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching seats:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch seats',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST create a new seat
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as SeatInput;
    const { branch_id, seating_type_id, seat_number, price } = body;
    
    // Basic validation
    if (!branch_id || !seating_type_id || !seat_number || !price) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch ID, seating type ID, seat number, and price are required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch not found'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if seating type exists
    const seatingType = await models.SeatingType.findByPk(seating_type_id);
    if (!seatingType) {
      const response: ApiResponse = {
        success: false,
        message: 'Seating type not found'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if seat number already exists for this branch
    const existingSeat = await models.Seat.findOne({
      where: {
        branch_id,
        seat_number
      }
    });
    
    if (existingSeat) {
      const response: ApiResponse = {
        success: false,
        message: 'Seat number already exists for this branch'
      };
      
      return NextResponse.json(response, { status: 409 });
    }
    
    // Create a new seat
    const seat = await models.Seat.create({
      branch_id,
      seating_type_id,
      seat_number,
      price,
      availability_status: body.availability_status || 'AVAILABLE'
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Seat created successfully',
      data: seat
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating seat:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create seat',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}