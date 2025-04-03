// Global API configuration
// Use Node.js runtime instead of Edge Runtime for all API routes
export const runtime = 'nodejs';
// This disables dynamic code evaluation restrictions
// which is not supported in Edge Runtime
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
