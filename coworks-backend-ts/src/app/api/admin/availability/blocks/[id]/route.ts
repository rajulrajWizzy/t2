import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';

// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        error: 'Missing parameter',
        details: 'Block ID is required'
      }, { status: 400 });
    }
    
    // Check if the block exists
    const checkQuery = `
      SELECT id 
      FROM excel_coworks_schema.maintenance_blocks 
      WHERE id = '${id}'
    `;
    
    const [checkResult] = await models.sequelize.query(checkQuery);
    if (!checkResult || checkResult.length === 0) {
      return NextResponse.json({
        error: 'Block not found',
        details: `Maintenance block with ID ${id} does not exist`
      }, { status: 404 });
    }
    
    // Delete the block
    const deleteQuery = `
      DELETE FROM excel_coworks_schema.maintenance_blocks 
      WHERE id = '${id}'
      RETURNING id
    `;
    
    const [deleteResult] = await models.sequelize.query(deleteQuery);
    
    return NextResponse.json({
      message: 'Maintenance block deleted successfully',
      block_id: id
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error deleting maintenance block:', error);
    return NextResponse.json({
      error: 'Failed to delete maintenance block',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
} 