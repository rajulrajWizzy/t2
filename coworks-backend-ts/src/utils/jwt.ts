// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

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

// Set a secret key for JWT - in production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // 1 day by default

// Get secret key for JWT
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || JWT_SECRET;
  return new TextEncoder().encode(secret);
};

/**
 * Sign a new JWT token
 * @param payload Data to include in the token
 * @returns Signed JWT token
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  try {
    const secretKey = getJwtSecretKey();
    
    // Parse expiration time - convert days or hours to seconds
    let expiresInSeconds = 86400; // Default 1 day
    
    if (typeof JWT_EXPIRES_IN === 'string') {
      if (JWT_EXPIRES_IN.endsWith('d')) {
        const days = parseInt(JWT_EXPIRES_IN.slice(0, -1));
        expiresInSeconds = days * 24 * 60 * 60;
      } else if (JWT_EXPIRES_IN.endsWith('h')) {
        const hours = parseInt(JWT_EXPIRES_IN.slice(0, -1));
        expiresInSeconds = hours * 60 * 60;
      } else if (JWT_EXPIRES_IN.endsWith('m')) {
        const minutes = parseInt(JWT_EXPIRES_IN.slice(0, -1));
        expiresInSeconds = minutes * 60;
      } else if (JWT_EXPIRES_IN.endsWith('s')) {
        expiresInSeconds = parseInt(JWT_EXPIRES_IN.slice(0, -1));
      }
    }
    
    const token = await new SignJWT({...payload})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
      .sign(secretKey);
    
    return token;
  } catch (error) {
    console.error('Error signing token:', error);
    throw error;
  }
}

/**
 * Verify and decode a JWT token without checking blacklist
 * @param token JWT token to verify
 * @returns Object with validity status and decoded payload
 */
export async function verifyToken(token: string): Promise<VerificationResult> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return { valid: true, decoded: payload as unknown as JWTPayload };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, decoded: null };
  }
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
      { success: false, message: 'Authentication error' },
      { status: 401 }
    );
  }
}

/**
 * Generate a JWT token for an admin user
 */
export async function generateJWT(payload: { id: string; email: string; role: string }): Promise<string> {
  return signToken(payload as unknown as JWTPayload);
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
 * Alias for verifyToken - fixes import errors in routes
 * @param token JWT token to verify
 * @returns Object with validity status and decoded payload
 */
export async function verifyJWT(token: string): Promise<VerificationResult> {
  return verifyToken(token);
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
      const secretKey = getJwtSecretKey();
      // Verify token to get expiry
      const { payload } = await jwtVerify(token, secretKey);
      const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date();
      
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

// Handle Edge Runtime safely
export const verifyJWT = verifyToken;
export const verifyAuth = verifySession;
