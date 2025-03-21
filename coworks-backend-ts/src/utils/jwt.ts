import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Interface for token payload
export interface JWTPayload {
  id: number;
  email: string;
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
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify a request's Authorization token
 * @param request Next.js request object
 * @returns Decoded token payload or error response
 */
export async function verifyAuth(request: Request): Promise<JWTPayload | NextResponse> {
  // Extract token from Authorization header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
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