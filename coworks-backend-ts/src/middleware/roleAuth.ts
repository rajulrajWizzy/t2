import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import { UserRole } from '@/types/auth';

// Helper function to verify token and get user info
async function verifyAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const verificationResult = await verifyToken(token);
  if (!verificationResult?.decoded) {
    return new NextResponse(JSON.stringify({ message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}

// Middleware to require super admin role
export async function requireSuperAdmin(req: NextRequest): Promise<NextResponse> {
  const authError = await verifyAuth(req);
  if (authError) return authError;

  const verificationResult = await verifyToken(req.headers.get('authorization')?.split(' ')[1] || '');
  if (!verificationResult?.decoded || verificationResult.decoded.role !== UserRole.SUPER_ADMIN) {
    return new NextResponse(JSON.stringify({ message: 'Forbidden: Super Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextResponse(JSON.stringify({ message: 'Authorized' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Middleware to require branch admin role
export async function requireBranchAdmin(req: NextRequest, branchId?: number): Promise<NextResponse> {
  const authError = await verifyAuth(req);
  if (authError) return authError;

  const verificationResult = await verifyToken(req.headers.get('authorization')?.split(' ')[1] || '');
  if (!verificationResult?.decoded) {
    return new NextResponse(JSON.stringify({ message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const decoded = verificationResult.decoded;
  if (decoded.role !== UserRole.BRANCH_ADMIN && decoded.role !== UserRole.SUPER_ADMIN) {
    return new NextResponse(JSON.stringify({ message: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If branch ID is provided, check if user can manage this branch
  if (branchId !== undefined) {
    if (decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id !== branchId) {
      return new NextResponse(JSON.stringify({ message: 'Forbidden: Cannot manage this branch' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new NextResponse(JSON.stringify({ message: 'Authorized' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
