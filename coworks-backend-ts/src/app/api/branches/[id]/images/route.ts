import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';

/**
 * Update branch images
 * PATCH /api/branches/:id/images
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const branchId = parseInt(params.id);
    
    if (isNaN(branchId)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid branch ID'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Get the branch
    const branch = await models.Branch.findByPk(branchId);
    
    if (!branch) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Get the request body
    const body = await request.json();
    const { images } = body;
    
    if (!images || typeof images !== 'object') {
      const response: ApiResponse = {
        success: false,
        message: 'Images must be provided as an object'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Update the branch images
    await branch.update({ images });
    
    const response: ApiResponse = {
      success: true,
      message: 'Branch images updated successfully',
      data: { images }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating branch images:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to update branch images',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 