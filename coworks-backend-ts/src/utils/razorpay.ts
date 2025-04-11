import Razorpay from 'razorpay';
import crypto from 'crypto';

// Define types for Razorpay since they're missing
interface RazorpayTypes {
  Order: any;
  Payment: any;
  Refund: any;
}

// Initialize Razorpay with API credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_TEST_KEY_ID', // Default to test key for development
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_TEST_KEY_SECRET', // Default to test key for development
});

// Payment status constants
export const PAYMENT_STATUS = {
  CREATED: 'created',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  REFUNDED: 'refunded',
  FAILED: 'failed',
};

/**
 * Create a new Razorpay order
 * @param amount Amount in smallest currency unit (paise for INR)
 * @param receipt Unique receipt ID (usually booking ID)
 * @param notes Additional information about the order
 * @returns Razorpay Order
 */
export async function createOrder(
  amount: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<RazorpayTypes['Order']> {
  try {
    // Ensure amount is properly formatted for Razorpay (integer in paise)
    const amountInPaise = Math.round(amount * 100);
    
    console.log(`Creating Razorpay order: amount=${amountInPaise}, receipt=${receipt}, notes=`, notes);
    
    // Validate required Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay API keys are not properly configured in environment variables');
    }
    
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes,
      payment_capture: true, // Auto capture payment
    });
    
    console.log('Razorpay order created successfully:', order.id);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Improved error handling
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = `Razorpay API error: ${JSON.stringify(error)}`;
      } catch (e) {
        errorMessage = `Razorpay API error details could not be stringified`;
      }
    } else {
      errorMessage = String(error);
    }
    
    throw new Error(`Failed to create payment order: ${errorMessage}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param orderId Razorpay Order ID
 * @param paymentId Razorpay Payment ID
 * @param signature Razorpay Signature from client
 * @returns Whether the signature is valid
 */
export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    // Generate a signature using the HMAC algorithm and SHA256 hash function
    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YOUR_TEST_KEY_SECRET')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    
    // Verify if the generated signature matches the received signature
    return generatedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 * @param paymentId Razorpay Payment ID
 * @returns Payment details
 */
export async function fetchPayment(paymentId: string): Promise<RazorpayTypes['Payment']> {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Capture an authorized payment
 * @param paymentId Razorpay Payment ID
 * @param amount Amount to capture (in smallest currency unit)
 * @returns Captured payment details
 */
export async function capturePayment(paymentId: string, amount: number): Promise<RazorpayTypes['Payment']> {
  try {
    return await razorpay.payments.capture(paymentId, Math.round(amount * 100), 'INR');
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error(`Failed to capture payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Refund a payment
 * @param paymentId Razorpay Payment ID
 * @param amount Amount to refund (in smallest currency unit)
 * @returns Refund details
 */
export async function refundPayment(
  paymentId: string, 
  amount: number,
  notes: Record<string, string> = {}
): Promise<RazorpayTypes['Refund']> {
  try {
    return await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes,
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw new Error(`Failed to refund payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all payments for a specific time period
 * @param from Start date (UNIX timestamp in seconds)
 * @param to End date (UNIX timestamp in seconds)
 * @param count Number of payments to fetch (default: 10)
 * @param skip Number of payments to skip (default: 0)
 * @returns List of payments
 */
export async function getAllPayments(
  from: number,
  to: number,
  count: number = 10,
  skip: number = 0
): Promise<any> {
  try {
    const response = await razorpay.payments.all({
      from,
      to,
      count,
      skip,
    });
    
    // Razorpay returns an object with items array, not an array directly
    return response.items || [];
  } catch (error) {
    console.error('Error fetching all payments:', error);
    throw new Error(`Failed to fetch payments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get Razorpay client configuration for frontend
 * @returns Razorpay client configuration
 */
export function getRazorpayConfig() {
  return {
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_TEST_KEY_ID',
    currency: 'INR',
    name: 'Coworks',
    description: 'Coworking Space Booking',
    image: '/logo.png', // Path to your logo
    prefill: {
      name: '',
      email: '',
      contact: '',
    },
    theme: {
      color: '#3B82F6', // Primary color
    },
  };
}

/**
 * Verify a Razorpay webhook signature
 * @param webhookBody Raw request body as string
 * @param webhookSignature X-Razorpay-Signature header value
 * @param webhookSecret Webhook secret key (default: from env variable)
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  webhookBody: string,
  webhookSignature: string,
  webhookSecret: string = process.env.RAZORPAY_WEBHOOK_SECRET || ''
): boolean {
  try {
    if (!webhookSecret) {
      console.warn('Razorpay webhook secret is not configured in environment variables');
      return false;
    }

    // Generate a signature using the HMAC algorithm and SHA256 hash function
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');
    
    // Verify if the generated signature matches the received signature
    const isValid = generatedSignature === webhookSignature;
    
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed');
      console.debug('Expected signature:', generatedSignature);
      console.debug('Received signature:', webhookSignature);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export default razorpay; 