// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

// GET a single seating type by code
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const code = params.id;
    console.log(`Seating Type API GET by code: ${code}`);

    // Use Sequelize model instead of raw SQL queries
    const seatingType = await models.SeatingType.findOne({
      where: { short_code: code },
      attributes: [
        'id', 'name', 'description', 'hourly_rate', 'daily_rate', 'weekly_rate', 
        'monthly_rate', 'capacity', 'is_meeting_room', 'is_active', 
        'created_at', 'updated_at', 'short_code', 'is_hourly', 
        'min_booking_duration', 'min_seats'
      ]
    });
    
    if (!seatingType) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Seating type with code "${code}" not found` 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return with success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Seating type retrieved successfully', 
        data: seatingType 
      },
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error(`Error fetching seating type:`, error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve seating type',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 