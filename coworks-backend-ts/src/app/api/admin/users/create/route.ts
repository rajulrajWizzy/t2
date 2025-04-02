// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/utils/adminAuth';

// Mock function to create a new admin user
// In a real application, this would connect to your database
async function createAdminUser(userData: any) {
  // Simulate database insertion and return a new user object
  const newUser = {
    id: Math.random().toString(36).substring(2, 10), // Generate a random ID
    name: userData.name,
    email: userData.email,
    role: userData.role,
    branchId: userData.branchId || null,
    branchName: userData.branchId ? 'Branch Name' : null, // In a real app, you'd fetch this
    createdAt: new Date().toISOString(),
  };
  
  return newUser;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperAdmin(request);
    if ('status' in auth) {
      return auth as NextResponse;
    }
    
    // Parse request body
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return NextResponse.json(
        { message: 'Bad request: Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return NextResponse.json(
        { message: 'Bad request: Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (!['super_admin', 'branch_admin'].includes(userData.role)) {
      return NextResponse.json(
        { message: 'Bad request: Invalid role' },
        { status: 400 }
      );
    }
    
    // For branch admin, validate branch ID
    if (userData.role === 'branch_admin' && userData.branchId === '') {
      return NextResponse.json(
        { message: 'Branch admin must be assigned to a branch' },
        { status: 400 }
      );
    }
    
    // In a real app, you would:
    // 1. Check if email already exists
    // 2. Hash the password
    // 3. Save the user to database
    // 4. Remove password from the response
    
    // Create the user (mock function)
    const newUser = await createAdminUser(userData);
    
    return NextResponse.json({
      message: 'Admin user created successfully',
      user: newUser
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 
