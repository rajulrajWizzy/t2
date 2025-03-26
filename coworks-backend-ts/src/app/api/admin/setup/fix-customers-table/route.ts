// Explicitly set Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import { ApiResponse } from '@/types/common';
import { QueryTypes } from 'sequelize';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Endpoint to fix customers table by adding missing columns
 * @returns API response with status of the fix
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if the customers table exists
    const tableExistsResult = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customers'
      );
    `, { plain: true });

    const tableExists = tableExistsResult?.exists;
    
    if (!tableExists) {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message: 'Customers table does not exist',
        data: null
      }, { status: 404, headers: corsHeaders });
    }

    // Check if columns already exist
    const columnsExist = await sequelize.query(`
      SELECT 
        column_name
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'customers' 
        AND column_name IN ('proof_of_identity', 'proof_of_address', 'address');
    `, { type: QueryTypes.SELECT });

    const existingColumns = columnsExist.map((col: any) => col.column_name);
    const missingColumns = [];

    // Add proof_of_identity column if it doesn't exist
    if (!existingColumns.includes('proof_of_identity')) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN proof_of_identity VARCHAR(255);
      `);
      missingColumns.push('proof_of_identity');
    }

    // Add proof_of_address column if it doesn't exist
    if (!existingColumns.includes('proof_of_address')) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN proof_of_address VARCHAR(255);
      `);
      missingColumns.push('proof_of_address');
    }

    // Add address column if it doesn't exist
    if (!existingColumns.includes('address')) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN address TEXT;
      `);
      missingColumns.push('address');
    }

    // Record the migration if it doesn't exist
    const migrationExistsResult = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM migrations 
        WHERE name = 'customer_profile_identity_fields'
      );
    `, { plain: true });

    const migrationExists = migrationExistsResult?.exists;
    
    if (!migrationExists) {
      await sequelize.query(`
        INSERT INTO migrations (name, applied_at)
        VALUES ('customer_profile_identity_fields', NOW());
      `);
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: missingColumns.length > 0 
        ? `Fixed customers table by adding missing columns: ${missingColumns.join(', ')}` 
        : 'Customers table already has all required columns',
      data: {
        missingColumns,
        existingColumns,
        allColumnsPresent: missingColumns.length === 0
      }
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error fixing customers table:', error);
    return NextResponse.json<ApiResponse<any>>({
      success: false,
      message: 'Failed to fix customers table',
      data: { error: (error as Error).message }
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 