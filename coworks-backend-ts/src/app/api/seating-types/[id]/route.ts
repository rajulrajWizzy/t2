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

    // DEVELOPMENT ONLY: Bypass authentication for testing
    const bypassAuth = true; // Set to false in production
    
    // Execute the raw query to get the seating type by code
    const query = `
      SELECT 
        id, name, description, hourly_rate, daily_rate, weekly_rate, 
        monthly_rate, capacity, is_meeting_room, is_active, 
        created_at, updated_at, short_code, is_hourly, 
        min_booking_duration, min_seats
      FROM 
        excel_coworks_schema.seating_types
      WHERE 
        short_code = '${code}'
      LIMIT 1
    `;
    
    console.log('Seating Type SQL Query:', query);
    
    const [seatingTypes] = await models.sequelize.query(query);
    console.log(`Seating type query result:`, seatingTypes);
    
    if (!seatingTypes || seatingTypes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Seating type with code "${code}" not found` 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    const seatingType = seatingTypes[0];
    
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
      { success: false, message: 'Failed to retrieve seating type' },
      { status: 500, headers: corsHeaders }
    );
  }
} 