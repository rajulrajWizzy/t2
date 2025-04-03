/**
 * JWT Compatibility Layer
 * This module provides a consistent interface for JWT operations across Node.js and Edge Runtime
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Determine environment
const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';
const isNodeRuntime = !isEdgeRuntime && typeof window === 'undefined';

/**
 * Generate a token that works in both Edge and Node.js environments
 */
function generateCompatibleToken(payload, options = {}) {
  // Ensure we have required fields
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (options.expiresIn ? 
      (typeof options.expiresIn === 'string' ? parseExpiryString(options.expiresIn) : options.expiresIn) : 
      parseExpiryString(JWT_EXPIRES_IN))
  };

  // Use jsonwebtoken in Node.js environment
  if (isNodeRuntime) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(tokenPayload, JWT_SECRET, options);
  }

  // For Edge Runtime or browser, use a fallback
  return createJWTManually(tokenPayload, JWT_SECRET);
}

/**
 * Verify a token in a way that works in both Edge and Node.js environments
 */
function verifyCompatibleToken(token) {
  try {
    // In Node.js environment, use jsonwebtoken
    if (isNodeRuntime) {
      const jwt = require('jsonwebtoken');
      return { 
        valid: true, 
        decoded: jwt.verify(token, JWT_SECRET),
        expired: false
      };
    }

    // For Edge Runtime or browser, use a manual verification
    return verifyJWTManually(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error: ', error);
    return { 
      valid: false, 
      decoded: null,
      expired: error.message === 'jwt expired',
      error: error.message
    };
  }
}

/**
 * Helper function to parse expiry strings like '1d', '2h', '30m'
 */
function parseExpiryString(expiryString) {
  const num = parseInt(expiryString);
  if (isNaN(num)) return 24 * 60 * 60; // Default to 1 day

  if (expiryString.endsWith('s')) return num;
  if (expiryString.endsWith('m')) return num * 60;
  if (expiryString.endsWith('h')) return num * 60 * 60;
  if (expiryString.endsWith('d')) return num * 24 * 60 * 60;
  
  return num; // Assume seconds if no unit
}

/**
 * Manual JWT creation for environments without jsonwebtoken
 * This is a simplified implementation and doesn't include all JWT features
 */
function createJWTManually(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const base64UrlEncode = (str) => {
    return Buffer.from(JSON.stringify(str))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };
  
  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  
  // In a real implementation, we'd use a proper HMAC function
  // This is just a placeholder for the concept
  const signature = Buffer.from(`${headerEncoded}.${payloadEncoded}.${secret}`)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Manual JWT verification for environments without jsonwebtoken
 * This is just a placeholder - in a real app you would need a proper HMAC validation
 */
function verifyJWTManually(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('jwt malformed');
    }
    
    const base64UrlDecode = (str) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(Buffer.from(base64, 'base64').toString());
    };
    
    const payload = base64UrlDecode(parts[1]);
    
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('jwt expired');
    }
    
    return { valid: true, decoded: payload, expired: false };
  } catch (error) {
    throw error;
  }
}

// Export the compatibility functions
module.exports = {
  generateCompatibleToken,
  verifyCompatibleToken,
  isEdgeRuntime,
  isNodeRuntime
}; 