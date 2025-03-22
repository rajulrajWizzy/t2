// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';

// POST create multiple branches at once
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    if (!Array.isArray(body.branches) || body.branches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Request must include an array of branches'
      }, { status: 400 });
    }

    // Validate and prepare branches for creation
    const branchesToCreate = [];
    const errors = [];

    for (let i = 0; i < body.branches.length; i++) {
      const branch = body.branches[i];
      const { 
        name, 
        address, 
        location, 
        latitude, 
        longitude, 
        cost_multiplier, 
        opening_time, 
        closing_time,
        images,
        amenities
      } = branch;
      
      // Validate required fields
      if (!name || !address || !location) {
        errors.push({
          index: i,
          message: 'Name, address, and location are required'
        });
        continue;
      }
      
      // Name validation
      if (!validation.isValidName(name)) {
        errors.push({
          index: i,
          message: 'Name cannot be empty or contain only whitespace'
        });
        continue;
      }
      
      // Generate a unique short code from the branch name
      // Format: First 3 letters of name + 3 random chars
      const namePrefix = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase();
      
      const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
      const shortCode = `${namePrefix}${randomChars}`;
      
      // Add to list of branches to create
      branchesToCreate.push({
        name,
        address,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        cost_multiplier: cost_multiplier || 1.00,
        opening_time: opening_time || '08:00:00',
        closing_time: closing_time || '22:00:00',
        images: images || undefined,
        amenities: amenities || null,
        short_code: shortCode
      });
    }
    
    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Validation errors in branch data',
        errors
      }, { status: 400 });
    }
    
    // Create branches in bulk
    const createdBranches = await models.Branch.bulkCreate(branchesToCreate);
    
    const response: ApiResponse = {
      success: true,
      message: `Successfully created ${createdBranches.length} branches`,
      data: createdBranches
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating branches in bulk:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create branches',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
