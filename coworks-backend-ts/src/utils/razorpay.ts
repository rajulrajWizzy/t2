import Razorpay from 'razorpay';

// Initialize Razorpay with API credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
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
): Promise<Razorpay.Order> {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise/cents
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1, // Auto capture payment
    });
    
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error instanceof Error ? error.message : String(error)}`);
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
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
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
export async function fetchPayment(paymentId: string): Promise<Razorpay.Payment> {
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
export async function capturePayment(paymentId: string, amount: number): Promise<Razorpay.Payment> {
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
): Promise<Razorpay.Refund> {
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

export default razorpay; 