/**
 * JWT Selector - Dynamically chooses the correct JWT implementation based on runtime
 */

// Determine the runtime environment
const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

// Import the appropriate JWT implementation
const jwtImpl = isEdgeRuntime
  ? require('./jwt-edge')
  : require('./jwt');

// Re-export all functions from the chosen implementation
export const {
  verifyToken,
  generateToken,
  generateAdminToken,
  verifyAdminToken
} = jwtImpl; 