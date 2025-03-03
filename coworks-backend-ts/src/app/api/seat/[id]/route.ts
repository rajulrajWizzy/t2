import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { AvailabilityStatusEnum } from '@/types/seating';

// GET a single seat by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Find the seat with its branch and seating type
    const seat = await models.Seat.findByPk(parseInt(id), {
      include: [
        {
          model: models.Branch,
          attributes: ['name', 'address', 'location', 'opening_time', 'closing_time']
        },
        {
          model: models.SeatingType,
          attributes: ['name', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration']
        }
      ]
    });
    
    if (!seat) {
      return NextResponse.json(
        { message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Get booking history for this seat
    const bookings = await models.SeatBooking.findAll({
      where: { seat_id: parseInt(id) },
      order: [['start_time', 'DESC']],
      limit: 5
    });
    
    return NextResponse.json({
      seat,
      bookings
    });
  } catch (error) {
    console.error('Error fetching seat:', error);
    return NextResponse.json(
      { message: 'Failed to fetch seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a seat
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
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
    const body = await request.json();
    const { price, availability_status } = body;
    
    // Find the seat
    const seat = await models.Seat.findByPk(parseInt(id));
    
    if (!seat) {
      return NextResponse.json(
        { message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Update seat data
    const updates: any = {};
    
    if (price !== undefined) {
      updates.price = price;
    }
    
    if (availability_status && Object.values(AvailabilityStatusEnum).includes(availability_status as AvailabilityStatusEnum)) {
      updates.availability_status = availability_status;
    }
    
    await seat.update(updates);
    
    return NextResponse.json({
      message: 'Seat updated successfully',
      seat
    });
  } catch (error) {
    console.error('Error updating seat:', error);
    return NextResponse.json(
      { message: 'Failed to update seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a seat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
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
    
    // Find the seat
    const seat = await models.Seat.findByPk(parseInt(id));
    
    if (!seat) {
      return NextResponse.json(
        { message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Check if seat has bookings
    const bookingCount = await models.SeatBooking.count({
      where: { seat_id: parseInt(id) }
    });
    
    if (bookingCount > 0) {
      return NextResponse.json(
        { message: 'Cannot delete seat with associated bookings' },
        { status: 400 }
      );
    }
    
    // Delete time slots for this seat
    await models.TimeSlot.destroy({
      where: { seat_id: parseInt(id) }
    });
    
    // Delete the seat
    await seat.destroy();
    
    return NextResponse.json({
      message: 'Seat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    return NextResponse.json(
      { message: 'Failed to delete seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}