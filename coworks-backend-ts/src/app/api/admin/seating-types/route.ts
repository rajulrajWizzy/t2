// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { verifyAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';
import { ApiResponse } from '@/types/common';
import { SeatingTypeInput } from '@/types/seating';

/**
 * GET all seating types
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Get query parameters for filtering and pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';

    try {
      // Check if database is connected
      try {
        await db.sequelize.authenticate();
        console.log('Database connection is active for seating-types endpoint');
      } catch (dbConnectionError) {
        console.error('Database connection failed:', dbConnectionError);
        throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
      }

      // Build query
      const query: any = {};
      
      if (search) {
        query.name = {
          [Op.iLike]: `%${search}%`
        };
      }

      console.log('Executing seating-types query with parameters:', { query, limit, offset });

      // Get total count and seating types
      const { count, rows: seatingTypes } = await db.SeatingType.findAndCountAll({
        where: query,
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      // Format response
      const response: ApiResponse<any> = {
        success: true,
        message: 'Seating types retrieved successfully',
        data: {
          seatingTypes,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit)
          }
        }
      };

      return NextResponse.json(response);
    } catch (dbError) {
      console.error('Database error in GET /api/admin/seating-types:', dbError);
      
      // Return error response with detailed information
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch seating types from database',
        error: (dbError as Error).message,
        stack: (dbError as Error).stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/seating-types:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST/Create a new seating type
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication with proper permissions
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Check permissions - only super admins should create seating types
    if (adminAuth.role !== 'super_admin') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Permission denied: Only super admins can create seating types',
          data: null
        },
        { status: 403 }
      );
    }

    const body = await req.json() as SeatingTypeInput;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Name is required for seating type',
          data: null
        },
        { status: 400 }
      );
    }

    // Validate rates based on interval settings
    if (body.is_hourly && (!body.hourly_rate || body.hourly_rate < 0)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Hourly rate is required and must be non-negative when hourly booking is enabled',
          data: null
        },
        { status: 400 }
      );
    }

    if (body.is_daily && (!body.daily_rate || body.daily_rate < 0)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Daily rate is required and must be non-negative when daily booking is enabled',
          data: null
        },
        { status: 400 }
      );
    }

    if (body.is_weekly && (!body.weekly_rate || body.weekly_rate < 0)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Weekly rate is required and must be non-negative when weekly booking is enabled',
          data: null
        },
        { status: 400 }
      );
    }

    if (body.is_monthly && (!body.monthly_rate || body.monthly_rate < 0)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Monthly rate is required and must be non-negative when monthly booking is enabled',
          data: null
        },
        { status: 400 }
      );
    }

    // Validate cost_multiplier if provided
    if (body.cost_multiplier) {
      // Ensure cost_multiplier is a valid object with numeric values
      const isValidMultiplier = typeof body.cost_multiplier === 'object' && 
        Object.values(body.cost_multiplier).every(value => 
          typeof value === 'number' && value > 0 && value <= 1
        );

      if (!isValidMultiplier) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: 'Invalid cost_multiplier format. Must be an object with values between 0-1',
            data: null
          },
          { status: 400 }
        );
      }
    }

    // Create seating type
    const seatingType = await db.SeatingType.create({
      ...body,
      // Set default values for interval flags if not provided
      is_hourly: body.is_hourly ?? false,
      is_daily: body.is_daily ?? false,
      is_weekly: body.is_weekly ?? false,
      is_monthly: body.is_monthly ?? false,
      // Set rates to 0 if not provided
      hourly_rate: body.hourly_rate ?? 0,
      daily_rate: body.daily_rate ?? 0,
      weekly_rate: body.weekly_rate ?? 0,
      monthly_rate: body.monthly_rate ?? 0
    });

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        message: 'Seating type created successfully',
        data: seatingType
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating seating type:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: 'Failed to create seating type',
        data: null,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
