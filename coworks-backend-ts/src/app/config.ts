// Configuration for routing and dynamic/static behavior
export const routeConfig = {
  // Pages that should be dynamic (not prerendered)
  dynamic: [
    '/admin/bookings/*',
    '/admin/users/*',
    '/admin/super/*',
    '/admin/branch/*',
    '/admin/dashboard',
    '/admin/super',
    '/admin/branch',
    '/404',
    '/500'
  ],
  
  // Pages that should be static (minimal)
  static: [
    '/',
    '/admin/login'
  ]
}; 