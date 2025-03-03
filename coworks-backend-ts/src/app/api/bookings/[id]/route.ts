import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { BookingStatusEnum } from '@/types/booking';

// GET a single booking by ID
export async function GET(
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
    
    // Try to find as seat booking first
    let booking = await models.SeatBooking.findByPk(parseInt(id), {
      include: [
        {
          model: models.Seat,
          include: [
            {
              model: models.Branch,
              attributes: ['name', 'address', 'location']
            },
            {
              model: models.SeatingType,
              attributes: ['name', 'description']
            }
          ]
        },
        {
          model: models.Customer,
          attributes: ['name', 'email', 'phone']
        }
      ]
    });
    
    let bookingType = 'seat';
    
    // If not found, try as meeting booking
    if (!booking) {
      booking = await models.MeetingBooking.findByPk(parseInt(id), {
        include: [
          {
            model: models.Seat,
            as: 'MeetingRoom',
            include: [
              {
                model: models.Branch,
                attributes: ['name', 'address', 'location']
              },
              {
                model: models.SeatingType,
                attributes: ['name', 'description']
              }
            ]
          },
          {
            model: models.Customer,
            attributes: ['name', 'email', 'phone']
          }
        ]
      });
      
      bookingType = 'meeting';
    }
    
    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to view this booking' },
        { status: 403 }
      );
    }
    
    // Get associated payments
    const payments = await models.Payment.findAll({
      where: {
        booking_id: parseInt(id),
        booking_type: bookingType
      }
    });
    
    return NextResponse.json({
      bookingType,
      booking,
      payments
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { message: 'Failed to fetch booking', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a booking
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
    const { status } = body;
    
    // Try to find as seat booking first
    let booking = await models.SeatBooking.findByPk(parseInt(id));
    let bookingType = 'seat';
    
    // If not found, try as meeting booking
    if (!booking) {
      booking = await models.MeetingBooking.findByPk(parseInt(id));
      bookingType = 'meeting';
    }
    
    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to update this booking' },
        { status: 403 }
      );
    }
    
    // Update booking status
    if (status && Object.values(BookingStatusEnum).includes(status as BookingStatusEnum)) {
      await booking.update({ status });
      
      // If cancelled or completed, release the seat
      if (status === BookingStatusEnum.CANCELLED || status === BookingStatusEnum.COMPLETED) {
        const seatId = bookingType === 'seat' ? booking.seat_id : booking.meeting_room_id;
        const seat = await models.Seat.findByPk(seatId);
        
        if (seat) {
          await seat.update({ availability_status: 'AVAILABLE' });
        }
        
        // Release time slots if they exist
        if (bookingType === 'seat') {
          await models.TimeSlot.update(
            { is_available: true, booking_id: null },
            { where: { booking_id: parseInt(id) } }
          );
        }
      }
    }
    
    return NextResponse.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { message: 'Failed to update booking', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a booking (cancel it)
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
    
    // Try to find as seat booking first
    let booking = await models.SeatBooking.findByPk(parseInt(id));
    let bookingType = 'seat';
    
    // If not found, try as meeting booking
    if (!booking) {
      booking = await models.MeetingBooking.findByPk(parseInt(id));
      bookingType = 'meeting';
    }
    
    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to cancel this booking' },
        { status: 403 }
      );
    }
    
    // Check if booking can be cancelled
    if (booking.status === BookingStatusEnum.COMPLETED) {
      return NextResponse.json(
        { message: 'Cannot cancel a completed booking' },
        { status: 400 }
      );
    }
    
    // Update booking status to cancelled
    await booking.update({ status: BookingStatusEnum.CANCELLED });
    
    // Release the seat
    const seatId = bookingType === 'seat' ? booking.seat_id : booking.meeting_room_id;
    const seat = await models.Seat.findByPk(seatId);
    
    if (seat) {
      await seat.update({ availability_status: 'AVAILABLE' });
    }
    
    // Release time slots if they exist
    if (bookingType === 'seat') {
      await models.TimeSlot.update(
        { is_available: true, booking_id: null },
        { where: { booking_id: parseInt(id) } }
      );
    }
    
    return NextResponse.json({
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { message: 'Failed to cancel booking', error: (error as Error).message },
      { status: 500 }
    );
  }
}