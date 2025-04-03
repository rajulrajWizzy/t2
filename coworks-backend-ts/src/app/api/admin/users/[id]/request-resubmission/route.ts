// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { QueryTypes } from 'sequelize';

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
      }, { status: 400 });
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
    
    // Find the user
    const user = await models.sequelize.query(
      `SELECT * FROM excel_coworks_schema.users WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    
    if (!user || user.length === 0) {
      return NextResponse.json({
        success: false,
        message: `User with ID ${userId} not found`
      }, { status: 404 });
    }
    
    // Update user verification status
    await models.sequelize.query(
      `UPDATE excel_coworks_schema.users 
       SET verification_status = 'RESUBMIT', updated_at = NOW() 
       WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.UPDATE
      }
    );
    
    // Create a notification for the user
    try {
      await models.sequelize.query(
        `INSERT INTO excel_coworks_schema.notifications
         (user_id, title, message, type, is_read, created_at)
         VALUES (:userId, 'Document Resubmission Required', :message, 'VERIFICATION', false, NOW())`,
        {
          replacements: { 
            userId,
            message: `Please resubmit your verification documents. Reason: ${reason}`
          },
          type: QueryTypes.INSERT
        }
      );
    } catch (err) {
      console.error('Error creating notification:', err);
      // Continue even if notification creation fails
    }
    
    // Log the resubmission request
    try {
      await models.sequelize.query(
        `INSERT INTO excel_coworks_schema.admin_logs
         (admin_id, action, target_type, target_id, details, created_at)
         VALUES (:adminId, 'REQUEST_RESUBMISSION', 'USER', :userId, :details, NOW())`,
        {
          replacements: { 
            adminId: auth.id,
            userId,
            details: JSON.stringify({
              user_id: userId,
              user_email: user[0]?.email,
              reason: reason
            })
          },
          type: QueryTypes.INSERT
        }
      );
    } catch (err) {
      console.error('Error logging resubmission request:', err);
      // Continue even if logging fails
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Resubmission request sent successfully'
    });
  } catch (error) {
    console.error('Error requesting document resubmission:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to request document resubmission: ' + (error as Error).message
    }, { status: 500 });
  }
}
