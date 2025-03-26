/**
 * Middleware Bypass Configuration
 * 
 * This file provides a utility to bypass the middleware authentication checks
 * for specific routes that need to be public, like login endpoints.
 */

export const bypassMiddleware = {
  skipAuth: true,
  skipMiddleware: true,
  auth: false
};

/**
 * Apply this configuration to any route that should bypass authentication checks.
 * Usage in route files:
 * 
 * ```
 * export const config = bypassMiddleware;
 * ```
 */ 