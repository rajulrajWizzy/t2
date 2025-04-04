// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '../../../../models';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import { BookingStatusEnum } from '../../../../types/booking';
import { AvailabilityStatusEnum } from '../../../../types/seating';

// GET a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Validate booking ID
    const bookingId = parseInt(params.id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking ID' },
        { status: 400}
      );
    }
    const { id } = params;

    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401 });
    }
    
    // Try to find as seat booking first
    let bookingType = 'seat';
    let seatBooking = await models.SeatBooking.findByPk(bookingId, {
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
          attributes: ['name', 'email', 'phone']
        }
      ]
    }
    );
    
    let meetingBooking = null;
    
    // If not found, try as meeting booking
    if (!seatBooking) {
      bookingType = 'meeting';
      meetingBooking = await models.MeetingBooking.findByPk(bookingId, {
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
            attributes: ['name', 'email', 'phone']
          }
        ]
      }
    );
    }
    
    // Use a common booking variable
    const booking = seatBooking || meetingBooking;
    
    if (!booking) {
      return NextResponse.json(
      { message: 'Booking not found' },
        { status: 404  });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
      { message: 'Unauthorized to view this booking' },
        { status: 403  });
    }
    
    // Get associated payments
    const payments = await models.Payment.findAll({
      where: {
        booking_id: parseInt(id),
        booking_type: bookingType
      }
    }
    );
    
    return NextResponse.json(
      {
      bookingType,
      booking,
      payments
    }
    , { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { message: 'Failed to fetch booking', error: (error as Error).message },
      { status: 500  });
  }
}

// PUT update a booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    // Validate booking ID
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401 });
    }
    
    // Parse the request body
    const { status } = body;
    
    // Start a transaction
    const transaction = await models.sequelize.transaction();
    
    try {
      // Try to find as seat booking first
      let bookingType = 'seat';
      let seatBooking = await models.SeatBooking.findByPk(parseInt(id), { transaction });
      let meetingBooking = null;
      
      // If not found, try as meeting booking
      if (!seatBooking) {
        bookingType = 'meeting';
        meetingBooking = await models.MeetingBooking.findByPk(parseInt(id), { transaction });
      }
  
    // Use a common booking variable
    const booking = seatBooking || meetingBooking;
  
    if (!booking) {
      return NextResponse.json(
      { message: 'Booking not found' },
        { status: 404 });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
      { message: 'Unauthorized to update this booking' },
        { status: 403 });
    }
    
    // Update booking status
    if (status && Object.values(BookingStatusEnum).includes(status as BookingStatusEnum)) {
      // Handle each booking type separately
      if (seatBooking) {
        await seatBooking.update({ status }, { transaction });
      } else if (meetingBooking) {
        await meetingBooking.update({ status }, { transaction });
      }
      
      // If cancelled or completed, release the seat
      if (status === BookingStatusEnum.CANCELLED || status === BookingStatusEnum.COMPLETED) {
        const seatId = bookingType === 'seat' 
          ? (seatBooking?.seat_id as number) 
          : (meetingBooking?.meeting_room_id as number);
      
        const seat = await models.Seat.findByPk(seatId, { transaction });
        
        if (seat) {
          await seat.update(
            { availability_status: AvailabilityStatusEnum.AVAILABLE },
            { transaction }
          );
        }
        
        // Release time slots if they exist
        if (bookingType === 'seat') {
          await models.TimeSlot.update(
            { is_available: true, booking_id: null },
            { where: { booking_id: parseInt(id) }, transaction }
          );
        }
      }
      
      await transaction.commit();
      
      return NextResponse.json(
        {
          success: true,
          message: 'Booking updated successfully',
          data: { booking }
        },
        { headers: corsHeaders }
      );
    } else {
      await transaction.rollback();
      return NextResponse.json(
        { success: false, message: 'Invalid booking status' },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to update booking',
        error: (error as Error).message 
      },
      { status: 500, headers: corsHeaders });
  }
}

// DELETE a booking (cancel it)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Validate booking ID
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking ID' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401  });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401  });
    }
    
    // Start a transaction
    const transaction = await models.sequelize.transaction();
    
    try {
      // Try to find as seat booking first
      let bookingType = 'seat';
      let seatBooking = await models.SeatBooking.findByPk(parseInt(id), { transaction });
      let meetingBooking = null;
      
      // If not found, try as meeting booking
      if (!seatBooking) {
        bookingType = 'meeting';
        meetingBooking = await models.MeetingBooking.findByPk(parseInt(id), { transaction });
      }
      
      // Use a common booking variable
      const booking = seatBooking || meetingBooking;
      
      if (!booking) {
        await transaction.rollback();
        return NextResponse.json(
          { success: false, message: 'Booking not found' },
          { status: 404, headers: corsHeaders }
        );
      }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
      { message: 'Unauthorized to cancel this booking' },
        { status: 403   });
    }
    
    // Check if booking can be cancelled
    if (booking.status === BookingStatusEnum.COMPLETED) {
      await transaction.rollback();
      return NextResponse.json(
        { success: false, message: 'Cannot cancel a completed booking' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Update booking status to cancelled
    if (seatBooking) {
      await seatBooking.update(
        { status: BookingStatusEnum.CANCELLED },
        { transaction }
      );
    } else if (meetingBooking) {
      await meetingBooking.update(
        { status: BookingStatusEnum.CANCELLED },
        { transaction }
      );
    }
    
    // Release the seat
    const seatId = bookingType === 'seat' 
      ? (seatBooking?.seat_id as number) 
      : (meetingBooking?.meeting_room_id as number);
    
    const seat = await models.Seat.findByPk(seatId, { transaction });
    
    if (seat) {
      await seat.update(
        { availability_status: AvailabilityStatusEnum.AVAILABLE },
        { transaction }
      );
    }
    
    // Release time slots if they exist
    if (bookingType === 'seat') {
      await models.TimeSlot.update(
        { is_available: true, booking_id: null },
        { where: { booking_id: parseInt(id) }, transaction }
      );
    }

    await transaction.commit();
  
    return NextResponse.json(
      {
        success: true,
        message: 'Booking cancelled successfully'
      },
      { headers: corsHeaders }
    );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to cancel booking',
        error: (error as Error).message 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
