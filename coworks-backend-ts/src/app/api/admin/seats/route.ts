// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { Op } from 'sequelize';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireAdmin } from '@/app/api/middleware/requireRole';
import { AvailabilityStatusEnum } from '@/types/seating';

/**
 * GET /api/admin/seats - Get all seats with filtering (admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const branch_id = searchParams.get('branch_id');
    const availability_status = searchParams.get('availability_status');
    const seating_type_id = searchParams.get('seating_type_id');
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, message: 'Invalid pagination parameters' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Build where clause for search and filters
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { seat_number: { [Op.iLike]: `%${search}%` } },
        { seat_code: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }
    
    if (availability_status) {
      whereClause.availability_status = availability_status;
    }
    
    if (seating_type_id) {
      whereClause.seating_type_id = seating_type_id;
    }

    // Count total seats
    const total = await models.Seat.count({ where: whereClause });

    // Get seats with pagination
    const seats = await models.Seat.findAll({
      where: whereClause,
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration', 'min_seats', 'quantity_options', 'cost_multiplier']
        }
      ]
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          seats,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error fetching seats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch seats' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/admin/seats - Create a new seat (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    const body = await request.json();
    const {
      seat_number,
      branch_id,
      seating_type_id,
      price,
      capacity,
      is_configurable,
      availability_status
    } = body;

    // Validate required fields
    if (!seat_number || !branch_id || !seating_type_id || !price) {
      return NextResponse.json(
        { success: false, message: 'Seat number, branch ID, seating type ID, and price are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if seating type exists
    const seatingType = await models.SeatingType.findByPk(seating_type_id);
    if (!seatingType) {
      return NextResponse.json(
        { success: false, message: 'Seating type not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create seat
    const seat = await models.Seat.create({
      seat_number,
      branch_id,
      seating_type_id,
      price,
      capacity,
      is_configurable,
      availability_status: availability_status || AvailabilityStatusEnum.AVAILABLE
    });

    // Fetch created seat with relations
    const createdSeat = await models.Seat.findByPk(seat.id, {
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration', 'min_seats', 'quantity_options', 'cost_multiplier']
        }
      ]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Seat created successfully',
        data: createdSeat
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error creating seat:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create seat' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
