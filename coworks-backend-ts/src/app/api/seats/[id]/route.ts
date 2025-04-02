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

    // DEVELOPMENT ONLY: Bypass authentication for testing
    const bypassAuth = true; // Set to false in production
    
    // Execute the raw query to get the seat by ID
    const query = `
      SELECT 
        s.id, s.branch_id, s.seating_type_id, s.name, s.seat_number, 
        s.price, s.capacity, s.is_configurable, s.availability_status, 
        s.created_at, s.updated_at, s.seat_code,
        b.name as branch_name, b.short_code as branch_short_code,
        st.name as seating_type_name, st.short_code as seating_type_code
      FROM 
        excel_coworks_schema.seats s
      JOIN
        excel_coworks_schema.branches b ON s.branch_id = b.id
      JOIN
        excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
      WHERE 
        s.id = ${id}
      LIMIT 1
    `;
    
    console.log('Seat SQL Query:', query);
    
    const [seats] = await models.sequelize.query(query);
    console.log(`Seat query result:`, seats);
    
    if (!seats || seats.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Seat with ID "${id}" not found` 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    const seat = seats[0];
    
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
      { success: false, message: 'Failed to retrieve seat' },
      { status: 500, headers: corsHeaders }
    );
  }
} 