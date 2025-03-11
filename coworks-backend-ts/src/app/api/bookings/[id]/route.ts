import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { BookingStatusEnum } from '@/types/booking';
import { AvailabilityStatusEnum } from '@/types/seating';
import { Op } from 'sequelize';

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
    
    // Try to find as seat booking first
    let bookingType = 'seat';
    let seatBooking = await models.SeatBooking.findByPk(parseInt(id), {
      include: [
        {
          model: models.Seat,
          as: 'Seat',
          include: [
            {
              model: models.Branch,
              as: 'Branch',
              attributes: ['name', 'address', 'location']
            },
            {
              model: models.SeatingType,
              as: 'SeatingType',
              attributes: ['name', 'description']
            }
          ]
        },
        {
          model: models.Customer,
          as: 'Customer',
          attributes: ['name', 'email', 'phone', 'company_name']
        }
      ]
    });
    
    let meetingBooking = null;
    
    // If not found, try as meeting booking
    if (!seatBooking) {
      bookingType = 'meeting';
      meetingBooking = await models.MeetingBooking.findByPk(parseInt(id), {
        include: [
          {
            model: models.Seat,
            as: 'MeetingRoom',
            include: [
              {
                model: models.Branch,
                as: 'Branch',
                attributes: ['name', 'address', 'location']
              },
              {
                model: models.SeatingType,
                as: 'SeatingType',
                attributes: ['name', 'description']
              }
            ]
          },
          {
            model: models.Customer,
            as: 'Customer',
            attributes: ['name', 'email', 'phone', 'company_name']
          }
        ]
      });
    }
    
    // Use a common booking variable
    const booking = seatBooking || meetingBooking;
    
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
    const { status } = body;
    
    // Try to find as seat booking first
    let bookingType = 'seat';
    let seatBooking = await models.SeatBooking.findByPk(parseInt(id));
    let meetingBooking = null;
    
    // If not found, try as meeting booking
    if (!seatBooking) {
      bookingType = 'meeting';
      meetingBooking = await models.MeetingBooking.findByPk(parseInt(id));
    }
    
    // Use a common booking variable
    const booking = seatBooking || meetingBooking;
    
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
      // If trying to cancel, check the 24-hour rule
      if (status === BookingStatusEnum.CANCELLED) {
        // Check if the booking is within 24 hours of start time
        const now = new Date();
        const startTime = new Date(booking.start_time);
        const timeDifference = startTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        if (hoursDifference < 24) {
          return NextResponse.json(
            { 
              message: 'Booking cannot be cancelled within 24 hours of the start time',
              hours_remaining: hoursDifference 
            },
            { status: 400 }
          );
        }
      }
      
      // Handle each booking type separately
      if (seatBooking) {
        await seatBooking.update({ status });
      } else if (meetingBooking) {
        await meetingBooking.update({ status });
      }
      
      // If cancelled or completed, release the seat
      if (status === BookingStatusEnum.CANCELLED || status === BookingStatusEnum.COMPLETED) {
        const seatId = bookingType === 'seat' 
          ? (seatBooking?.seat_id as number) 
          : (meetingBooking?.meeting_room_id as number);
        
        const seat = await models.Seat.findByPk(seatId);
        
        if (seat) {
          await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE });
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
    
    // Try to find as seat booking first
    let bookingType = 'seat';
    let seatBooking = await models.SeatBooking.findByPk(parseInt(id));
    let meetingBooking = null;
    
    // If not found, try as meeting booking
    if (!seatBooking) {
      bookingType = 'meeting';
      meetingBooking = await models.MeetingBooking.findByPk(parseInt(id));
    }
    
    // Use a common booking variable
    const booking = seatBooking || meetingBooking;
    
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
    
    if (booking.status === BookingStatusEnum.CANCELLED) {
      return NextResponse.json(
        { message: 'This booking is already cancelled' },
        { status: 400 }
      );
    }
    
    // Check if the booking is within 24 hours of start time
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const timeDifference = startTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      return NextResponse.json(
        { 
          message: 'Booking cannot be cancelled within 24 hours of the start time',
          hours_remaining: hoursDifference 
        },
        { status: 400 }
      );
    }
    
    // Update booking status to cancelled
    if (seatBooking) {
      await seatBooking.update({ status: BookingStatusEnum.CANCELLED });
      
      // Release the seat
      const seat = await models.Seat.findByPk(booking.seat_id);
      if (seat) {
        await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE });
      }
      
      // Release time slots if they exist
      await models.TimeSlot.update(
        { is_available: true, booking_id: null },
        { where: { booking_id: parseInt(id) } }
      );
    } else if (meetingBooking) {
      await meetingBooking.update({ status: BookingStatusEnum.CANCELLED });
      
      // Release the meeting room
      const seat = await models.Seat.findByPk(booking.meeting_room_id);
      if (seat) {
        await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel booking', error: (error as Error).message },
      { status: 500 }
    );
  }
}