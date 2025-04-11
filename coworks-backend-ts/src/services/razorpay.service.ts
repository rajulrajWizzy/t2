import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentStatusEnum } from '../types/booking';

interface RazorpayOrderParams {
  amount: number; // amount in smallest currency unit (paise for INR)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

interface PaymentVerificationParams {
  order_id: string;
  payment_id: string;
  signature: string;
}

interface PaymentResponse {
  success: boolean;
  payment_id?: string;
  order_id?: string;
  error?: string;
  payment_status: PaymentStatusEnum;
}

class RazorpayService {
  private razorpay: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay API keys are not configured');
    }
    
    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret
    });
  }

  /**
   * Create a new Razorpay order
   * @param params Order parameters
   * @returns Order details
   */
  async createOrder(params: RazorpayOrderParams): Promise<RazorpayOrderResponse> {
    try {
      const order = await this.razorpay.orders.create(params);
      return order as RazorpayOrderResponse;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   * @param params Payment verification parameters
   * @returns Payment verification result
   */
  verifyPaymentSignature(params: PaymentVerificationParams): PaymentResponse {
    try {
      const { order_id, payment_id, signature } = params;
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');

      if (generatedSignature === signature) {
        return {
          success: true,
          payment_id,
          order_id,
          payment_status: PaymentStatusEnum.COMPLETED
        };
      } else {
        return {
          success: false,
          error: 'Invalid payment signature',
          payment_status: PaymentStatusEnum.FAILED
        };
      }
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return {
        success: false,
        error: 'Error verifying payment',
        payment_status: PaymentStatusEnum.FAILED
      };
    }
  }

  /**
   * Get payment details by payment ID
   * @param paymentId Razorpay payment ID
   * @returns Payment details
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   * @param paymentId Razorpay payment ID
   * @param amount Amount to refund (in paise)
   * @returns Refund details
   */
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundOptions: any = {};
      if (amount) {
        refundOptions.amount = amount;
      }
      
      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);
      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }
}

export default new RazorpayService();