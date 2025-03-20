import Razorpay from 'razorpay';

// Create Razorpay instance with credentials from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

/**
 * Create a Razorpay order
 * @param amount Amount in paise (INR)
 * @param receipt Receipt ID (usually booking ID)
 * @param notes Additional notes for the order
 * @returns The created order
 */
export const createOrder = async (
  amount: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<any> => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1 // Auto-capture payment
    };
    
    return await razorpay.orders.create(options);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

/**
 * Verify a Razorpay payment signature
 * @param orderId Razorpay order ID
 * @param paymentId Razorpay payment ID
 * @param signature Razorpay signature
 * @returns Whether the signature is valid
 */
export const verifyPayment = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  try {
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    
    // Create HMAC SHA256 hash
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');
    
    // Compare generated signature with provided signature
    return generatedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
};

/**
 * Refund a Razorpay payment
 * @param paymentId Razorpay payment ID
 * @param amount Amount to refund in paise (INR)
 * @param notes Additional notes for the refund
 * @returns The refund details
 */
export const refundPayment = async (
  paymentId: string,
  amount: number,
  notes: Record<string, string> = {}
): Promise<any> => {
  try {
    const options = {
      payment_id: paymentId,
      amount: Math.round(amount * 100), // Convert to paise
      notes
    };
    
    return await razorpay.payments.refund(options);
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param paymentId Razorpay payment ID
 * @returns The payment details
 */
export const getPaymentDetails = async (paymentId: string): Promise<any> => {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

export default razorpay; 