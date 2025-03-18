// src/config/jwt-edge.ts
import * as jose from 'jose';
import { Customer, UserRole } from '@/types/auth';
import { JwtPayload, JwtVerificationResult } from '@/types/common';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

const alg = 'HS256';

// Generate a token for a user
export async function generateToken(user: Customer): Promise<string> {
  const jwt = await new jose.SignJWT({ 
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || UserRole.CUSTOMER,
    managed_branch_id: user.managed_branch_id
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '1d')
    .sign(secret);
  
  return jwt;
}

// Verify a token
export async function verifyToken(token: string): Promise<JwtVerificationResult> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    
    // Create a proper JwtPayload object from the jose payload
    const jwtPayload: JwtPayload = {
      id: payload.id as number,
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as UserRole) || UserRole.CUSTOMER,
      managed_branch_id: payload.managed_branch_id as number | null,
      // Optional properties that might be present in the token
      iat: payload.iat,
      exp: payload.exp
    };
    
    return { 
      valid: true, 
      expired: false, 
      decoded: jwtPayload,
      blacklisted: false
    };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      expired: err.message.includes('expired'),
      decoded: null,
      blacklisted: false
    };
  }
}