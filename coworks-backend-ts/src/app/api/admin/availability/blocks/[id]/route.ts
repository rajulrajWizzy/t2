import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { isValidAdmin } from '@/utils/adminAuth';

// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

// Delete a maintenance block by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminId = await isValidAdmin(request);
    if (!adminId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401, headers: corsHeaders });
    }

    const blockId = params.id;
    
    // First, verify the block exists using Sequelize
    const maintenanceBlock = await models.MaintenanceBlock.findByPk(blockId);
    
    if (!maintenanceBlock) {
      return NextResponse.json({
        error: 'Maintenance block not found',
        details: `Maintenance block with ID ${blockId} does not exist`
      }, { status: 404, headers: corsHeaders });
    }
    
    // Delete the block using Sequelize model
    await maintenanceBlock.destroy();
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance block deleted successfully'
    }, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error deleting maintenance block:', error);
    return NextResponse.json({
      error: 'Failed to delete maintenance block',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500, headers: corsHeaders });
  }
} 