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
    
    // Parse request body
    const data = await request.json();
    const { reason } = data;
    
    if (!reason) {
      return NextResponse.json({
        success: false,
        message: 'Resubmission reason is required'
      }, { status: 400, headers: corsHeaders });
    }
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for resubmission request');
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
      verification_status: 'RESUBMIT',
      updated_at: new Date()
    });
    
    // Create a notification for the user if Notification model exists
    try {
      // Check if we have a Notification model
      if (models.Notification) {
        await models.Notification.create({
          user_id: userId,
          title: 'Document Resubmission Required',
          message: `Please resubmit your verification documents. Reason: ${reason}`,
          type: 'VERIFICATION',
          is_read: false,
          created_at: new Date()
        });
      } else {
        console.log('Notification model not found, skipping notification creation');
      }
    } catch (err) {
      console.error('Error creating notification:', err);
      // Continue even if notification creation fails
    }
    
    // Log the resubmission request if AdminLog model exists
    try {
      // Check if we have an AdminLog model
      if (models.AdminLog) {
        await models.AdminLog.create({
          admin_id: auth.id,
          action: 'REQUEST_RESUBMISSION',
          target_type: 'USER',
          target_id: userId,
          details: JSON.stringify({
            user_id: userId,
            user_email: user.email,
            reason: reason
          }),
          created_at: new Date()
        });
      } else {
        console.log('AdminLog model not found, skipping log creation');
      }
    } catch (err) {
      console.error('Error logging resubmission request:', err);
      // Continue even if logging fails
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Resubmission request sent successfully'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error requesting document resubmission:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to request document resubmission: ' + (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}
