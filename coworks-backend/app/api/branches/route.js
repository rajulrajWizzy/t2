// app/api/branches/route.js
import { NextResponse } from 'next/server';
import Branch from '../../../models/branch.js';
import { verifyToken } from '../../../config/jwt.js';

// GET all branches
export async function GET() {
  try {
    const branches = await Branch.findAll({
      where: { is_active: true },
      attributes: [
        'id', 'name', 'address', 'location', 'latitude', 'longitude', 
        'cost_multiplier', 'opening_time', 'closing_time'
      ]
    });
    return NextResponse.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch branches', error: error.message },
      { status: 500 }
    );
  }
}

// POST create a new branch
export async function POST(request) {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { 
      name, address, location, latitude, longitude,
      cost_multiplier, opening_time, closing_time 
    } = body;
    
    // Validate input
    if (!name || !address || !location) {
      return NextResponse.json(
        { success: false, message: 'Name, address, and location are required' },
        { status: 400 }
      );
    }
    
    // Create a new branch
    const branch = await Branch.create({
      name,
      address,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      cost_multiplier: cost_multiplier || 1.00,
      opening_time: opening_time || '08:00:00',
      closing_time: closing_time || '22:00:00',
      is_active: true
    });
    
    return NextResponse.json(
      { success: true, message: 'Branch created successfully', data: branch },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create branch', error: error.message },
      { status: 500 }
    );
  }
}