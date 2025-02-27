// app/api/branches/[id]/route.js
import { NextResponse } from 'next/server';
import Branch from '../../../../models/branch.js';
import Seat from '../../../../models/seat.js';

// GET a single branch by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Find the branch with its seats
    const branch = await Branch.findByPk(id, {
      include: [
        { model: Seat }
      ]
    });
    
    if (!branch) {
      return NextResponse.json(
        { message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { message: 'Failed to fetch branch', error: error.message },
      { status: 500 }
    );
  }
}

// PUT update a branch
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, location } = body;
    
    // Find the branch
    const branch = await Branch.findByPk(id);
    
    if (!branch) {
      return NextResponse.json(
        { message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // Update branch details
    await branch.update({
      name: name || branch.name,
      location: location || branch.location
    });
    
    return NextResponse.json({
      message: 'Branch updated successfully',
      branch
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { message: 'Failed to update branch', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE a branch
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Find the branch
    const branch = await Branch.findByPk(id);
    
    if (!branch) {
      return NextResponse.json(
        { message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // Check if branch has seats
    const seatCount = await Seat.count({ where: { branch_id: id } });
    
    if (seatCount > 0) {
      return NextResponse.json(
        { message: 'Cannot delete branch with active seats' },
        { status: 400 }
      );
    }
    
    // Delete the branch
    await branch.destroy();
    
    return NextResponse.json({
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { message: 'Failed to delete branch', error: error.message },
      { status: 500 }
    );
  }
}
