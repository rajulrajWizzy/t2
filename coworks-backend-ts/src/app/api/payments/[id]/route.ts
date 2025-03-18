import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { Payment, PaymentStatusEnum } from '@/types/payment';
import { BookingStatusEnum } from '@/types/booking';
import { AvailabilityStatusEnum } from '@/types/seating';
import { UserRole } from '@/types/auth';

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
    
    // Find the payment
    const payment = await models.Payment.findByPk(parseInt(id));
    
    if (!payment) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Payment not found',
        data: null
      }, { status: 404 });
    }
    
    // Find the associated booking to check ownership
    let booking;
    if (payment.booking_type === 'seat') {
      booking = await models.SeatBooking.findByPk(payment.booking_id);
    } else if (payment.booking_type === 'meeting') {
      booking = await models.MeetingBooking.findByPk(payment.booking_id);
    }
    
    if (!booking) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Associated booking not found',
        data: null
      }, { status: 404 });
    }
    
    // Check if the logged-in user is the owner of the booking
    if (booking.customer_id !== decoded.id) {
      // If not the owner, check if admin (implement admin check if needed)
      // For now, just return unauthorized
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized to view this payment',
        data: null
      }, { status: 403 });
    }
    
    return NextResponse.json<ApiResponse<{payment: any, booking: any}>>({
      success: true,
      message: 'Payment retrieved successfully',
      data: {
        payment,
        booking
      }
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch payment',
      data: null
    }, { status: 500 });
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
    
    // Check if admin (for refund)
    // Assume role is included in the decoded token
    const userRole = decoded.role as UserRole;
    if (userRole !== UserRole.BRANCH_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Only admins can update payment status',
        data: null
      }, { status: 403 });
    }
    
    // Parse request body
    const { status } = await request.json();
    
    if (!status || !Object.values(PaymentStatusEnum).includes(status)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid payment status',
        data: null
      }, { status: 400 });
    }
    
    // Find the payment
    const payment = await models.Payment.findByPk(parseInt(id));
    
    if (!payment) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Payment not found',
        data: null
      }, { status: 404 });
    }
    
    // Handle refund logic
    if (status === PaymentStatusEnum.REFUNDED) {
      // Check if payment can be refunded
      if (payment.payment_status === PaymentStatusEnum.REFUNDED) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Payment has already been refunded',
          data: null
        }, { status: 400 });
      }
      
      // Get the associated booking
      let booking;
      if (payment.booking_type === 'seat') {
        booking = await models.SeatBooking.findByPk(payment.booking_id);
        
        if (booking) {
          // Update booking status to CANCELLED
          await models.SeatBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: booking.id } }
          );
          
          // Update seat availability if it exists
          const seatId = booking.seat_id;
          if (seatId) {
            const seat = await models.Seat.findByPk(seatId);
            if (seat) {
              await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE });
            }
          }
        }
      } else if (payment.booking_type === 'meeting') {
        booking = await models.MeetingBooking.findByPk(payment.booking_id);
        
        if (booking) {
          // Update booking status to CANCELLED
          await models.MeetingBooking.update(
            { status: BookingStatusEnum.CANCELLED },
            { where: { id: booking.id } }
          );
        }
      }
      
      if (!booking) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Associated booking not found',
          data: null
        }, { status: 404 });
      }
    }
    
    // Update payment status
    await payment.update({ payment_status: status });
    
    // Refresh payment data
    const updatedPayment = await models.Payment.findByPk(parseInt(id));
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Payment status updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update payment',
      data: null
    }, { status: 500 });
  }
}