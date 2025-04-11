import { Router } from 'express';
import { createBookingSummary, updateBookingPaymentStatus, handlePaymentWebhook } from '../controllers/payment.controller';

const router = Router();

/**
 * @route POST /api/payments/booking-summary
 * @desc Create a booking summary with payment order
 * @access Private
 */
router.post('/booking-summary', createBookingSummary);

/**
 * @route POST /api/bookings/create-order
 * @desc Create a new booking order
 * @access Private
 */
router.post('/create-order', createBookingSummary);

/**
 * @route POST /api/payments/update-status
 * @desc Update booking status after payment completion
 * @access Private
 */
router.post('/update-status', updateBookingPaymentStatus);

/**
 * @route POST /api/payments/webhook
 * @desc Handle Razorpay payment webhooks
 * @access Public
 */
router.post('/webhook', handlePaymentWebhook);

export default router;