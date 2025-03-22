import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@/types/common';
import models from '@/models';

// Interface for token payload
export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  [key: string]: any;
}

// Set a secret key for JWT - in production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // 1 day by default

// Secret key for JWT
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT Secret key is not set in environment variables');
  }
  return new TextEncoder().encode(secret);
};

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

/**
 * Sign a new JWT token
 * @param payload Data to include in the token
 * @returns Signed JWT token
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @returns Object with validity status and decoded payload
 */
export async function verifyToken(token: string): Promise<VerificationResult> {
  try {
    // Check if token is blacklisted
    const blacklistedToken = await models.BlacklistedToken.findOne({
      where: { token }
    });
    
    if (blacklistedToken) {
      return { valid: false, decoded: null };
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { valid: true, decoded };
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

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for an admin user
 */
export function generateJWT(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

/**
 * Verify a JWT token and return the decoded payload
 */
export async function verifyJWT(token: string): Promise<DecodedToken | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Blacklist a token for immediate invalidation
 * @param token Token to blacklist
 * @param userId ID of the user who owned the token
 */
export async function blacklistToken(token: string, userId: number): Promise<void> {
  try {
    // Calculate token expiry time from decoded payload
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date();
    
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