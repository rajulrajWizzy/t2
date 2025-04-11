// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { createOrder } from '@/utils/razorpay';
import { BookingStatusEnum } from '@/types/booking';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { validateAuthToken } from '@/utils/auth-helper';

/**
 * API endpoint to create a booking order
 * POST /api/bookings/create-order
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the customer using the auth helper
    const authResult = await validateAuthToken(request);
    
    if (!authResult.isValid || !authResult.decoded) {
      return authResult.errorResponse as NextResponse;
    }
    
    const decoded = authResult.decoded;
    
    console.log('Token verification result:', { userId: decoded.id }); // Debug log
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['seating_type_code', 'start_time', 'end_time'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          message: `The following fields are required: ${missingFields.join(', ')}` 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate quantity
    const quantity = body.quantity ? parseInt(body.quantity, 10) : 1;
    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity', message: 'Quantity must be a positive number' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get customer details
    const customerId = decoded.id;
    const customer = await models.Customer.findByPk(customerId);
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found', message: 'Invalid customer ID' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Validate branch_id
    if (!body.branch_id) {
      return NextResponse.json(
        { error: 'Missing branch_id', message: 'branch_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if branch exists
    const branch = await models.Branch.findByPk(body.branch_id);
    if (!branch) {
      // List available branches to help with debugging
      const branches = await models.Branch.findAll({
        attributes: ['id', 'name']
      });
      
      console.log('Available branches:', branches.map(b => ({
        id: b.id,
        name: b.name
      })));
      
      return NextResponse.json(
        { error: 'Invalid branch', message: `Branch with ID ${body.branch_id} not found` },
        { status: 404, headers: corsHeaders }
      );
    }
    
    console.log(`Found branch: ID=${branch.id}, Name=${branch.name}`);
    
    // Log all seating types to help debug
    const allSeatingTypes = await models.SeatingType.findAll({
      attributes: ['id', 'name', 'short_code']
    });
    console.log('Available seating types:', allSeatingTypes.map(st => ({
      id: st.id,
      name: st.name,
      short_code: st.short_code
    })));
    
    // Find the seating type - using case-insensitive comparison for short_code
    const seatingType = await models.SeatingType.findOne({
      where: {
        [Op.or]: [
          { short_code: body.seating_type_code },
          { short_code: body.seating_type_code.toUpperCase() },
          { short_code: body.seating_type_code.toLowerCase() }
        ]
      }
    });
    
    if (!seatingType) {
      return NextResponse.json(
        { error: 'Invalid seating type', message: `Seating type with code '${body.seating_type_code}' not found` },
        { status: 404, headers: corsHeaders }
      );
    }
    
    console.log(`Looking for seating type: ID=${seatingType.id}, Name=${seatingType.name}, Code=${body.seating_type_code}`);
    console.log(`Branch ID: ${body.branch_id}, Quantity: ${quantity}`);
    
    // Find suitable rooms based on capacity and quantity
    const suitableRooms = await models.Seat.findAll({
      where: {
        branch_id: body.branch_id,
        seating_type_code: body.seating_type_code,
        capacity: {
          [Op.gte]: body.capacity || 4
        },
        status: 'available'
      },
      order: [['capacity', 'ASC']],
      limit: quantity // Limit to requested quantity
    });

    if (suitableRooms.length < quantity) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient rooms',
        message: `Only ${suitableRooms.length} rooms available with required capacity`
      }, { status: 400 });
    }

    // Check for existing bookings for each room
    const availableRooms = [];
    for (const room of suitableRooms) {
      const existingBooking = await models.Booking.findOne({
        where: {
          seat_id: room.id,
          start_date: body.start_time.split('T')[0],
          [Op.or]: [
            {
              [Op.and]: [
                { start_time: { [Op.lte]: body.start_time } },
                { end_time: { [Op.gt]: body.start_time } }
              ]
            },
            {
              [Op.and]: [
                { start_time: { [Op.lt]: body.end_time } },
                { end_time: { [Op.gte]: body.end_time } }
              ]
            },
            {
              [Op.and]: [
                { start_time: { [Op.gte]: body.start_time } },
                { end_time: { [Op.lte]: body.end_time } }
              ]
            }
          ],
          status: {
            [Op.in]: ['pending', 'confirmed']
          }
        }
      });

      if (!existingBooking) {
        availableRooms.push(room);
      }
    }

    if (availableRooms.length < quantity) {
      return NextResponse.json({
        success: false,
        error: 'Rooms not available',
        message: `Only ${availableRooms.length} rooms available at requested time`
      }, { status: 400 });
    }

    // Create bookings for each available room
    const bookings = [];
    for (const room of availableRooms.slice(0, quantity)) {
      const booking = await models.Booking.create({
        id: uuidv4(),
        user_id: customerId,
        branch_id: body.branch_id,
        seat_id: room.id,
        start_date: body.start_time.split('T')[0],
        start_time: body.start_time,
        end_time: body.end_time,
        status: BookingStatusEnum.PENDING,
        payment_method: body.payment_method || 'standard',
        notes: body.notes || null
      });
      bookings.push(booking);
    }
    
    // Calculate total price and duration
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    const pricePerHour = seatingType.hourly_rate || 100; // Default to 100 if price not set
    
    // Calculate total amount for all seats
    const totalAmount = durationHours * pricePerHour * quantity;
    
    // Generate a unique receipt ID
    const receiptId = `BOOK-${uuidv4().slice(0, 8)}`;
    
    // Create Razorpay order
    const order = await createOrder(totalAmount, receiptId, {
      customerId: customerId.toString(),
      customerEmail: customer.email,
      seatingType: body.seating_type_code,
      quantity: quantity.toString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });
    
    // Create payment record
    await models.Payment.create({
      booking_id: bookings[0].id, // Link to the first booking
      booking_type: 'seat' as any,
      amount: totalAmount,
      payment_method: body.payment_method || 'CREDIT_CARD',
      status: 'PENDING', // Use status instead of payment_status
      order_id: order.id // Store Razorpay order ID
    } as any); // Use type assertion for now

    // Return order details and booking IDs
    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: order.id,
        amount: totalAmount,
        currency: 'INR',
        receipt: receiptId,
        booking_ids: bookings.map(b => b.id),
        payment_details: {
          key_id: process.env.RAZORPAY_KEY_ID,
          amount: totalAmount,
          currency: order.currency,
          name: 'Coworks',
          description: `Booking for ${quantity} ${seatingType.name} seats`,
          order_id: order.id,
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone || ''
          }
        }
      }
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('Error creating booking order:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}