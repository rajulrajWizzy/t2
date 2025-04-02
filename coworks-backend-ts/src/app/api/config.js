/**
 * API Routes Configuration
 * 
 * This file ensures all API routes use the Node.js runtime
 * and are always dynamically rendered.
 */

// Force all API routes to use Node.js runtime
export const runtime = 'nodejs';

// Force all API routes to be dynamic
export const dynamic = 'force-dynamic';

// Prevent static generation
export const fetchCache = 'force-no-store';
