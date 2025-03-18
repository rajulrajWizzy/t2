import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import models from '@/models';
import { Op } from 'sequelize';
import { ApiResponse } from '@/types/common';
import { TimeSlot, TimeSlotGenerationParams } from '@/types/booking';

// GET slots based on filters
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const branch_id = searchParams.get('branch_id');
    const date = searchParams.get('date');

    // Validate required filters
    if (!branch_id) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID is required',
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get time slots
    const timeSlots = await models.TimeSlot.findAll({
      where: {
        branch_id: parseInt(branch_id),
        ...(date ? { date: new Date(date) } : {}),
        is_available: true
      },
      include: [{
        model: models.Seat,
        as: 'Seat',
        attributes: ['id', 'seat_number', 'price'],
        required: true
      }],
      order: [
        ['date', 'ASC'],
        ['start_time', 'ASC']
      ]
    });

    const response: ApiResponse<TimeSlot[]> = {
      success: true,
      message: 'Time slots retrieved successfully',
      data: timeSlots
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch time slots',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Generate time slots for a specific date and branch
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Parse request body
    const { branch_id, date, regenerate = false }: TimeSlotGenerationParams = await request.json();

    // Validate input
    if (!branch_id || !date) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID and date are required',
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch not found',
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if slots already exist for this date
    const existingSlots = await models.TimeSlot.count({
      where: {
        branch_id,
        date: new Date(date)
      }
    });

    if (existingSlots > 0 && !regenerate) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Time slots already exist for this branch and date. Set regenerate to true to recreate.',
        data: null
      };
      return NextResponse.json(response);
    }

    // Get all seats for the branch
    const seats = await models.Seat.findAll({
      where: {
        branch_id,
        availability_status: 'AVAILABLE'
      }
    });

    if (seats.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'No available seats found for this branch',
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Delete existing slots if regenerating
    if (regenerate && existingSlots > 0) {
      await models.TimeSlot.destroy({
        where: {
          branch_id,
          date: new Date(date)
        }
      });
    }

    // Generate time slots for each seat
    const businessHours = {
      start: '09:00',
      end: '18:00'
    };

    const newSlots = seats.flatMap(seat => {
      const slots = [];
      let currentTime = businessHours.start;

      while (currentTime < businessHours.end) {
        slots.push({
          branch_id,
          seat_id: seat.id,
          date,
          start_time: currentTime,
          end_time: addHours(currentTime, 1),
          is_available: true
        });
        currentTime = addHours(currentTime, 1);
      }

      return slots;
    });

    // Bulk create slots
    const createdSlots = await models.TimeSlot.bulkCreate(newSlots);

    const response: ApiResponse<{ count: number }> = {
      success: true,
      message: 'Time slots created successfully',
      data: { count: createdSlots.length }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating time slots:', error);
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to create time slots',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Helper function to add hours to a time string
function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const newHour = (h + hours) % 24;
  return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}