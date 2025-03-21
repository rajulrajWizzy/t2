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
    console.log('[Admin Login] Processing login request');
    const body = await request.json();
    const { username, password } = body;
    console.log(`[Admin Login] Attempt for username: ${username}`);

    // Validate required fields
    if (!username || !password) {
      console.log('[Admin Login] Missing username or password');
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
      console.log(`[Admin Login] Admin not found for: ${username}`);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log(`[Admin Login] Admin found: ${admin.id}, role: ${admin.role}`);
    
    // Verify password using the model's validatePassword method
    const isPasswordValid = await admin.validatePassword(password);
    if (!isPasswordValid) {
      console.log(`[Admin Login] Invalid password for admin: ${admin.id}`);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log(`[Admin Login] Password valid for admin: ${admin.id}`);

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

    console.log(`[Admin Login] Login successful for admin: ${admin.id}`);

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