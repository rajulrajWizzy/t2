// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

import * as jwt from 'jsonwebtoken';
import { Customer } from '@/types/auth';
import { JwtPayload, JwtVerificationResult } from '@/types/common';
import models from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '1d'; // 1 day by default

// Generate a token for a user
export function generateToken(user: Customer): string {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

// Generate a token for an admin user with proper admin fields
export function generateAdminToken(admin: any): string {
  return jwt.sign(
    { 
      id: admin.id,
      email: admin.email,
      name: admin.name,
      username: admin.username,
      role: admin.role,
      branch_id: admin.branch_id,
      is_admin: true,
      permissions: admin.permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

// Verify a token
export async function verifyToken(token: string): Promise<JwtVerificationResult> {
  try {
    // First check if token is blacklisted - with proper error handling
    try {
      // Use a more robust query that's less likely to fail
      const blacklistedToken = await models.BlacklistedToken.findOne({
        where: { token },
        attributes: ['id'], // Only fetch the ID to minimize data transfer
        raw: true // Return plain objects instead of Sequelize instances
      });

      if (blacklistedToken) {
        console.log('[verifyToken] Token is blacklisted');
        return { valid: false, expired: false, decoded: null, blacklisted: true };
      }
    } catch (blacklistError) {
      // Log the error but don't fail the verification - this is a non-critical check
      console.warn('[verifyToken] Error checking blacklisted token (continuing):', blacklistError);
      // Continue with token verification even if blacklist check fails
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { valid: true, expired: false, decoded, blacklisted: false };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      expired: err.message === 'jwt expired',
      decoded: null,
      blacklisted: false
    };
  }
}

// Verify an admin token specifically (includes admin fields check)
export function verifyAdminToken(token: string): { valid: boolean; decoded: any; message?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify it's an admin token by checking the is_admin field
    if (!decoded.is_admin) {
      return { valid: false, decoded: null, message: 'Not an admin token' };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      decoded: null,
      message: err.message === 'jwt expired' ? 'Token expired' : 'Invalid token'
    };
  }
}