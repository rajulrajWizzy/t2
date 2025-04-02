// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';
import { Op } from 'sequelize';

interface Seat {
  id: number;
  name: string;
  seat_number: string;
  seating_type_id: number;
  seating_type_name: string;
  branch_id: number;
  branch_name: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  location_description?: string;
  amenities?: string[];
  hourly_rate: number;
  daily_rate: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/seats - Get all seats with pagination and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const branch_id = searchParams.get('branch_id');
    const status = searchParams.get('status');
    const seating_type = searchParams.get('seating_type');
    
    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 && limit <= 100 ? limit : 10;
    const offset = (validPage - 1) * validLimit;

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { seat_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (seating_type) {
      whereClause.seating_type_id = seating_type;
    }

    // Count total seats matching criteria
    const count = await models.Seat.count({ where: whereClause });

    // Get seats with pagination and related data
    const seats = await models.Seat.findAll({
      where: whereClause,
      limit: validLimit,
      offset,
      order: [['id', 'ASC']],
      include: [
        { 
          model: models.Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address', 'city']
        },
        {
          model: models.SeatingType,
          as: 'seating_type',
          attributes: ['id', 'name', 'description', 'capacity']
        }
      ]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Seats retrieved successfully',
        data: {
          seats,
          pagination: {
            total: count,
            page: validPage,
            limit: validLimit,
            pages: Math.ceil(count / validLimit)
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Seats API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve seats' },
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