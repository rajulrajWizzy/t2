import jwt from 'jsonwebtoken';
import { Customer } from '@/types/auth';
import { JwtPayload, JwtVerificationResult } from '@/types/common';
import CustomerModel from '@/models/customer';
import models from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Generate a token for a user
export const generateToken = (user: CustomerModel | Customer): string => {
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
export const verifyToken = async (token: string): Promise<JwtVerificationResult> => {
  try {
    // First check if token is blacklisted
    const blacklistedToken = await models.BlacklistedToken.findOne({
      where: { token }
    });

    if (blacklistedToken) {
      return {
        valid: false,
        expired: false,
        decoded: null,
        blacklisted: true
      };
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return {
      valid: true,
      expired: false,
      decoded,
      blacklisted: false
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        expired: true,
        decoded: null,
        blacklisted: false
      };
    }
    
    return {
      valid: false,
      expired: false,
      decoded: null,
      blacklisted: false
    };
  }
};