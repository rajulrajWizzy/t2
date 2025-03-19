import * as jwt from 'jsonwebtoken';
import { Customer } from '@/types/auth';
import { JwtPayload, JwtVerificationResult } from '@/types/common';
import models from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // 1 day by default

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

// Verify a token
export async function verifyToken(token: string): Promise<JwtVerificationResult> {
  try {
    // First check if token is blacklisted
    const blacklistedToken = await models.BlacklistedToken.findOne({
      where: { token }
    });

    if (blacklistedToken) {
      return { valid: false, expired: false, decoded: null, blacklisted: true };
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