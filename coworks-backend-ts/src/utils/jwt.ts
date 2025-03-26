<<<<<<< Updated upstream
import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
=======
// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { randomBytes } from 'crypto';
import { UserRole } from '@/types/auth';
>>>>>>> Stashed changes

// Interface for token payload
export interface JWTPayload {
  id: number;
  email: string;
<<<<<<< Updated upstream
  role?: string;
  name?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

// Set a secret key for JWT - in production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Secret key for JWT
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT Secret key is not set in environment variables');
  }
  return new TextEncoder().encode(secret);
};

/**
 * Sign a new JWT token
 * @param payload Data to include in the token
 * @param expiresIn Expiration time in seconds
 * @returns Signed JWT token string
 */
export async function signToken(payload: JWTPayload, expiresIn = '24h'): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(getJwtSecretKey());
    
    return token;
  } catch (error) {
    throw new Error(`Error signing token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @returns Decoded token payload
=======
  role: UserRole | string;
  [key: string]: any;
}

// Interface for admin JWT payload
export interface AdminJWTPayload extends JWTPayload {
  username: string;
  is_admin: boolean;
  branch_id?: number;
  permissions?: Record<string, string[]>;
}

// Interface for token verification result
export interface VerificationResult {
  valid: boolean;
  decoded: JWTPayload | null;
  role?: string;
}

// Set a secret key for JWT - in production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days by default

// Helper function to get the JWT secret key as a Uint8Array
function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

// Generate a unique token ID to prevent token reuse
function generateTokenId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Generate a JWT token for a user
 * @param user User data to include in token
 * @returns JWT token
 */
export async function generateToken(user: any): Promise<string> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role || UserRole.USER
  };
  
  const secretKey = getJwtSecretKey();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

/**
 * Generate a JWT token specifically for an admin
 * @param admin Admin data to include in token
 * @returns JWT token
 */
export async function generateAdminToken(admin: any): Promise<string> {
  const payload: AdminJWTPayload = {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    is_admin: true,
    branch_id: admin.branch_id,
    permissions: admin.permissions
  };
  
  const secretKey = getJwtSecretKey();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

/**
 * Sign a new JWT token with arbitrary payload
 * @param payload Data to include in token
 * @returns Signed JWT token
 */
export async function signToken(payload: any): Promise<string> {
  const secretKey = getJwtSecretKey();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Object with valid status, decoded payload, and role
>>>>>>> Stashed changes
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
<<<<<<< Updated upstream
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : String(error)}`);
=======
    const secretKey = getJwtSecretKey();
    const { payload } = await jose.jwtVerify(token, secretKey);
    const decodedPayload = payload as unknown as JWTPayload;
    
    return { 
      valid: true, 
      decoded: decodedPayload, 
      role: decodedPayload.role?.toString() || undefined 
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false, decoded: null };
>>>>>>> Stashed changes
  }
}

/**
<<<<<<< Updated upstream
 * Verify a request's Authorization token
 * @param request Next.js request object
 * @returns Decoded token payload or error response
 */
export async function verifyAuth(request: Request): Promise<JWTPayload | NextResponse> {
  // Extract token from Authorization header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
=======
 * Generate a refresh token
 * @param user User data to include in token
 * @returns Refresh token
 */
export async function generateRefreshToken(user: any): Promise<string> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role || UserRole.USER,
    tokenType: 'refresh',
    tokenId: generateTokenId()
  };
  
  const secretKey = getJwtSecretKey();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(secretKey);
}

/**
 * Verify a refresh token
 * @param token Refresh token to verify
 * @returns User ID if token is valid, null otherwise
 */
export async function verifyRefreshToken(token: string): Promise<number | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jose.jwtVerify(token, secretKey);
    return (payload as any).id;
  } catch (error) {
    return null;
  }
}

/**
 * Verify a token and return the decoded payload or an error response
 * @param request Request object with Authorization header
 * @returns Decoded token payload or error response
 */
export async function verifyTokenFromRequest(request: Request): Promise<JWTPayload | NextResponse> {
  try {
    // Extract token from Authorization header securely
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    
    // Check if header exists and has correct format (case insensitive)
    if (!authHeader || 
       (!authHeader.toLowerCase().startsWith('bearer ') && 
        !authHeader.toLowerCase().startsWith('bearer:'))) {
      return NextResponse.json(
        { success: false, message: 'Invalid authorization header format' },
        { status: 401 }
      );
    }
    
    // Standardize the format regardless of how it was provided
    const token = authHeader.replace(/^bearer:?\s*/i, '').trim();
    
    // Ensure token is not empty
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication token is missing' },
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
>>>>>>> Stashed changes
    return NextResponse.json(
      { success: false, message: 'Authorization token is required' },
      { status: 401 }
    );
  }
  
  try {
    // Verify the token
    const decoded = await verifyToken(token);
    
    // Validate required fields
    if (!decoded.id || !decoded.email) {
      return NextResponse.json(
        { success: false, message: 'Invalid token format' },
        { status: 401 }
      );
    }
    
    return decoded;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
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
 * Verify if a user has the required role
 * @param token The JWT token
 * @param requiredRoles Array of allowed roles
 * @returns Boolean indicating if the user has the required role
 */
export async function verifyUserRole(token: string, requiredRoles: string[]): Promise<boolean> {
  const { valid, decoded } = await verifyToken(token);
  
  if (!valid || !decoded) {
    return false;
  }
  
  return requiredRoles.includes(decoded.role);
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
<<<<<<< Updated upstream
export async function verifyJWT(token: string): Promise<DecodedToken | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
} 
=======
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
 * Check if token is blacklisted
 * @param token JWT token
 * @returns Boolean indicating if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const { decoded } = await verifyToken(token);
    if (!decoded || !decoded.tokenId) return false;
    
    // TODO: Implement database check for blacklisted tokenId
    return false;
  } catch (error) {
    console.error('Error checking blacklisted token:', error);
    return false;
  }
}

/**
 * Blacklist a token
 * @param token JWT token to blacklist
 * @param userId User ID associated with the token
 */
export async function blacklistToken(token: string, userId: number): Promise<void> {
  try {
    const { decoded } = await verifyToken(token);
    if (!decoded || !decoded.tokenId) return;
    
    // TODO: Implement database storage for blacklisted tokenId
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
}
>>>>>>> Stashed changes
