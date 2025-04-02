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
       SET is_identity_verified = true, 
           is_address_verified = true, 
           verification_status = 'VERIFIED', 
           updated_at = NOW() 
       WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.UPDATE
      }
    );
    
    // Log the manual verification
    try {
      await models.sequelize.query(
        `INSERT INTO excel_coworks_schema.admin_logs
         (admin_id, action, target_type, target_id, details, created_at)
         VALUES (:adminId, 'MANUAL_VERIFICATION', 'USER', :userId, :details, NOW())`,
        {
          replacements: { 
            adminId: auth.id,
            userId,
            details: JSON.stringify({
              user_id: userId,
              user_email: user[0]?.email,
              verification_status: 'VERIFIED'
            })
          },
          type: QueryTypes.INSERT
        }
      );
    } catch (err) {
      console.error('Error logging manual verification:', err);
      // Continue even if logging fails
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'User manually verified successfully'
    });
  } catch (error) {
    console.error('Error manually verifying user:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to manually verify user: ' + (error as Error).message
    }, { status: 500 });
  }
}
