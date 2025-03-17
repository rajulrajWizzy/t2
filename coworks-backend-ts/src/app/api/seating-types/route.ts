import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { SeatingType, SeatingTypeInput } from '@/types/seating';
import { UserRole } from '@/types/auth';
import validation from '@/utils/validation';

// GET all seating types
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get all seating types
    const seatingTypes = await models.SeatingType.findAll();

    const response: ApiResponse<SeatingType[]> = {
      success: true,
      message: 'Seating types retrieved successfully',
      data: seatingTypes
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching seating types:', error);
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch seating types',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST create a new seating type
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Check if user is admin
    if (decoded.role !== UserRole.SUPER_ADMIN) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Only super admin can create seating types',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse the request body
    const body = await request.json() as SeatingTypeInput;
    const { name, description, hourly_rate, is_hourly, min_booking_duration, min_seats, short_code } = body;
    
    // Validate input
    if (!name) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Name is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Name validation - check for blank or whitespace-only names
    if (!validation.isValidName(name.toString())) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Name cannot be empty or contain only whitespace',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if seating type already exists
    const existingType = await models.SeatingType.findOne({ where: { name } });
    if (existingType) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Seating type already exists',
        data: null
      };
      
      return NextResponse.json(response, { status: 409 });
    }
    
    // Create a new seating type
    const seatingType = await models.SeatingType.create({
      name,
      description,
      hourly_rate: hourly_rate || 0.00,
      is_hourly: is_hourly !== undefined ? is_hourly : true,
      min_booking_duration: min_booking_duration || 2,
      min_seats: min_seats || 1,
      short_code: short_code || undefined
    });
    
    const response: ApiResponse<SeatingType> = {
      success: true,
      message: 'Seating type created successfully',
      data: seatingType
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating seating type:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to create seating type',
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}