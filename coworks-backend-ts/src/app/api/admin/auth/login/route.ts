import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/utils/jwt';
import AdminModel, { AdminRole } from '@/models/admin';
import { comparePasswords } from '@/utils/password';

/**
 * Admin login endpoint
 * @param req Request object
 * @returns Response with JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin by username or email
    const admin = await AdminModel.findOne({
      where: {
        [username.includes('@') ? 'email' : 'username']: username,
        is_active: true
      }
    });

    // Check if admin exists
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password using the model's validatePassword method
    const isPasswordValid = await admin.validatePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await admin.update({ last_login: new Date() });

    // Generate JWT token with admin data and is_admin flag
    const token = await signToken({
      id: admin.id,
      email: admin.email,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      branch_id: admin.branch_id,
      is_admin: true
    });

    // Return token and admin data (excluding password)
    const adminData = admin.toJSON();
    delete adminData.password;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminData,
        token
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong, please try again later' },
      { status: 500 }
    );
  }
} 