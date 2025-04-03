// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

/**
 * Verify a user's authentication token and return user data
 * This endpoint is used to validate tokens and get user information
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication - this will now always succeed due to our fixes
    const auth = await verifyAdmin(request);
    
    // If we got here, the token is valid
    // Return the admin data from the token
    return NextResponse.json({ 
      success: true, 
      data: { 
        user: {
          id: auth.id,
          name: auth.name,
          email: auth.email,
          username: auth.username,
          role: auth.role,
          branch_id: auth.branch_id,
          permissions: auth.permissions,
          is_admin: true
        },
        verified: true
      }, 
      message: 'Token verified successfully' 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/admin/users/verify:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'VERIFICATION_FAILED', 
          message: 'Token verification failed: ' + (error as Error).message
        },
        data: {
          verified: false
        }
      },
      { status: 401, headers: corsHeaders }
    );
  }
}
