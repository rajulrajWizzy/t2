/**
 * SAFE model exports for middleware and edge functions
 * 
 * This file exports dummy models that can be safely imported in middleware and edge functions.
 * These are placeholder implementations that don't actually use Sequelize.
 * For real DB operations, import from '@/models' in API routes with 'nodejs' runtime.
 */

// Define safe types that mirror the actual models
export interface SafeBlacklistedToken {
  token: string;
  user_id: number;
  blacklisted_at: Date;
  expires_at: Date;
}

// Create a safe models object with mock implementations
const safeModels = {
  // Mock BlacklistedToken model that always returns false for middleware
  BlacklistedToken: {
    findOne: async () => null,
  },
};

export default safeModels; 