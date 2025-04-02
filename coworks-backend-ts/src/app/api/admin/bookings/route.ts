// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { QueryTypes } from 'sequelize';

// Handler for GET requests (list bookings)
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status');
    const branchId = url.searchParams.get('branch_id');
    const customerId = url.searchParams.get('customer_id');
    const page = parseInt(url.searchParams.get('page') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for bookings list');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Build query conditions
    let conditions = '';
    const replacements: any = {};
    
    if (status) {
      conditions += ' AND b.status = :status';
      replacements.status = status;
    }
    
    if (branchId) {
      conditions += ' AND b.branch_id = :branchId';
      replacements.branchId = branchId;
    }
    
    if (customerId) {
      conditions += ' AND b.customer_id = :customerId';
      replacements.customerId = customerId;
    }
    
    if (searchQuery) {
      conditions += ' AND (c.name LIKE :search OR c.email LIKE :search OR s.name LIKE :search OR br.name LIKE :search)';
      replacements.search = `%${searchQuery}%`;
    }
    
    // Count total bookings
    const countResult = await models.sequelize.query(
      `SELECT COUNT(*) as total FROM excel_coworks_schema.bookings b
       LEFT JOIN excel_coworks_schema.users c ON b.customer_id = c.id
       LEFT JOIN excel_coworks_schema.seats s ON b.seat_id = s.id
       LEFT JOIN excel_coworks_schema.branches br ON b.branch_id = br.id
       WHERE 1=1 ${conditions}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    
    const total = countResult[0]?.total || 0;
    
    // Get bookings with pagination
    const bookings = await models.sequelize.query(
      `SELECT b.*, 
       c.name as customer_name, c.email as customer_email,
       s.name as seat_name, s.seat_number,
       st.name as seating_type, 
       br.name as branch_name
       FROM excel_coworks_schema.bookings b
       LEFT JOIN excel_coworks_schema.users c ON b.customer_id = c.id
       LEFT JOIN excel_coworks_schema.seats s ON b.seat_id = s.id
       LEFT JOIN excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
       LEFT JOIN excel_coworks_schema.branches br ON b.branch_id = br.id
       WHERE 1=1 ${conditions}
       ORDER BY b.created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          ...replacements,
          limit,
          offset: page * limit
        },
        type: QueryTypes.SELECT
      }
    );
    
    // Format bookings for response
    const formattedBookings = bookings.map((booking: any) => ({
      id: booking.id,
      customer_id: booking.customer_id,
      customer_name: booking.customer_name,
      seat_id: booking.seat_id,
      seat_name: booking.seat_name || 'Unknown Seat',
      seating_type: booking.seating_type || 'Unknown Type',
      branch_id: booking.branch_id,
      branch_name: booking.branch_name || 'Unknown Branch',
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      amount: booking.amount,
      payment_status: booking.payment_status,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    }));
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: formattedBookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve bookings: ' + (error as Error).message
    }, { status: 500 });
  }
}

// Handler for POST requests (create booking)
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['customer_id', 'seat_id', 'branch_id', 'start_date', 'end_date', 'amount'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({
          success: false,
          message: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for booking creation');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Check if seat exists
    const seatCheck = await models.sequelize.query(
      `SELECT id FROM excel_coworks_schema.seats WHERE id = :seatId`,
      {
        replacements: { seatId: data.seat_id },
        type: QueryTypes.SELECT
      }
    );
    
    if (!seatCheck || seatCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Seat with ID ${data.seat_id} not found`
      }, { status: 404 });
    }
    
    // Check if customer exists
    const customerCheck = await models.sequelize.query(
      `SELECT id FROM excel_coworks_schema.users WHERE id = :customerId`,
      {
        replacements: { customerId: data.customer_id },
        type: QueryTypes.SELECT
      }
    );
    
    if (!customerCheck || customerCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Customer with ID ${data.customer_id} not found`
      }, { status: 404 });
    }
    
    // Check if branch exists
    const branchCheck = await models.sequelize.query(
      `SELECT id FROM excel_coworks_schema.branches WHERE id = :branchId`,
      {
        replacements: { branchId: data.branch_id },
        type: QueryTypes.SELECT
      }
    );
    
    if (!branchCheck || branchCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Branch with ID ${data.branch_id} not found`
      }, { status: 404 });
    }
    
    // Check for overlapping bookings
    const overlapCheck = await models.sequelize.query(
      `SELECT id FROM excel_coworks_schema.bookings 
       WHERE seat_id = :seatId 
       AND status IN ('active', 'pending')
       AND (
         (start_date <= :endDate AND end_date >= :startDate)
       )`,
      {
        replacements: { 
          seatId: data.seat_id,
          startDate: data.start_date,
          endDate: data.end_date
        },
        type: QueryTypes.SELECT
      }
    );
    
    if (overlapCheck && overlapCheck.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This seat is already booked for the selected time period'
      }, { status: 409 });
    }
    
    // Create new booking
    const result = await models.sequelize.query(
      `INSERT INTO excel_coworks_schema.bookings
       (customer_id, seat_id, branch_id, start_date, end_date, status, amount, payment_status, created_at, updated_at)
       VALUES (:customerId, :seatId, :branchId, :startDate, :endDate, :status, :amount, :paymentStatus, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          customerId: data.customer_id,
          seatId: data.seat_id,
          branchId: data.branch_id,
          startDate: data.start_date,
          endDate: data.end_date,
          status: data.status || 'pending',
          amount: data.amount,
          paymentStatus: data.payment_status || 'pending'
        },
        type: QueryTypes.INSERT
      }
    );
    
    const bookingId = result[0][0]?.id;
    
    if (!bookingId) {
      throw new Error('Failed to create booking');
    }
    
    // Get the created booking
    const newBooking = await models.sequelize.query(
      `SELECT b.*, 
       c.name as customer_name, c.email as customer_email,
       s.name as seat_name, s.seat_number,
       st.name as seating_type, 
       br.name as branch_name
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
    
    // Format booking for response
    const formattedBooking = newBooking[0] ? {
      id: newBooking[0].id,
      customer_id: newBooking[0].customer_id,
      customer_name: newBooking[0].customer_name,
      seat_id: newBooking[0].seat_id,
      seat_name: newBooking[0].seat_name || 'Unknown Seat',
      seating_type: newBooking[0].seating_type || 'Unknown Type',
      branch_id: newBooking[0].branch_id,
      branch_name: newBooking[0].branch_name || 'Unknown Branch',
      start_date: newBooking[0].start_date,
      end_date: newBooking[0].end_date,
      status: newBooking[0].status,
      amount: newBooking[0].amount,
      payment_status: newBooking[0].payment_status,
      created_at: newBooking[0].created_at,
      updated_at: newBooking[0].updated_at
    } : null;
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: formattedBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create booking: ' + (error as Error).message
    }, { status: 500 });
  }
}
