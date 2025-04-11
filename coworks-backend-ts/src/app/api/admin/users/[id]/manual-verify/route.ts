// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for manual verification');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Find the user using the Customer model
    const user = await models.Customer.findByPk(userId);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: `User with ID ${userId} not found`
      }, { status: 404, headers: corsHeaders });
    }
    
    // Update user verification status
    await user.update({
      is_identity_verified: true,
      is_address_verified: true,
      verification_status: 'VERIFIED',
      updated_at: new Date()
    });
    
    // Log the manual verification using AdminLog model if it exists
    try {
      // Check if AdminLog model exists
      if (models.AdminLog) {
        await models.AdminLog.create({
          admin_id: auth.id,
          action: 'MANUAL_VERIFICATION',
          target_type: 'USER',
          target_id: userId,
          details: JSON.stringify({
            user_id: userId,
            user_email: user.email,
            verification_status: 'VERIFIED'
          }),
          created_at: new Date()
        });
      } else {
        console.log('AdminLog model not found, skipping log creation');
      }
    } catch (err) {
      console.error('Error logging manual verification:', err);
      // Continue even if logging fails
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'User manually verified successfully'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error manually verifying user:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to manually verify user: ' + (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}
