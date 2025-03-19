export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { PaymentInput, PaymentStatusEnum, BookingTypeEnum } from '@/types/payment';
import { BookingStatusEnum } from '@/types/booking';

// GET payments for a customer
export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Get URL parameters
    const url = new URL(request.url);
    const booking_id = url.searchParams.get('booking_id');
    const booking_type = url.searchParams.get('booking_type');
    const status = url.searchParams.get('status');
    
    // Prepare filter conditions
    const whereConditions: any = {};
    
    // Filter by booking_id if provided
    if (booking_id) {
      whereConditions.booking_id = parseInt(booking_id);
    }
    
    // Filter by booking_type if provided
    if (booking_type) {
      whereConditions.booking_type = booking_type;
    }
    
    // Filter by status if provided
    if (status) {
      whereConditions.payment_status = status;
    }
    
    // Find payments
    const payments = await models.Payment.findAll({
      where: whereConditions,
      order: [['created_at', 'DESC']]
    });
    
    const response: ApiResponse = {
      success: true,
      data: payments
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching payments:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch payments',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST create a new payment
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
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as PaymentInput;
    const { 
      booking_id, 
      booking_type, 
      amount, 
      payment_method, 
      transaction_id = null
    } = body;
    
    // Basic validation
    if (!booking_id || !booking_type || !amount || !payment_method) {
      const response: ApiResponse = {
        success: false,
        message: 'Booking ID, booking type, amount, and payment method are required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if the booking exists
    let booking;
    if (booking_type === BookingTypeEnum.SEAT) {
      booking = await models.SeatBooking.findByPk(booking_id);
    } else if (booking_type === BookingTypeEnum.MEETING) {
      booking = await models.MeetingBooking.findByPk(booking_id);
    }
    
    if (!booking) {
      const response: ApiResponse = {
        success: false,
        message: 'Booking not found'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json(
        { message: 'Unauthorized to make payments for this booking' },
        { status: 403 }
      );
    }
    
    // Create the payment
    const payment = await models.Payment.create({
      booking_id,
      booking_type,
      amount,
      payment_method,
      payment_status: PaymentStatusEnum.COMPLETED, // Assuming payment is completed immediately for simplicity
      transaction_id: transaction_id || undefined
    });
    
    // Update booking status to confirmed
    if (payment.booking_type === 'seat') {
      const seatBooking = booking as any; // or proper type casting
      await seatBooking.update({ status: BookingStatusEnum.CONFIRMED });
    } else {
      const meetingBooking = booking as any; // or proper type casting
      await meetingBooking.update({ status: BookingStatusEnum.CONFIRMED });
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Payment processed successfully',
      data: payment
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error processing payment:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to process payment',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}