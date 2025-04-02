// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken  } from '@/utils/jwt-wrapper';
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
      
      return NextResponse.json(response, { status: 401 }
    , { headers: corsHeaders });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 }
    , { headers: corsHeaders });
    }
    
    // Find the payment
    const payment = await models.Payment.findByPk(parseInt(id));
    
    if (!payment) {
      return NextResponse.json(
      { message: 'Payment not found' },
        { status: 404 }
    , { headers: corsHeaders });
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
    , { headers: corsHeaders });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
      { message: 'Unauthorized to view this payment' },
        { status: 403 }
    , { headers: corsHeaders });
    }
    
    return NextResponse.json(
      {
      payment,
      booking
    }
    , { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payment', error: (error as Error).message },
      { status: 500 }
    , { headers: corsHeaders });
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
      
      return NextResponse.json(response, { status: 401 }
    , { headers: corsHeaders });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 }
    , { headers: corsHeaders });
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
    , { headers: corsHeaders });
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
    , { headers: corsHeaders });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
      { message: 'Unauthorized to update this payment' },
        { status: 403 }
    , { headers: corsHeaders });
    }
    
    // Update payment status
    if (status && Object.values(PaymentStatusEnum).includes(status as PaymentStatusEnum)) {
      await payment.update({ payment_status: status }
    , { headers: corsHeaders });
      
      // If payment is refunded, update booking status to cancelled
      if (status === PaymentStatusEnum.REFUNDED) {
        if (payment.booking_type === 'seat') {
          await models.SeatBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: payment.booking_id } }
    , { headers: corsHeaders });
        } else {
          await models.MeetingBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: payment.booking_id } }
    , { headers: corsHeaders });
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
          await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE }
    , { headers: corsHeaders });
        }
        
        // Release time slots if they exist and it's a seat booking
        if (payment.booking_type === 'seat') {
          await models.TimeSlot.update(
            { is_available: true, booking_id: null },
            { where: { booking_id: payment.booking_id } }
    , { headers: corsHeaders });
        }
      }
    }
    
    return NextResponse.json(
      {
      message: 'Payment updated successfully',
      payment
    }
    , { headers: corsHeaders });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { message: 'Failed to update payment', error: (error as Error).message },
      { status: 500 }
    , { headers: corsHeaders });
  }
}
// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  }
    , { headers: corsHeaders });
}
