import { Request, Response } from 'express';
import { SeatBooking, MeetingBooking, BookingStatusEnum, PaymentStatusEnum } from '../types/booking';
import razorpayService from '../services/razorpay.service';
import { SeatBookingModel } from '../models/seat-booking.model';
import { MeetingBookingModel } from '../models/meeting-booking.model';

export const createBookingSummary = async (req: Request, res: Response) => {
  try {
    const { 
      booking_type, // 'seat' or 'meeting'
      customer_id,
      resource_id, // seat_id or meeting_room_id
      start_time,
      end_time,
      num_participants, // only for meeting rooms
      amenities, // only for meeting rooms
      total_amount
    } = req.body;

    // Validate required fields
    if (!booking_type || !customer_id || !resource_id || !start_time || !end_time || !total_amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if the resource is available for the requested time slot
    // This would involve checking against existing bookings
    // Implementation depends on your existing availability checking logic
    const isAvailable = true; // Replace with actual availability check

    if (!isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'The selected resource is not available for the requested time slot' 
      });
    }

    // Create a booking with PENDING status
    let booking;
    if (booking_type === 'seat') {
      booking = await SeatBookingModel.create({
        customer_id,
        seat_id: resource_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        total_amount,
        status: BookingStatusEnum.PENDING,
        payment_status: PaymentStatusEnum.PENDING
      });
    } else if (booking_type === 'meeting') {
      booking = await MeetingBookingModel.create({
        customer_id,
        meeting_room_id: resource_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        num_participants,
        amenities,
        total_amount,
        status: BookingStatusEnum.PENDING,
        payment_status: PaymentStatusEnum.PENDING
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid booking type' });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(total_amount * 100); // Convert to smallest currency unit (paise)
    const order = await razorpayService.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `booking_${booking.id}`,
      notes: {
        booking_id: booking.id.toString(),
        booking_type,
        customer_id: customer_id.toString()
      }
    });

    // Update booking with order_id
    if (booking_type === 'seat') {
      await SeatBookingModel.update(
        { order_id: order.id },
        { where: { id: booking.id } }
      );
    } else {
      await MeetingBookingModel.update(
        { order_id: order.id },
        { where: { id: booking.id } }
      );
    }

    // Return booking summary with payment details
    return res.status(200).json({
      success: true,
      booking: {
        id: booking.id,
        booking_type,
        status: booking.status,
        total_amount,
        start_time: booking.start_time,
        end_time: booking.end_time
      },
      payment: {
        order_id: order.id,
        amount: order.amount / 100, // Convert back to main currency unit
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error creating booking summary:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateBookingPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { 
      booking_type, // 'seat' or 'meeting'
      booking_id,
      payment_id, 
      order_id, 
      signature 
    } = req.body;

    // Validate required fields
    if (!booking_type || !booking_id || !payment_id || !order_id || !signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify payment signature
    const verificationResult = razorpayService.verifyPaymentSignature({
      order_id,
      payment_id,
      signature
    });

    if (!verificationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed', 
        error: verificationResult.error 
      });
    }

    // Update booking status
    let booking;
    if (booking_type === 'seat') {
      await SeatBookingModel.update(
        {
          payment_id,
          payment_status: PaymentStatusEnum.COMPLETED,
          status: BookingStatusEnum.CONFIRMED
        },
        { where: { id: booking_id, order_id } }
      );
      booking = await SeatBookingModel.findByPk(booking_id);
    } else if (booking_type === 'meeting') {
      await MeetingBookingModel.update(
        {
          payment_id,
          payment_status: PaymentStatusEnum.COMPLETED,
          status: BookingStatusEnum.CONFIRMED
        },
        { where: { id: booking_id, order_id } }
      );
      booking = await MeetingBookingModel.findByPk(booking_id);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid booking type' });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment successful and booking confirmed',
      booking: {
        id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status
      }
    });
  } catch (error) {
    console.error('Error updating booking payment status:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    if (!webhookSignature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    // Implement webhook signature verification
    // This would depend on your webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== webhookSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Process webhook event
    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    if (event === 'payment.authorized') {
      // Payment was authorized
      const orderId = payload.order_id;
      const paymentId = payload.id;
      
      // Find booking by order_id
      let seatBooking = await SeatBookingModel.findOne({ where: { order_id: orderId } });
      let meetingBooking = await MeetingBookingModel.findOne({ where: { order_id: orderId } });
      
      if (seatBooking) {
        await SeatBookingModel.update(
          {
            payment_id: paymentId,
            payment_status: PaymentStatusEnum.COMPLETED,
            status: BookingStatusEnum.CONFIRMED
          },
          { where: { id: seatBooking.id } }
        );
      } else if (meetingBooking) {
        await MeetingBookingModel.update(
          {
            payment_id: paymentId,
            payment_status: PaymentStatusEnum.COMPLETED,
            status: BookingStatusEnum.CONFIRMED
          },
          { where: { id: meetingBooking.id } }
        );
      }
    } else if (event === 'payment.failed') {
      // Payment failed
      const orderId = payload.order_id;
      const paymentId = payload.id;
      
      // Find booking by order_id
      let seatBooking = await SeatBookingModel.findOne({ where: { order_id: orderId } });
      let meetingBooking = await MeetingBookingModel.findOne({ where: { order_id: orderId } });
      
      if (seatBooking) {
        await SeatBookingModel.update(
          {
            payment_id: paymentId,
            payment_status: PaymentStatusEnum.FAILED,
            status: BookingStatusEnum.CANCELLED
          },
          { where: { id: seatBooking.id } }
        );
      } else if (meetingBooking) {
        await MeetingBookingModel.update(
          {
            payment_id: paymentId,
            payment_status: PaymentStatusEnum.FAILED,
            status: BookingStatusEnum.CANCELLED
          },
          { where: { id: meetingBooking.id } }
        );
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};