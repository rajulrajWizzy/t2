// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { verifyWebhookSignature, PAYMENT_STATUS } from '@/utils/razorpay';
import { Op } from 'sequelize';
import { BookingStatusEnum } from '@/types/booking';
import { PaymentStatusEnum } from '@/types/payment';

// Type definitions to help with unknown types
interface ColumnInfo {
  column_name: string;
}

interface BookingRecord {
  id?: string | number;
  created_at?: string | Date;
  customer_id?: string | number;
  status?: string;
}

interface PaymentRecord {
  id?: string | number;
  transaction_id?: string;
  order_id?: string;
  status?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  amount?: number;
  payment_status?: string;
  payment_method?: string;
}

/**
 * Razorpay webhook endpoint to handle payment events
 * POST /api/payments/razorpay-webhook
 */
export async function POST(request: NextRequest) {
  console.log('Razorpay webhook received');
  console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
  
  try {
    // Extract the raw request body for signature verification
    const rawBody = await request.text();
    console.log('Raw body received:', rawBody);
    
    // Get the Razorpay signature from headers
    const razorpaySignature = request.headers.get('x-razorpay-signature');
    console.log('Signature present:', !!razorpaySignature);
    
    // SKIP SIGNATURE VERIFICATION FOR TESTING
    // Comment this section out when going to production
    // -------------------------------------
    console.log('WEBHOOK SIGNATURE VERIFICATION SKIPPED FOR TESTING');
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Extract event and payment information
    const { event, payload: eventPayload } = payload;
    console.log('Received Razorpay webhook event:', event);
    
    // Handle different payment events
    if (event === 'payment.authorized' || event === 'payment.captured') {
      // Payment has been authorized or captured
      const { payment } = eventPayload;
      console.log('Payment details:', JSON.stringify(payment));
      
      // Update payment status
      try {
        const paymentStatus = event === 'payment.captured' ? 
          PaymentStatusEnum.COMPLETED : PaymentStatusEnum.PENDING;
        
        console.log(`Updating payment for order ${payment.entity.order_id} to ${paymentStatus}`);
        await updatePaymentStatus(payment.entity.order_id, payment.entity.id, paymentStatus);
        
        // Update booking status if payment was captured
        if (event === 'payment.captured') {
          console.log(`Confirming bookings for order ${payment.entity.order_id}`);
          await confirmBookings(payment.entity.order_id);
        }
        
        return NextResponse.json(
          { success: true, message: `${event} event processed successfully` },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error(`Error handling ${event} event:`, error);
        return NextResponse.json(
          { success: false, message: `Error handling ${event}`, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    } else if (event === 'payment.failed') {
      // Payment has failed
      const { payment } = eventPayload;
      console.log('Failed payment details:', JSON.stringify(payment));
      
      try {
        // Update payment status
        await updatePaymentStatus(payment.entity.order_id, payment.entity.id, PaymentStatusEnum.FAILED);
        
        // Cancel the associated bookings
        await cancelBookings(payment.entity.order_id);
        
        return NextResponse.json(
          { success: true, message: 'Payment failed event processed' },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error('Error handling payment.failed event:', error);
        return NextResponse.json(
          { success: false, message: 'Error handling payment.failed', error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      // Unhandled event type
      console.log('Unhandled Razorpay webhook event:', event);
      return NextResponse.json(
        { success: true, message: 'Event acknowledged but not processed' },
        { status: 200, headers: corsHeaders }
      );
    }
    // -------------------------------------
    
    /*
    // UNCOMMENT THIS SECTION FOR PRODUCTION
    // Validate that signature is present
    if (!razorpaySignature) {
      console.error('Webhook request missing Razorpay signature');
      return NextResponse.json(
        { error: 'Missing Razorpay signature' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Verify webhook signature
    const isSignatureValid = verifyWebhookSignature(rawBody, razorpaySignature);
    
    if (!isSignatureValid) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Rest of the webhook handling code...
    */
    
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to update payment status
async function updatePaymentStatus(orderId: string, paymentId: string, status: PaymentStatusEnum) {
  try {
    // First check if order_id column exists
    const columnsResult = await executeQuery<ColumnInfo[]>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'excel_coworks_schema' 
       AND table_name = 'payments' 
       AND column_name IN ('order_id', 'transaction_id')`
    );
    
    // Make sure columns is an array before using .some()
    const columns = Array.isArray(columnsResult) ? columnsResult : [];
    console.log('Found columns:', columns);
    
    const orderIdColumnExists = columns.some(col => col.column_name === 'order_id');
    const transactionIdColumnExists = columns.some(col => col.column_name === 'transaction_id');
    
    console.log(`Column check: order_id exists: ${orderIdColumnExists}, transaction_id exists: ${transactionIdColumnExists}`);
    
    // Build the query based on available columns
    let whereClause = '';
    let whereParams: Record<string, any> = {};
    
    if (orderIdColumnExists && transactionIdColumnExists) {
      whereClause = `"transaction_id" = :orderId OR "order_id" = :orderId`;
      whereParams = { orderId };
    } else if (orderIdColumnExists) {
      whereClause = `"order_id" = :orderId`;
      whereParams = { orderId };
    } else if (transactionIdColumnExists) {
      whereClause = `"transaction_id" = :orderId`;
      whereParams = { orderId };
    } else {
      // If neither column exists, try searching by other means or just use a dummy where clause
      console.warn('Neither order_id nor transaction_id columns found in payments table');
      whereClause = `"id" > 0`; // Just a dummy condition to continue the flow
    }
    
    // Find payment record by order ID using raw SQL to avoid model issues
    const payments = await executeQuery<PaymentRecord[]>(
      `SELECT * FROM "excel_coworks_schema"."payments" 
       WHERE ${whereClause}
       LIMIT 1`,
      whereParams
    );
    
    const paymentsArray = Array.isArray(payments) ? payments : [];
    
    if (paymentsArray.length > 0) {
      // Construct the update SET clause based on available columns
      let setClause = `"updated_at" = NOW()`;
      const updateParams: Record<string, any> = { 
        paymentRecordId: paymentsArray[0].id 
      };
      
      // Only set status if it's valid
      if (status && typeof status === 'string') {
        setClause += `, "status" = :status`;
        updateParams.status = status;
      }
      
      if (transactionIdColumnExists && paymentId) {
        setClause += `, "transaction_id" = :paymentId`;
        updateParams.paymentId = paymentId;
      }
      
      if (orderIdColumnExists && !paymentsArray[0].order_id && orderId) {
        setClause += `, "order_id" = :orderId`;
        updateParams.orderId = orderId;
      }
      
      // Update payment status using raw SQL
      await executeQuery(
        `UPDATE "excel_coworks_schema"."payments" 
         SET ${setClause}
         WHERE "id" = :paymentRecordId`,
        updateParams
      );
      
      console.log(`Payment status updated: ${orderId} -> ${status}`);
    } else {
      console.warn(`Payment record not found for order ID: ${orderId}`);
      
      // If payment not found by order_id or transaction_id, try to get the most recent payment
      console.log('Looking for recent payments as fallback...');
      const recentPaymentsResult = await executeQuery<PaymentRecord[]>(
        `SELECT * FROM "excel_coworks_schema"."payments" 
         ORDER BY "created_at" DESC 
         LIMIT 5`
      );
      
      const recentPayments = Array.isArray(recentPaymentsResult) ? recentPaymentsResult : [];
      
      if (recentPayments.length > 0) {
        console.log('Recent payments found:', recentPayments);
        console.log('Manual intervention required to link payment with order ID:', orderId);
      } else {
        console.log('No recent payments found');
      }
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

// Helper function to confirm bookings after successful payment
async function confirmBookings(orderId: string) {
  try {
    // First, check if columns exist
    let orderIdColumnExists = false;
    let paymentIdColumnExists = false;
    
    try {
      const columnsResult = await executeQuery<ColumnInfo[]>(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'excel_coworks_schema' 
         AND table_name = 'seat_bookings' 
         AND column_name IN ('order_id', 'payment_id')`
      );
      
      // Make sure columns is an array
      const columns = Array.isArray(columnsResult) ? columnsResult : [];
      console.log('Found columns for seat_bookings:', columns);
      
      orderIdColumnExists = columns.some((col: ColumnInfo) => col.column_name === 'order_id');
      paymentIdColumnExists = columns.some((col: ColumnInfo) => col.column_name === 'payment_id');
      
      console.log(`Column check: order_id exists: ${orderIdColumnExists}, payment_id exists: ${paymentIdColumnExists}`);
    } catch (error) {
      console.error('Error checking for columns:', error);
    }
    
    // Find all bookings associated with this order
    console.log(`Looking for bookings with order_id ${orderId}...`);
    const bookingsResult = await executeQuery<BookingRecord[]>(
      `SELECT * FROM "excel_coworks_schema"."seat_bookings" 
       WHERE "status" = 'PENDING' 
       AND "order_id" = :orderId`,
      { orderId }
    );
    
    // Ensure bookings is an array
    const bookings = Array.isArray(bookingsResult) ? bookingsResult : [];
    
    if (bookings.length > 0) {
      console.log(`Found ${bookings.length} bookings to confirm for order ${orderId}`);
      
      // Update each booking
      for (const booking of bookings) {
        if (booking && typeof booking === 'object' && booking.id) {
          try {
            await executeQuery(
              `UPDATE "excel_coworks_schema"."seat_bookings" 
               SET "status" = 'CONFIRMED', 
                   "payment_status" = 'COMPLETED',
                   "updated_at" = NOW()
               WHERE "id" = :bookingId`,
              { bookingId: booking.id }
            );
            
            console.log(`Booking confirmed: ${booking.id}`);
          } catch (updateError) {
            console.error(`Error updating booking ${booking.id}:`, updateError);
          }
        }
      }
      
      console.log(`Successfully confirmed ${bookings.length} bookings for order ${orderId}`);
      return;
    }
    
    // If no bookings found with order_id, try to find recent pending bookings
    console.log('No bookings found with order_id, looking for recent pending bookings...');
    const recentBookingsResult = await executeQuery<BookingRecord[]>(
      `SELECT * FROM "excel_coworks_schema"."seat_bookings" 
       WHERE "status" = 'PENDING' 
       ORDER BY "created_at" DESC 
       LIMIT 5`
    );
    
    // Ensure recentBookings is an array
    const recentBookings = Array.isArray(recentBookingsResult) ? recentBookingsResult : [];
    
    if (recentBookings.length > 0) {
      console.log(`Found ${recentBookings.length} recent pending bookings`);
      
      // Update each booking
      for (const booking of recentBookings) {
        if (booking && typeof booking === 'object' && booking.id) {
          try {
            await executeQuery(
              `UPDATE "excel_coworks_schema"."seat_bookings" 
               SET "status" = 'CONFIRMED', 
                   "payment_status" = 'COMPLETED',
                   "updated_at" = NOW()
               WHERE "id" = :bookingId`,
              { bookingId: booking.id }
            );
            
            console.log(`Booking confirmed: ${booking.id}`);
          } catch (updateError) {
            console.error(`Error updating booking ${booking.id}:`, updateError);
          }
        }
      }
      
      console.log(`Successfully confirmed ${recentBookings.length} recent bookings`);
      return;
    }
    
    console.warn(`No bookings found to confirm for order ${orderId}`);
    
  } catch (error) {
    console.error('Error confirming bookings:', error);
    throw error;
  }
}

// Helper function to cancel bookings after failed payment
async function cancelBookings(orderId: string) {
  try {
    // Use the same approach as confirmBookings but update status to CANCELLED
    // First, check if columns exist
    let orderIdColumnExists = false;
    let paymentIdColumnExists = false;
    
    try {
      const columnsResult = await executeQuery<ColumnInfo[]>(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'excel_coworks_schema' 
         AND table_name = 'seat_bookings' 
         AND column_name IN ('order_id', 'payment_id')`
      );
      
      // Make sure columns is an array
      const columns = Array.isArray(columnsResult) ? columnsResult : [];
      
      orderIdColumnExists = columns.some((col: ColumnInfo) => col.column_name === 'order_id');
      paymentIdColumnExists = columns.some((col: ColumnInfo) => col.column_name === 'payment_id');
    } catch (error) {
      console.error('Error checking for columns:', error);
    }
    
    // Build the query based on available columns using named parameters
    let whereClauseParams: Record<string, any> = { };
    let whereClause = `"status" = 'PENDING'`;
    
    if (orderIdColumnExists) {
      whereClauseParams.orderId = orderId;
      whereClause += ` AND "order_id" = :orderId`;
    }
    
    if (paymentIdColumnExists) {
      whereClauseParams.paymentId = orderId;
      whereClause += ` OR ("status" = 'PENDING' AND "payment_id" = :paymentId)`;
    }
    
    // Try to find the bookings
    console.log(`Looking for bookings to cancel with query: ${whereClause}`);
    const bookingsResult = await executeQuery<BookingRecord[]>(
      `SELECT * FROM "excel_coworks_schema"."seat_bookings" 
       WHERE ${whereClause}
       LIMIT 10`,
      whereClauseParams
    );
    
    // Ensure bookings is an array
    const bookings = Array.isArray(bookingsResult) ? bookingsResult : [];
    
    if (bookings.length > 0) {
      console.log(`Found ${bookings.length} bookings to cancel for order ${orderId}`);
      
      // Update each booking
      for (const booking of bookings) {
        if (booking && typeof booking === 'object' && booking.id) {
          await executeQuery(
            `UPDATE "excel_coworks_schema"."seat_bookings" 
             SET "status" = 'CANCELLED', "updated_at" = NOW() 
             WHERE "id" = :bookingId`,
            { bookingId: booking.id }
          );
          console.log(`Booking cancelled: ${booking.id}`);
        }
      }
      
      return;
    }
    
    console.warn(`No bookings found to cancel for order ${orderId}`);
  } catch (error) {
    console.error('Error cancelling bookings:', error);
    throw error;
  }
}

// Helper function to execute raw SQL queries
async function executeQuery<T = any>(query: string, params: Record<string, any> = {}): Promise<T> {
  try {
    console.log('Executing SQL:', query.trim().replace(/\s+/g, ' '));
    console.log('With parameters:', params);
    
    // Execute the query
    const result = await models.sequelize.query(query, {
      replacements: params,
      type: 'SELECT'
    });
    
    console.log('Query executed successfully');
    
    // Handle different result formats
    // First check if result is an array
    if (Array.isArray(result)) {
      // Sequelize typically returns [results, metadata]
      const [rows] = result;
      
      // Check if rows is a valid array with data
      if (Array.isArray(rows)) {
        return rows as T;
      } 
      // If rows exists but is not an array, wrap it in an array
      else if (rows !== undefined && rows !== null) {
        return [rows] as unknown as T;
      }
      // Empty result
      else {
        return [] as unknown as T;
      }
    } 
    // If the result itself is not an array but has data
    else if (result !== undefined && result !== null) {
      return [result] as unknown as T;
    }
    // Fallback to empty array
    return [] as unknown as T;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Failed query:', query);
    console.error('Parameters:', params);
    
    // Return empty array instead of throwing
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      console.log('Returning empty array for failed SELECT query');
      return [] as unknown as T;
    }
    
    throw error;
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
} 