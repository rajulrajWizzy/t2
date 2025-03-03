import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { PaymentStatusEnum } from '@/types/payment';
import { BookingStatusEnum } from '@/types/booking';
import { AvailabilityStatusEnum } from '../../../../types/seating';

// GET a single payment by ID
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
    
    // Find the payment
    const payment = await models.Payment.findByPk(parseInt(id));
    
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Find the associated booking to check ownership
    let booking;
    if (payment.booking_type === 'seat') {
      booking = await models.SeatBooking.findByPk(payment.booking_id);
    } else if (payment.booking_type === 'meeting') {
      booking = await models.MeetingBooking.findByPk(payment.booking_id);
    }
    
    if (!booking) {
      return NextResponse.json(
        { message: 'Associated booking not found' },
        { status: 404 }
      );
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to view this payment' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      payment,
      booking
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payment', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a payment (e.g., refund)
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
    
    // Find the payment
    const payment = await models.Payment.findByPk(parseInt(id));
    
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Find the associated booking to check ownership
    let booking;
    if (payment.booking_type === 'seat') {
      booking = await models.SeatBooking.findByPk(payment.booking_id);
    } else if (payment.booking_type === 'meeting') {
      booking = await models.MeetingBooking.findByPk(payment.booking_id);
    }
    
    if (!booking) {
      return NextResponse.json(
        { message: 'Associated booking not found' },
        { status: 404 }
      );
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to update this payment' },
        { status: 403 }
      );
    }
    
    // Update payment status
    if (status && Object.values(PaymentStatusEnum).includes(status as PaymentStatusEnum)) {
      await payment.update({ payment_status: status });
      
      // If payment is refunded, update booking status to cancelled
      if (status === PaymentStatusEnum.REFUNDED) {
        if (payment.booking_type === 'seat') {
          await models.SeatBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: payment.booking_id } }
          );
        } else {
          await models.MeetingBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: payment.booking_id } }
          );
        }
        
        // Release seat if booking is cancelled
        let seatId: number;
        if (payment.booking_type === 'seat' && booking) {
          seatId = (booking as any).seat_id;
        } else if (booking) {
          seatId = (booking as any).meeting_room_id;
        } else {
          // Handle the case where booking is null
          throw new Error('Booking not found');
        }
        const seat = await models.Seat.findByPk(seatId);
        
        if (seat) {
          await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE });
        }
        
        // Release time slots if they exist and it's a seat booking
        if (payment.booking_type === 'seat') {
          await models.TimeSlot.update(
            { is_available: true, booking_id: null },
            { where: { booking_id: payment.booking_id } }
          );
        }
      }
    }
    
    return NextResponse.json({
      message: 'Payment updated successfully',
      payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { message: 'Failed to update payment', error: (error as Error).message },
      { status: 500 }
    );
  }
}