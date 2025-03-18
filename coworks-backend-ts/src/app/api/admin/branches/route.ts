import { NextRequest, NextResponse } from 'next/server';
import models, { sequelize } from '@/models';
import { requireSuperAdmin, requireBranchAdmin } from '@/middleware/roleAuth';
import { verifyToken } from '@/config/jwt';
import { UserRole } from '@/types/auth';

// GET /api/admin/branches - Get all branches with metrics
export async function GET(req: NextRequest) {
  try {
    // Check authorization
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const verificationResult = await verifyToken(token);
    if (!verificationResult?.decoded) {
      return new NextResponse(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build query based on user role
    let whereClause = {};
    if (verificationResult.decoded.role === UserRole.BRANCH_ADMIN) {
      whereClause = { id: verificationResult.decoded.managed_branch_id };
    }

    // Get all branches with metrics
    const branches = await models.Branch.findAll({
      where: whereClause,
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM Seats
              WHERE Seats.branch_id = Branch.id
            )`),
            'seatCount'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM Seats
              JOIN SeatBookings ON SeatBookings.seat_id = Seats.id
              WHERE Seats.branch_id = Branch.id
            )`),
            'bookingCount'
          ],
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(SeatBookings.total_price), 0)
              FROM Seats
              JOIN SeatBookings ON SeatBookings.seat_id = Seats.id
              WHERE Seats.branch_id = Branch.id
            )`),
            'revenue'
          ]
        ]
      }
    });

    return new NextResponse(JSON.stringify({ data: branches }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/admin/branches - Create a new branch (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    // Check if user is super admin
    const authResponse = await requireSuperAdmin(req);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const body = await req.json();
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
      short_code,
    } = body;

    // Validate required fields
    if (!name || !address || !location || !cost_multiplier || !opening_time || !closing_time || !short_code) {
      return new NextResponse(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude,
      longitude,
      cost_multiplier,
      opening_time,
      closing_time,
      is_active: is_active ?? true,
      short_code,
    });

    return new NextResponse(JSON.stringify({ data: branch }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/admin/branches - Delete a branch (Super Admin only)
export async function DELETE(req: NextRequest) {
  try {
    // Check if user is super admin
    const authResponse = await requireSuperAdmin(req);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new NextResponse(JSON.stringify({ message: 'Branch ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if branch exists
    const branch = await models.Branch.findByPk(id);
    if (!branch) {
      return new NextResponse(JSON.stringify({ message: 'Branch not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if branch has any seats
    const seatCount = await models.Seat.count({ where: { branch_id: id } });
    if (seatCount > 0) {
      return new NextResponse(JSON.stringify({ message: 'Cannot delete branch with existing seats' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete branch
    await branch.destroy();

    return new NextResponse(JSON.stringify({ message: 'Branch deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PATCH /api/admin/branches - Update branch details (Super Admin only)
export async function PATCH(req: NextRequest) {
  try {
    // Check if user is super admin
    const authResponse = await requireSuperAdmin(req);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const body = await req.json();

    if (!id) {
      return new NextResponse(JSON.stringify({ message: 'Branch ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if branch exists
    const branch = await models.Branch.findByPk(id);
    if (!branch) {
      return new NextResponse(JSON.stringify({ message: 'Branch not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update branch
    await branch.update(body);

    return new NextResponse(JSON.stringify({ data: branch }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
