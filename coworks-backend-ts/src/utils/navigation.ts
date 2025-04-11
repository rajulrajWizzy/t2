import { useRouter as useNextRouter } from 'next/navigation';
import { AppRouter, NavigationHelpers, RouteConfig, RouteMap, NavigationOptions } from '@/types/navigation';

// Define the base URLs
export const baseUrls = {
  admin: {
    dashboard: '/admin/dashboard',
    login: '/admin/login',
    bookings: '/admin/bookings',
    customers: '/admin/customers',
    settings: '/admin/settings',
  },
  customer: {
    dashboard: '/customer/dashboard',
    bookings: '/customer/bookings',
    profile: '/customer/profile',
  },
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
  },
} as const;

// Define route configurations
export const routes: RouteMap = {
  [baseUrls.admin.dashboard]: {
    path: baseUrls.admin.dashboard,
    private: true,
    adminOnly: true,
    layout: 'admin',
  },
  [baseUrls.admin.login]: {
    path: baseUrls.admin.login,
    private: false,
    layout: 'auth',
  },
  [baseUrls.admin.bookings]: {
    path: baseUrls.admin.bookings,
    private: true,
    adminOnly: true,
    layout: 'admin',
  },
  [baseUrls.customer.dashboard]: {
    path: baseUrls.customer.dashboard,
    private: true,
    layout: 'customer',
  },
  [baseUrls.auth.login]: {
    path: baseUrls.auth.login,
    private: false,
    layout: 'auth',
  },
};

// Custom useRouter hook with type safety
export function useRouter(): NavigationHelpers {
  const router = useNextRouter();

  return {
    push: async (url: string, options?: NavigationOptions) => {
      await router.push(url, options);
      return true;
    },
    replace: async (url: string, options?: NavigationOptions) => {
      await router.replace(url, options);
      return true;
    },
    back: () => router.back(),
    refresh: () => router.refresh(),
    prefetch: async (url: string) => {
      await router.prefetch(url);
    },
  };
}

// Navigation helper functions
export const navigation = {
  // Admin navigation
  toAdminDashboard: (router: NavigationHelpers) => {
    return router.push(baseUrls.admin.dashboard);
  },
  toAdminLogin: (router: NavigationHelpers, redirectTo?: string) => {
    const url = new URL(baseUrls.admin.login, window.location.origin);
    if (redirectTo) {
      url.searchParams.set('redirectTo', redirectTo);
    }
    return router.push(url.toString());
  },
  toAdminBookings: (router: NavigationHelpers) => {
    return router.push(baseUrls.admin.bookings);
  },
  toAdminBookingDetails: (router: NavigationHelpers, id: string) => {
    return router.push(`/admin/bookings/${id}`);
  },

  // Customer navigation
  toCustomerDashboard: (router: NavigationHelpers) => {
    return router.push(baseUrls.customer.dashboard);
  },
  toCustomerBookings: (router: NavigationHelpers) => {
    return router.push(baseUrls.customer.bookings);
  },
  toCustomerBookingDetails: (router: NavigationHelpers, id: string) => {
    return router.push(`/customer/bookings/${id}`);
  },

  // Auth navigation
  toLogin: (router: NavigationHelpers, redirectTo?: string) => {
    const url = new URL(baseUrls.auth.login, window.location.origin);
    if (redirectTo) {
      url.searchParams.set('redirectTo', redirectTo);
    }
    return router.push(url.toString());
  },
  toRegister: (router: NavigationHelpers) => {
    return router.push(baseUrls.auth.register);
  },
  toForgotPassword: (router: NavigationHelpers) => {
    return router.push(baseUrls.auth.forgotPassword);
  },

  // Utility functions
  isAdminRoute: (path: string): boolean => {
    return path.startsWith('/admin');
  },
  isPrivateRoute: (path: string): boolean => {
    const route = routes[path];
    return route?.private ?? false;
  },
  requiresAuth: (path: string): boolean => {
    const route = routes[path];
    return route?.private ?? false;
  },
  getLayout: (path: string): string | undefined => {
    const route = routes[path];
    return route?.layout;
  },
}; 