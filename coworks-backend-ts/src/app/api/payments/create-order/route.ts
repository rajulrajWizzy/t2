// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getRazorpayConfig } from '@/utils/razorpay';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { ApiResponse } from '@/types/api';
import { validateAuthToken } from '@/utils/auth-helper';

/**
 * POST /api/payments/create-order - Create a new Razorpay order
 */
export async function POST(request: NextRequest) {
  try {
    // Validate user authentication
    const authResult = await validateAuthToken(request);
    
    // If authentication fails, still allow order creation for testing
    let userId = 'guest';
    let userEmail = 'guest@example.com';
    let userName = 'Guest User';
    
    if (authResult.isValid && authResult.decoded) {
      userId = authResult.decoded.id.toString();
      userEmail = authResult.decoded.email || 'user@example.com';
      userName = authResult.decoded.name || 'User';
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      amount, 
      booking_id,
      currency = 'INR',
      description = 'Coworking Space Booking',
      notes = {}
    } = body;
    
    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid amount specified',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Generate a unique receipt ID if booking_id not provided
    const receipt = booking_id || `rcpt_${Date.now()}_${userId}`;
    
    // Add user information to notes
    const orderNotes = {
      ...notes,
      user_id: userId,
      user_email: userEmail,
      booking_id: booking_id || 'direct_payment'
    };
    
    // Create Razorpay order
    const order = await createOrder(amount, receipt, orderNotes);
    
    // Get Razorpay client config
    const razorpayConfig = getRazorpayConfig();
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Payment order created successfully',
      data: {
        order_id: order.id,
        amount: order.amount / 100, // Convert from paise to rupees
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: new Date(order.created_at * 1000).toISOString(),
        razorpay_config: {
          ...razorpayConfig,
          order_id: order.id,
          amount: order.amount,
          prefill: {
            name: userName,
            email: userEmail,
            contact: ''
          }
        }
      }
    }, { status: 200, headers: corsHeaders });
    
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create payment order: ' + (error.message || 'Unknown error'),
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
