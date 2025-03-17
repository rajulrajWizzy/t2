import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/middleware/adminAuth';
import models from '@/models';

/**
 * GET all branches for admin
 * Includes additional data like seat counts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;

    // Get branches with additional metrics
    const branches = await models.Branch.findAll({
      include: [
        {
          model: models.Seat,
          as: 'Seats',
          attributes: []
        }
      ],
      attributes: {
        include: [
          [models.sequelize.fn('COUNT', models.sequelize.col('Seats.id')), 'seatCount']
        ]
      },
      group: ['Branch.id']
    });

    // Get additional metrics for each branch
    const branchesWithMetrics = await Promise.all(
      branches.map(async (branch: any) => {
        const branchData = branch.get({ plain: true });
        
        // Get booking count for this branch
        const bookingCount = await models.SeatBooking.count({
          include: [{
            model: models.Seat,
            as: 'Seat',
            where: { branch_id: branch.id }
          }]
        });
        
        // Get revenue for this branch
        const revenue = await models.SeatBooking.sum('total_price', {
          include: [{
            model: models.Seat,
            as: 'Seat',
            where: { branch_id: branch.id }
          }]
        });
        
        return {
          ...branchData,
          bookingCount,
          revenue: revenue || 0
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: branchesWithMetrics
    });
  } catch (error) {
    console.error('Error fetching branches for admin:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch branches',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST create a new branch (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;
    
    // Parse the request body
    const body = await request.json();
    const { 
      name, 
      address, 
      location, 
      latitude, 
      longitude, 
      cost_multiplier, 
      opening_time, 
      closing_time,
      is_active,
      images,
      amenities,
      short_code
    } = body;
    
    // Basic validation
    if (!name || !address || !location) {
      return NextResponse.json({
        success: false,
        message: 'Name, address, and location are required'
      }, { status: 400 });
    }
    
    // Check if branch with short_code already exists
    if (short_code) {
      const existingBranch = await models.Branch.findOne({
        where: { short_code }
      });
      
      if (existingBranch) {
        return NextResponse.json({
          success: false,
          message: 'Branch with this short code already exists'
        }, { status: 409 });
      }
    }
    
    // Create a new branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude,
      longitude,
      cost_multiplier,
      opening_time,
      closing_time,
      is_active: is_active !== undefined ? is_active : true,
      images,
      amenities,
      short_code
    });
    
    return NextResponse.json({
      success: true,
      message: 'Branch created successfully',
      data: branch
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create branch',
      error: (error as Error).message
    }, { status: 500 });
  }
}
