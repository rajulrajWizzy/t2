import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/utils/jwt';
import { SeatInput } from '@/types/seating';
import { AvailabilityStatusEnum } from '@/types/seating';
import validation from '@/utils/validation';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET all seats or filter by branch_id and seating_type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const seating_type_id = url.searchParams.get('seating_type_id');
    const seating_type_code = url.searchParams.get('seating_type_code');
    
    // Prepare filter conditions
    const whereConditions: any = {};
    
    // Filter by branch_id if provided
    if (branch_id) {
      const branchIdNum = parseInt(branch_id);
      if (isNaN(branchIdNum)) {
        return NextResponse.json({
          success: false,
          message: 'Branch ID must be a valid number'
        }, { status: 400, headers: corsHeaders });
      }
      whereConditions.branch_id = branchIdNum;
    }
    
    // Prepare the query
    const query: any = {
      where: whereConditions,
      order: [['seat_number', 'ASC']]
    };
    
    // Add includes
    query.include = [];
    
    // Add Branch association with the correct alias
    query.include.push({
      model: models.Branch,
      as: 'Branch', // Ensure this matches the model's association alias
      attributes: ['name', 'address', 'location', 'short_code']
    });
    
    // Add SeatingType association with filtering if needed
    const seatingTypeInclude: any = {
      model: models.SeatingType,
      as: 'SeatingType', // Ensure this matches the model's association alias
      attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration']
    };
    
    // Add filtering for seating type if provided
    if (seating_type_id) {
      const seatingTypeIdNum = parseInt(seating_type_id);
      if (isNaN(seatingTypeIdNum)) {
        return NextResponse.json({
          success: false,
          message: 'Seating type ID must be a valid number'
        }, { status: 400, headers: corsHeaders });
      }
      seatingTypeInclude.where = { id: seatingTypeIdNum };
    } else if (seating_type_code) {
      seatingTypeInclude.where = { short_code: seating_type_code };
    }
    
    query.include.push(seatingTypeInclude);
    
    // Find seats with associations
    const seats = await models.Seat.findAll(query);
    
    // Filter out seats that don't have a matching seating type if filters were applied
    let filteredSeats = seats;
    if (seating_type_id || seating_type_code) {
      filteredSeats = seats.filter(seat => seat.SeatingType !== null);
    }
    
    return NextResponse.json({
      success: true,
      data: filteredSeats,
      meta: {
        total: filteredSeats.length,
        filters: {
          branch_id: branch_id || null,
          seating_type_id: seating_type_id || null,
          seating_type_code: seating_type_code || null
        }
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Seats API] Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch seats',
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
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
      }, { status: 401, headers: corsHeaders });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401, headers: corsHeaders });
    }
    
    // Parse the request body
    const body = await request.json() as SeatInput;
    const { branch_id, seating_type_id, seat_number, price } = body;
    
    // Basic validation
    if (!branch_id || !seating_type_id || !seat_number || !price) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID, seating type ID, seat number, and price are required'
      }, { status: 400, headers: corsHeaders });
    }
    
    // Validate parameter types
    if (typeof branch_id !== 'number' || isNaN(branch_id)) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID must be a valid number'
      }, { status: 400, headers: corsHeaders });
    }
    
    if (typeof seating_type_id !== 'number' || isNaN(seating_type_id)) {
      return NextResponse.json({
        success: false,
        message: 'Seating type ID must be a valid number'
      }, { status: 400, headers: corsHeaders });
    }
    
    // Validate seat number format
    if (!validation.isValidSeatNumber(seat_number)) {
      return NextResponse.json({
        success: false,
        message: validation.getSeatNumberRequirements()
      }, { status: 400, headers: corsHeaders });
    }
    
    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      return NextResponse.json({
        success: false,
        message: 'Branch not found'
      }, { status: 404, headers: corsHeaders });
    }
    
    // Check if seating type exists
    const seatingType = await models.SeatingType.findByPk(seating_type_id);
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404, headers: corsHeaders });
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
      }, { status: 409, headers: corsHeaders });
    }
    
    // Generate a seat code if not provided
    let seat_code = body.seat_code;
    if (!seat_code) {
      // Format: B{branch_id}-{seat_type_prefix}-{seat_number}
      const seatingTypePrefix = seatingType.short_code?.substring(0, 2) || 'ST';
      seat_code = `B${branch_id}-${seatingTypePrefix}-${seat_number}`;
    }
    
    // Create a new seat
    const seat = await models.Seat.create({
      branch_id,
      seating_type_id,
      seat_number,
      seat_code,
      price,
      availability_status: body.availability_status || AvailabilityStatusEnum.AVAILABLE
    });
    
    return NextResponse.json({
      success: true,
      message: 'Seat created successfully',
      data: seat
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('[Seats API] Error creating seat:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create seat',
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}