import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { isValidAdmin } from '@/utils/adminAuth';
import { Op } from 'sequelize';

// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
// List all maintenance blocks with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminId = await isValidAdmin(request);
    if (!adminId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401, headers: corsHeaders });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const seatId = searchParams.get('seat_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Build where clause based on filters
    const whereClause: any = {};
    
    if (seatId) {
      whereClause.seat_id = seatId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.start_time = {};
      whereClause.end_time = {};
      
      if (startDate) {
        const startDateTime = new Date(startDate);
        whereClause.end_time[Op.gte] = startDateTime;
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        whereClause.start_time[Op.lte] = endDateTime;
      }
    }
    
    // Fetch maintenance blocks with associated seat information
    const maintenanceBlocks = await models.MaintenanceBlock.findAll({
      where: whereClause,
      include: [
        {
          model: models.Seat,
          as: 'Seat',
          attributes: ['id', 'name', 'branch_id'],
          include: [
            {
              model: models.Branch,
              as: 'Branch',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['start_time', 'ASC']]
    });
    
    return NextResponse.json({
      success: true,
      data: maintenanceBlocks
    }, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error fetching maintenance blocks:', error);
    return NextResponse.json({
      error: 'Failed to fetch maintenance blocks',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500, headers: corsHeaders });
  }
} 