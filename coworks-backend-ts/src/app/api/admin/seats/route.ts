import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/middleware/adminAuth';
import models from '@/models';
import { AvailabilityStatusEnum } from '@/types/seating';

/**
 * GET all seats for admin
 * Includes additional data like booking counts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;

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
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'address', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
        }
      ],
      order: [['id', 'ASC']]
    });
    
    // Get additional metrics for each seat
    const seatsWithMetrics = await Promise.all(
      seats.map(async (seat: any) => {
        const seatData = seat.get({ plain: true });
        
        // Get booking count for this seat
        const bookingCount = await models.SeatBooking.count({
          where: { seat_id: seat.id }
        });
        
        // Get revenue for this seat
        const revenue = await models.SeatBooking.sum('total_price', {
          where: { seat_id: seat.id }
        });
        
        return {
          ...seatData,
          bookingCount,
          revenue: revenue || 0
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: seatsWithMetrics
    });
  } catch (error) {
    console.error('Error fetching seats for admin:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch seats',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST create a new seat (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;
    
    // Parse the request body
    const body = await request.json();
    const { 
      branch_id, 
      seating_type_id, 
      seat_number, 
      price, 
      availability_status 
    } = body;
    
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
      availability_status: availability_status || AvailabilityStatusEnum.AVAILABLE
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

/**
 * DELETE a seat (admin only)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;
    
    // Get URL parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Seat ID is required'
      }, { status: 400 });
    }
    
    // Check if seat exists
    const seat = await models.Seat.findByPk(parseInt(id));
    if (!seat) {
      return NextResponse.json({
        success: false,
        message: 'Seat not found'
      }, { status: 404 });
    }
    
    // Check if seat has any bookings
    const bookings = await models.SeatBooking.count({
      where: { seat_id: parseInt(id) }
    });
    
    if (bookings > 0) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete seat with existing bookings'
      }, { status: 409 });
    }
    
    // Delete the seat
    await seat.destroy();
    
    return NextResponse.json({
      success: true,
      message: 'Seat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to delete seat',
      error: (error as Error).message
    }, { status: 500 });
  }
}
