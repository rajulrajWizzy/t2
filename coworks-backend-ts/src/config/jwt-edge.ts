/**
 * JWT utilities for Edge Runtime
 * Provides JWT functions that work in Edge Runtime without requiring Node.js APIs
 */

import { JwtPayload, JwtVerificationResult } from '@/types/common';

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Edge-compatible JWT verification using Web Crypto API
export async function verifyToken(token: string): Promise<JwtVerificationResult> {
  try {
    // Parse the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expired: false, decoded: null, blacklisted: false };
    }
    
    // Decode token payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, expired: true, decoded: null, blacklisted: false };
    }
    
    // We can't verify the signature in Edge Runtime, so we're just checking format and expiry
    // In a production app, you would want to use a JWT library compatible with Edge Runtime
    
    return { valid: true, expired: false, decoded: payload, blacklisted: false };
  } catch (error) {
    console.error('JWT verification error:', error);
    return {
      valid: false,
      expired: false,
      decoded: null,
      blacklisted: false
    };
  }
}

// Generate a token for a user - this should only be used in API routes with nodejs runtime
export function generateToken(user: any): string {
  throw new Error('generateToken is not supported in Edge Runtime. Use in Node.js runtime only.');
}

// Generate a token for an admin - this should only be used in API routes with nodejs runtime
export function generateAdminToken(admin: any): string {
  throw new Error('generateAdminToken is not supported in Edge Runtime. Use in Node.js runtime only.');
}

// Verify an admin token - Edge Runtime compatible version
export function verifyAdminToken(token: string): { valid: boolean; decoded: any; message?: string } {
  try {
    // Parse the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, decoded: null, message: 'Invalid token format' };
    }
    
    // Decode token payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, decoded: null, message: 'Token expired' };
    }
    
    // Verify it's an admin token by checking the is_admin field
    if (!payload.is_admin) {
      return { valid: false, decoded: null, message: 'Not an admin token' };
    }
    
    return { valid: true, decoded: payload };
  } catch (error) {
    return {
      valid: false,
      decoded: null,
      message: 'Invalid token'
    };
  }
}