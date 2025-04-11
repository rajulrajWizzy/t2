// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

// GET a single seat by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = params.id;
    console.log(`Seat API GET by ID: ${id}`);

    // Use Sequelize model instead of raw SQL queries
    const seat = await models.Seat.findByPk(Number(id), {
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'address']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration']
        }
      ]
    });
    
    if (!seat) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Seat with ID "${id}" not found` 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return with success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Seat retrieved successfully', 
        data: seat 
      },
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error(`Error fetching seat:`, error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve seat',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 