// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';
import { Op } from 'sequelize';

/**
 * GET /api/seats/filter - Get seats with flexible filtering options
 * Supports filtering by branch_id, seating_type_id, or seating_type_code
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const branch_id = searchParams.get('branch_id');
    const seating_type_id = searchParams.get('seating_type_id');
    const seating_type_code = searchParams.get('seating_type_code');
    const status = searchParams.get('status');
    
    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 && limit <= 100 ? limit : 10;
    const offset = (validPage - 1) * validLimit;

    // Build where clause for filtering
    const whereClause: any = {};
    const includeClause: any[] = [
      { 
        model: models.Branch,
        as: 'Branch',
        attributes: ['id', 'name', 'address', 'location']
      },
      {
        model: models.SeatingType,
        as: 'SeatingType',
        attributes: ['id', 'name', 'description', 'capacity', 'short_code']
      }
    ];
    
    // Filter by branch_id if provided
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }
    
    // Filter by seating_type_id if provided
    if (seating_type_id) {
      whereClause.seating_type_id = seating_type_id;
    }
    
    // Filter by seating_type_code if provided
    if (seating_type_code && !seating_type_id) {
      // We need to join with the seating_types table to filter by short_code
      includeClause[1].where = { short_code: seating_type_code };
    }
    
    // Filter by availability status if provided
    if (status) {
      whereClause.availability_status = status;
    }

    // Count total seats matching criteria
    const count = await models.Seat.count({ 
      where: whereClause,
      include: seating_type_code && !seating_type_id ? [includeClause[1]] : []
    });

    // Get seats with pagination and related data
    const seats = await models.Seat.findAll({
      where: whereClause,
      limit: validLimit,
      offset,
      order: [['id', 'ASC']],
      include: includeClause
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
    console.error('[Seats Filter API] Error:', error);
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