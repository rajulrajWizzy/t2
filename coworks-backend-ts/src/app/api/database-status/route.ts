import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import AdminModel from '@/models/admin';

/**
 * Database status check endpoint
 * This is useful for verifying database connectivity in production
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const results = {
    database_connection: false,
    admins_table: false,
    super_admin_exists: false,
    database_error: null,
    admins_error: null,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    // Check basic database connection
    await sequelize.authenticate();
    results.database_connection = true;
    
    try {
      // Check if admins table exists by counting records
      const adminCount = await AdminModel.count();
      results.admins_table = true;
      
      // Check if any super admin exists
      const superAdminCount = await AdminModel.count({
        where: {
          role: 'super_admin',
          is_active: true
        }
      });
      
      results.super_admin_exists = superAdminCount > 0;
    } catch (error: any) {
      results.admins_error = error.message;
    }
  } catch (error: any) {
    results.database_error = error.message;
  }

  // Return with CORS headers
  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

// Support OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 