// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, fetchPayment } from '@/utils/razorpay';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { ApiResponse } from '@/types/api';
import models from '@/models';

/**
 * POST /api/payments/verify - Verify a Razorpay payment
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      booking_id 
    } = body;
    
    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Missing required payment verification parameters',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Verify payment signature
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    
    if (!isValid) {
      console.error('Payment signature verification failed');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    try {
      // Fetch payment details from Razorpay
      const paymentDetails = await fetchPayment(razorpay_payment_id);
      
      // In a real implementation, you would:
      // 1. Update the booking status in your database
      // 2. Create a payment record in your database
      // 3. Send confirmation emails/notifications
      
      // For this example, we'll just return success
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: paymentDetails.amount / 100, // Convert from paise to rupees
          status: paymentDetails.status,
          method: paymentDetails.method,
          booking_id: booking_id || null
        }
      }, { status: 200, headers: corsHeaders });
      
    } catch (fetchError) {
      console.error('Error fetching payment details:', fetchError);
      
      // Even if we can't fetch details, the payment is still valid if signature verified
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Payment verified successfully, but could not fetch details',
        data: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          booking_id: booking_id || null
        }
      }, { status: 200, headers: corsHeaders });
    }
    
  } catch (error: any) {
    console.error('Error in payment verification:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Payment verification failed: ' + (error.message || 'Unknown error'),
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
