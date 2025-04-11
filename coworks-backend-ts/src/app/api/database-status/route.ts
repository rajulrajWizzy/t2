// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { corsHeaders } from '@/utils/jwt-wrapper';

interface DatabaseStatus {
  connected: boolean;
  environment: string;
  database: string;
  host: string;
  port: number;
  user: string;
  schema: string;
  message: string;
  tables?: string[];
}

/**
 * API route to check database status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Database Status] Checking database connection');
    
    const dbName = process.env.DB_NAME || 'coworks_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';

    // Prepare response object
    const status: DatabaseStatus = {
      connected: false,
      environment: process.env.NODE_ENV || 'development',
      database: dbName,
      host: dbHost,
      port: dbPort,
      user: dbUser,
      schema: dbSchema,
      message: 'Checking database connection...'
    };
    
    try {
      // Test database connection
      await models.sequelize.authenticate();
      status.connected = true;
      status.message = 'Database connection successful';
      
      // Get list of tables
      const [tables] = await models.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        ORDER BY table_name
      `);
      
      status.tables = (tables as any[]).map((t: any) => t.table_name);
      
      return NextResponse.json<ApiResponse<DatabaseStatus>>(
        { 
          success: true, 
          message: 'Database connection successful', 
          data: status 
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (error: any) {
      console.error('[Database Status] Connection error:', error);
      
      status.connected = false;
      status.message = `Database connection failed: ${error.message}`;
      
      return NextResponse.json<ApiResponse<DatabaseStatus>>(
        { 
          success: false, 
          message: 'Database connection failed', 
          data: status,
          error: error.message
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('[Database Status] Unexpected error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        message: 'Failed to check database status', 
        data: null,
        error: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
} 
