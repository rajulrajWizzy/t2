// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import AdminModel from '@/models/admin';

// Define the results interface with all possible properties
interface DatabaseStatusResults {
  database_connection: boolean;
  admins_table: boolean;
  super_admin_exists: boolean;
  database_error: string | null;
  admins_error: string | null;
  database_info: any;
  environment: string;
  timestamp: string;
  database_url: string;
  super_admin_info?: any; // Make this property optional
}

/**
 * Database status check endpoint
 * This is useful for verifying database connectivity in production
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[Database Status] Checking database status');
  
  const results: DatabaseStatusResults = {
    database_connection: false,
    admins_table: false,
    super_admin_exists: false,
    database_error: null,
    admins_error: null,
    database_info: null,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    database_url: process.env.DATABASE_URL ? 
      (process.env.DATABASE_URL.substring(0, 15) + '...') : 
      'Not configured'
  };

  try {
    // Check basic database connection
    await sequelize.authenticate();
    results.database_connection = true;
    console.log('[Database Status] Database connection successful');
    
    // Get database information
    try {
      const dbInfo = await sequelize.query('SELECT version();', { plain: true, raw: true });
      results.database_info = dbInfo;
      console.log('[Database Status] Database version:', dbInfo);
    } catch (versionError) {
      console.error('[Database Status] Error getting database version:', versionError);
    }
    
    try {
      // Check if admins table exists by counting records
      const adminCount = await AdminModel.count();
      results.admins_table = true;
      console.log(`[Database Status] Admin table exists with ${adminCount} records`);
      
      // Check if any super admin exists
      const superAdminCount = await AdminModel.count({
        where: {
          role: 'super_admin',
          is_active: true
        }
      });
      
      results.super_admin_exists = superAdminCount > 0;
      console.log(`[Database Status] Super admin ${results.super_admin_exists ? 'exists' : 'does not exist'}`);
      
      if (superAdminCount > 0) {
        // Get superadmin info (excluding password)
        const superAdmin = await AdminModel.findOne({
          where: { role: 'super_admin', is_active: true },
          attributes: ['id', 'username', 'email', 'name', 'created_at', 'last_login']
        });
        
        if (superAdmin) {
          console.log(`[Database Status] Found super admin: ${superAdmin.username}`);
          results.super_admin_info = superAdmin.toJSON();
        }
      }
    } catch (error: any) {
      console.error('[Database Status] Error checking admin data:', error);
      results.admins_error = error.message;
    }
  } catch (error: any) {
    console.error('[Database Status] Database connection error:', error);
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
