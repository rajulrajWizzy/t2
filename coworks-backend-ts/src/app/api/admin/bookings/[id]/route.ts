// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { QueryTypes } from 'sequelize';

// Handler for DELETE requests (cancel booking)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    
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
    
    // Find the booking
    const booking = await models.sequelize.query(
      `SELECT * FROM excel_coworks_schema.bookings WHERE id = :bookingId`,
      {
        replacements: { bookingId },
        type: QueryTypes.SELECT
      }
    );
    
    if (!booking || booking.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404 });
    }
    
    // Update booking status to 'cancelled' instead of deleting
    await models.sequelize.query(
      `UPDATE excel_coworks_schema.bookings 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = :bookingId`,
      {
        replacements: { bookingId },
        type: QueryTypes.UPDATE
      }
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel booking: ' + (error as Error).message
    }, { status: 500 });
  }
}

// Handler for PUT requests (update booking)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    
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
    
    // Find the booking
    const booking = await models.sequelize.query(
      `SELECT * FROM excel_coworks_schema.bookings WHERE id = :bookingId`,
      {
        replacements: { bookingId },
        type: QueryTypes.SELECT
      }
    );
    
    if (!booking || booking.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404 });
    }
    
    // Update booking
    await models.sequelize.query(
      `UPDATE excel_coworks_schema.bookings 
       SET customer_id = :customer_id, seat_id = :seat_id, branch_id = :branch_id, 
       start_date = :start_date, end_date = :end_date, status = :status, 
       amount = :amount, payment_status = :payment_status, updated_at = NOW() 
       WHERE id = :bookingId`,
      {
        replacements: {
          customer_id: data.customer_id,
          seat_id: data.seat_id,
          branch_id: data.branch_id,
          start_date: data.start_date,
          end_date: data.end_date,
          status: data.status,
          amount: data.amount,
          payment_status: data.payment_status,
          bookingId
        },
        type: QueryTypes.UPDATE
      }
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update booking: ' + (error as Error).message
    }, { status: 500 });
  }
}

// Handler for GET requests (get booking details)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    
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
    
    // Find the booking with related data
    const booking = await models.sequelize.query(
      `SELECT b.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, 
       s.name AS seat_name, s.seat_number, st.name AS seating_type_name, 
       br.name AS branch_name, br.address AS branch_address 
       FROM excel_coworks_schema.bookings b 
       LEFT JOIN excel_coworks_schema.users c ON b.customer_id = c.id 
       LEFT JOIN excel_coworks_schema.seats s ON b.seat_id = s.id 
       LEFT JOIN excel_coworks_schema.seating_types st ON s.seating_type_id = st.id 
       LEFT JOIN excel_coworks_schema.branches br ON b.branch_id = br.id 
       WHERE b.id = :bookingId`,
      {
        replacements: { bookingId },
        type: QueryTypes.SELECT
      }
    );
    
    if (!booking || booking.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Booking with ID ${bookingId} not found`
      }, { status: 404 });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking details retrieved successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve booking details: ' + (error as Error).message
    }, { status: 500 });
  }
}
