// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types/jwt';

// Interface for token payload
export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  [key: string]: any;
}

// Admin JWT Payload type
export interface AdminJWTPayload extends JWTPayload {
  id: number;
  email: string;
  username: string;
  name: string;
  role: string;
  branch_id?: number;
  permissions?: Record<string, string[]>;
  is_admin: boolean;
}

// Result of token verification
export interface VerificationResult {
  valid: boolean;
  decoded: JWTPayload | null;
}

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generate a JWT token for the given user
 * @param payload User data to include in the token
 * @returns JWT token
 */
export function generateToken(payload: any): string {
  return jwt.sign(
    { 
      id: payload.id,
      email: payload.email,
      name: payload.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token and return the decoded payload
 * @param token JWT token to verify
 * @returns Object with verification result and decoded payload
 */
export async function verifyToken(token: string): Promise<{ valid: boolean; decoded: JWTPayload | null }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, decoded: null };
  }
}

/**
 * Alias for verifyToken - fixes import errors in routes
 * @param token JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  const result = await verifyToken(token);
  return result.valid ? result.decoded : null;
}

/**
 * Verify a token and return the decoded payload or an error response
 * @param request Request object with Authorization header
 * @returns Decoded token payload or error response
 */
export async function verifyTokenFromRequest(request: Request): Promise<JWTPayload | NextResponse> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    // Verify the token
    const verificationResult = await verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return verificationResult.decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Token verification failed' },
      { status: 401 }
    );
  }
}

/**
 * Alias for verifyTokenFromRequest - fixes import errors in routes
 * @param request Request object with Authorization header
 * @returns Decoded token payload or error response
 */
export async function verifyAuth(request: Request): Promise<JWTPayload | NextResponse> {
  return verifyTokenFromRequest(request);
}

/**
 * For server-side only: Check if a token is blacklisted
 * Note: This must only be used in API routes with nodejs runtime, not in middleware/Edge
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  // This function should only be called from API routes, not middleware
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      // Dynamically import models only when needed
      const { default: models } = await import('@/models');
      const blacklistedToken = await models.BlacklistedToken.findOne({
        where: { token }
      });
      return !!blacklistedToken;
    } catch (error) {
      console.error('Error checking blacklisted token:', error);
    }
  }
  return false;
}

/**
 * Blacklist a token for immediate invalidation
 * This should ONLY be used in API routes with nodejs runtime, not in middleware
 * @param token Token to blacklist
 * @param userId ID of the user who owned the token
 */
export async function blacklistToken(token: string, userId: number): Promise<void> {
  // Only run in Node.js environment, not Edge
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      const secretKey = process.env.JWT_SECRET || JWT_SECRET;
      // Verify token to get expiry
      const decoded = jwt.decode(token);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date();
      
      // Dynamically import models
      const { default: models } = await import('@/models');
      
      await models.BlacklistedToken.create({
        token,
        user_id: userId,
        expires_at: expiresAt,
        blacklisted_at: new Date()
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw error;
    }
  }
} 
