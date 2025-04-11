import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { Op } from 'sequelize';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { isValidAdmin } from '@/utils/adminAuth';

// Set runtime to nodejs for Sequelize to function
export const runtime = 'nodejs';

// Define request body interface
interface BlockRequestBody {
  seat_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminId = await isValidAdmin(request);
    if (!adminId) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const body: BlockRequestBody = await request.json();

    // Validate required fields
    if (!body.seat_id || !body.start_time || !body.end_time || !body.reason) {
      return new NextResponse(
        JSON.stringify({
          error: 'Missing required fields: seat_id, start_time, end_time, and reason are required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate date formats
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid date format for start_time or end_time',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Ensure end_time is after start_time
    if (endTime <= startTime) {
      return new NextResponse(
        JSON.stringify({
          error: 'end_time must be after start_time',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify seat exists
    const seat = await models.Seat.findByPk(body.seat_id);
    if (!seat) {
      return new NextResponse(
        JSON.stringify({
          error: 'Seat not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check for conflicting bookings
    const conflictingBookings = await models.SeatBooking.findAll({
      where: {
        seat_id: body.seat_id,
        status: 'confirmed',
        [Op.or]: [
          {
            // Booking starts during maintenance
            [Op.and]: [
              { start_time: { [Op.lt]: endTime } },
              { start_time: { [Op.gte]: startTime } }
            ]
          },
          {
            // Booking ends during maintenance
            [Op.and]: [
              { end_time: { [Op.gt]: startTime } },
              { end_time: { [Op.lte]: endTime } }
            ]
          },
          {
            // Booking spans maintenance
            [Op.and]: [
              { start_time: { [Op.lte]: startTime } },
              { end_time: { [Op.gte]: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingBookings.length > 0) {
      return new NextResponse(
        JSON.stringify({
          error: 'Conflicting bookings found',
          conflicts: conflictingBookings.map(booking => ({
            id: booking.id,
            start_time: booking.start_time,
            end_time: booking.end_time
          }))
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create maintenance block
    const maintenanceBlock = await models.MaintenanceBlock.create({
      seat_id: body.seat_id,
      start_time: startTime,
      end_time: endTime,
      reason: body.reason,
      notes: body.notes,
      created_by: adminId
    });

    return new NextResponse(
      JSON.stringify({
        message: 'Maintenance block created successfully',
        block_id: maintenanceBlock.id
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating maintenance block:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 