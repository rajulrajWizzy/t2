// Script to apply auth helper to all routes
// Run with: node scripts/apply-auth-helper.js

const fs = require('fs');
const path = require('path');

// Define the routes we want to update
const routesToUpdate = [
  './app/api/admin/dashboard/stats/route.ts',
  './app/api/admin/profile/route.ts',
  './app/api/admin/profile/update/route.ts',
  './app/api/admin/seating-types/route.ts',
  './app/api/admin/users/route.ts',
  './app/api/bookings/route.ts',
  './app/api/branches/route.ts',
  './app/api/profile/route.ts',
  './app/api/support/tickets/route.ts'
]; 