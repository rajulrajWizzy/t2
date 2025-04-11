import { AppRouterInstance } from 'next/navigation';

// Define the base URL structure
export type BaseUrl = {
  admin: {
    dashboard: string;
    login: string;
    bookings: string;
    customers: string;
    settings: string;
  };
  customer: {
    dashboard: string;
    bookings: string;
    profile: string;
  };
  auth: {
    login: string;
    register: string;
    forgotPassword: string;
  };
};

// Define route parameters
export type RouteParams = {
  '/admin/bookings/[id]': { id: string };
  '/customer/bookings/[id]': { id: string };
  '/admin/customers/[id]': { id: string };
  '/admin/branches/[id]': { id: string };
};

// Define query parameters
export type QueryParams = {
  '/admin/dashboard': {
    period?: 'day' | 'week' | 'month' | 'year';
    branch?: string;
  };
  '/admin/bookings': {
    status?: 'active' | 'upcoming' | 'completed' | 'cancelled';
    branch?: string;
    type?: 'seat' | 'meeting';
    page?: string;
  };
  '/admin/login': {
    redirectTo?: string;
  };
};

// Navigation helper type
export type NavigationOptions = {
  scroll?: boolean;
};

// Extended AppRouterInstance with our custom types
export interface AppRouter extends AppRouterInstance {
  push(url: string, options?: NavigationOptions): Promise<boolean>;
  replace(url: string, options?: NavigationOptions): Promise<boolean>;
  back(): void;
  refresh(): void;
  prefetch(url: string): Promise<void>;
}

// Navigation helper functions
export interface NavigationHelpers {
  push(url: string, options?: NavigationOptions): Promise<boolean>;
  replace(url: string, options?: NavigationOptions): Promise<boolean>;
  back(): void;
  refresh(): void;
  prefetch(url: string): Promise<void>;
}

// Route configuration type
export interface RouteConfig {
  path: string;
  exact?: boolean;
  private?: boolean;
  adminOnly?: boolean;
  layout?: string;
}

// Route map type
export type RouteMap = {
  [key: string]: RouteConfig;
};

// Navigation context type
export interface NavigationContextType {
  router: AppRouter;
  routes: RouteMap;
  isAdminRoute: (path: string) => boolean;
  isPrivateRoute: (path: string) => boolean;
  requiresAuth: (path: string) => boolean;
} 