import jwt from 'jsonwebtoken';
import { Customer, UserRole } from '@/types/auth';
import { JwtPayload, JwtVerificationResult } from '@/types/common';
import models from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Generate a token for a user
export const generateToken = (user: Customer): string => {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    managed_branch_id: user.managed_branch_id
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify a token
export const verifyToken = async (token: string): Promise<JwtVerificationResult | null> => {
  try {
    // First check if token is blacklisted
    const blacklistedToken = await models.BlacklistedToken.findOne({
      where: { token }
    });

    if (blacklistedToken) {
      return { valid: false, expired: false, decoded: null, blacklisted: true };
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { 
      valid: true, 
      expired: false, 
      decoded: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        managed_branch_id: decoded.managed_branch_id,
        iat: decoded.iat,
        exp: decoded.exp
      }, 
      blacklisted: false 
    };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      expired: err.message === 'jwt expired',
      decoded: null,
      blacklisted: false
    };
  }
};