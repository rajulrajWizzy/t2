// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { BookingStatusEnum } from '@/types/booking';
import { corsHeaders } from '@/utils/jwt-wrapper';

// Handler for DELETE requests (cancel booking)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = Number(params.id);
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for booking cancellation');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Find the booking with Sequelize ORM
    const booking = await models.SeatBooking.findByPk(bookingId);
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404, headers: corsHeaders });
    }
    
    // Update booking status to 'cancelled' instead of deleting
    await booking.update({ 
      status: BookingStatusEnum.CANCELLED,
      updated_at: new Date()
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel booking: ' + (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

// Handler for PUT requests (update booking)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = Number(params.id);
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Parse request body
    const data = await request.json();
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for booking update');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Find the booking with Sequelize
    const booking = await models.SeatBooking.findByPk(bookingId);
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404, headers: corsHeaders });
    }
    
    // Update booking using Sequelize model
    await booking.update({
      customer_id: data.customer_id,
      seat_id: data.seat_id,
      branch_id: data.branch_id,
      start_time: data.start_date,
      end_time: data.end_date,
      status: data.status,
      total_amount: data.amount,
      payment_status: data.payment_status,
      updated_at: new Date()
    });
    
    // Get the updated booking
    const updatedBooking = await models.SeatBooking.findByPk(bookingId);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error updating booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update booking: ' + (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

// Handler for GET requests (get booking details)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = Number(params.id);
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for booking details');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Find the booking with related data using Sequelize
    const booking = await models.SeatBooking.findByPk(bookingId, {
      include: [
        {
          model: models.Customer,
          as: 'Customer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: models.Seat,
          as: 'Seat',
          attributes: ['id', 'seat_number', 'name'],
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              attributes: ['id', 'name', 'short_code']
            },
            {
              model: models.Branch,
              as: 'Branch',
              attributes: ['id', 'name', 'address']
            }
          ]
        }
      ]
    });
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404, headers: corsHeaders });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking details retrieved successfully',
      data: booking
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve booking details: ' + (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}
