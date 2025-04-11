// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

// GET debug information for seats and their availability
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const seatingTypeCode = searchParams.get('seating_type_code');
    
    // Check required parameters
    if (!branchId) {
      return NextResponse.json(
        { error: "branch_id parameter is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get branch information
    let branchQuery = `
      SELECT * FROM "excel_coworks_schema"."branches" 
      WHERE id = :branchId
    `;
    
    const branch = await models.sequelize.query(
      branchQuery,
      {
        replacements: { branchId: Number(branchId) },
        type: models.sequelize.QueryTypes.SELECT
      }
    );
    
    if (!branch || branch.length === 0) {
      // If branch not found, get list of valid branches
      const branchesQuery = `
        SELECT id, name FROM "excel_coworks_schema"."branches" 
        ORDER BY id
      `;
      
      const branches = await models.sequelize.query(
        branchesQuery,
        { type: models.sequelize.QueryTypes.SELECT }
      );
      
      return NextResponse.json(
        { 
          error: `Branch with ID ${branchId} not found`, 
          available_branches: branches 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Build query for seats
    let seatsQuery = `
      SELECT s.*, 
        st.id as seating_type_id, 
        st.name as seating_type_name, 
        st.short_code as seating_type_code
      FROM "excel_coworks_schema"."seats" s
      JOIN "excel_coworks_schema"."seating_types" st ON s.seating_type_id = st.id
      WHERE s.branch_id = :branchId
    `;
    
    const queryParams: any = { branchId: Number(branchId) };
    
    if (seatingTypeCode) {
      seatsQuery += ` AND st.short_code = :seatingTypeCode`;
      queryParams.seatingTypeCode = seatingTypeCode;
    }
    
    // Execute the query
    const seats = await models.sequelize.query(
      seatsQuery,
      {
        replacements: queryParams,
        type: models.sequelize.QueryTypes.SELECT
      }
    );
    
    // Get schema information
    const schemaQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'excel_coworks_schema'
      AND table_name IN ('seats', 'seating_types', 'branches')
      ORDER BY table_name, column_name
    `;
    
    const schemaInfo = await models.sequelize.query(
      schemaQuery,
      { type: models.sequelize.QueryTypes.SELECT }
    );
    
    // Get all available seating types
    const seatingTypesQuery = `
      SELECT * FROM "excel_coworks_schema"."seating_types"
      ORDER BY id
    `;
    
    const seatingTypes = await models.sequelize.query(
      seatingTypesQuery,
      { type: models.sequelize.QueryTypes.SELECT }
    );
    
    // Return debug information
    return NextResponse.json({
      branch: branch[0],
      schema_info: schemaInfo,
      seats_count: seats.length,
      seats: seats.map((seat: any) => ({
        id: seat.id,
        seat_number: seat.seat_number,
        seat_code: seat.seat_code,
        price: seat.price,
        availability_status: seat.availability_status,
        seating_type: {
          id: seat.seating_type_id,
          name: seat.seating_type_name,
          code: seat.seating_type_code
        }
      })),
      available_seating_types: seatingTypes,
      query_params: {
        branch_id: branchId,
        seating_type_code: seatingTypeCode
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error("Error in debug API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 