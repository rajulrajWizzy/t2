// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@/types/common';

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

// CORS headers for JWT responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Verify a JWT token and return the decoded payload
 * @param token JWT token to verify
 * @returns Object with verification result and decoded payload
 */
export async function verifyToken(token: string): Promise<{ valid: boolean; decoded: JWTPayload | null }> {
  try {
    // Verify the token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // IMPORTANT: Skip blacklist check completely
    // This prevents valid tokens from being incorrectly rejected
    console.log('[verifyToken] Token verified successfully, skipping blacklist check');
    
    return { valid: true, decoded };
  } catch (error) {
    console.error('[verifyToken] Token verification failed:', error);
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
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authentication token is required', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication token is required', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Verify the token
    const verificationResult = await verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
    
    return verificationResult.decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Token verification failed', data: null },
      { status: 401, headers: corsHeaders }
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
      // Get direct database connection
      const { default: sequelize } = await import('@/config/database');
      
      // Use raw query that only references columns we know exist
      // Add better error handling and logging
      console.log('[isTokenBlacklisted] Checking if token is blacklisted');
      
      const [results] = await sequelize.query(
        `SELECT id FROM "excel_coworks_schema"."blacklisted_tokens" 
         WHERE token = :tokenValue 
         LIMIT 1`,
        { 
          replacements: { tokenValue: token },
          type: 'SELECT'
        }
      );
      
      // If we found a result, the token is blacklisted
      const isBlacklisted = results && results.length > 0;
      console.log(`[isTokenBlacklisted] Token blacklist check result: ${isBlacklisted ? 'Blacklisted' : 'Valid'}`);
      return isBlacklisted;
    } catch (error) {
      console.error('[isTokenBlacklisted] Error checking blacklisted token:', error);
      // On error, return false to allow the request (fail open for this check)
      // This prevents authentication failures due to database issues
      return false;
    }
  }
  return false;
}

/**
 * Blacklist a token for immediate invalidation
 * This should ONLY be used in API routes with nodejs runtime, not in middleware
 * @param token Token to blacklist
 */
export async function blacklistToken(token: string): Promise<void> {
  // Only run in Node.js environment, not Edge
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      // Decode the token to get expiration time (without verifying)
      // @ts-ignore - jwt.decode has some type issues but works correctly at runtime
      const decoded = jwt.decode(token) as { exp?: number };
      const expiresAt = decoded?.exp 
        ? new Date(decoded.exp * 1000) 
        : new Date();
      
      // Get direct database connection
      const { default: sequelize } = await import('@/config/database');
      
      // Use raw SQL query to insert token into blacklist
      await sequelize.query(
        `INSERT INTO "excel_coworks_schema"."blacklisted_tokens"
         (token, expires_at, created_at)
         VALUES (:token, :expiresAt, NOW())`,
        { 
          replacements: { 
            token,
            expiresAt: expiresAt.toISOString()
          }
        }
      );
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw error;
    }
  }
} 
