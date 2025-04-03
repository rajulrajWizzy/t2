/**
 * JWT Wrapper - A unified way to handle JWT operations in the application
 * This file re-exports functions from both jwt.ts and config/jwt.ts to ensure consistency
 */

// Explicitly set Node.js runtime for this utility
export const runtime = "nodejs";

// Import from local JWT implementation
import { 
  verifyAuth as localVerifyAuth,
  verifyTokenFromRequest,
  blacklistToken,
  isTokenBlacklisted,
  type JWTPayload,
  type AdminJWTPayload,
  type VerificationResult,
  generateToken as localGenerateToken,
} from './jwt';

// Import from config/jwt implementations
import { 
  generateToken as configGenerateToken,
  generateAdminToken,
  verifyToken as configVerifyToken,
  verifyAdminToken
} from '../config/jwt';

// Use a consistent JWT implementation - prioritize the config/jwt.ts implementation
// as it handles blacklisted tokens correctly
export const verifyToken = configVerifyToken;

// Function to wrap the config verifyToken to match the signature expected by routes
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    console.log('[verifyJWT] Verifying token...');
    const result = await configVerifyToken(token);
    
    if (!result.valid || !result.decoded) {
      console.log('[verifyJWT] Token invalid:', result);
      return null;
    }
    
    // Handle the id field, making sure it's a number
    const id = typeof result.decoded.id === 'string' 
      ? parseInt(result.decoded.id, 10) 
      : result.decoded.id;
    
    // Return a properly typed payload
    // Make sure to preserve ALL properties from the decoded token
    const payload: JWTPayload = {
      ...result.decoded,
      id: id as number
    };
    
    // Log the important parts of the payload for debugging
    console.log('[verifyJWT] Token valid, payload:', JSON.stringify({
      id: payload.id,
      email: payload.email,
      is_admin: payload.is_admin,
      role: payload.role
    }));
    
    return payload;
  } catch (error) {
    console.error('[verifyJWT] Error verifying token:', error);
    return null;
  }
}

// Re-export everything with clear naming
export {
  // Token generation
  configGenerateToken as generateToken,         // For regular users
  generateAdminToken,    // For admin users
  
  // Token verification
  verifyAdminToken,      // Admin token verification
  localVerifyAuth as verifyAuth,            // Full request verification with header extraction
  verifyTokenFromRequest, // Same as verifyAuth
  
  // Token management
  blacklistToken,        // Add token to blacklist
  isTokenBlacklisted,    // Check if token is blacklisted
  
  // Types
  type JWTPayload,       // Regular user payload
  type AdminJWTPayload,  // Admin payload
  type VerificationResult // Result of verification
};

// For debugging purposes, export a function to inspect tokens
export function inspectToken(token: string): any {
  try {
    // Using require here to avoid dependency on specific JWT implementation
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    return {
      decoded,
      isValid: !!decoded,
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      issuedAt: decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : null
    };
  } catch (error) {
    console.error('Error inspecting token:', error);
    return { error: 'Invalid token format' };
  }
}

// Add helper functions to standardize token handling in routes
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  return authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
}

// Standard CORS headers for API responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper for adding CORS headers to any response
export function addCorsHeaders(response: any) {
  if (!response) return response;
  
  // If it's a NextResponse
  if (response instanceof Response) {
    const newHeaders = new Headers(response.headers);
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } 
  // If it's a plain object to be converted to JSON later
  else {
    return {
      ...response,
      headers: { ...response.headers, ...corsHeaders }
    };
  }
}

// Helper for consistent error responses
export function createAuthErrorResponse(message: string, status: number = 401) {
  return {
    success: false,
    message,
    data: null,
    headers: corsHeaders
  };
} 