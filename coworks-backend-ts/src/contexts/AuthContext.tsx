'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  branch_id?: string | null;
  permissions?: Record<string, any> | null;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: (redirectToLogin?: boolean) => void;
  clearError: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  const refreshToken = async (): Promise<boolean> => {
    console.log('[AuthContext] Attempting to refresh token');
    
    try {
      // Get the current token
      const currentToken = localStorage.getItem('adminToken');
      
      if (!currentToken) {
        console.log('[AuthContext] No token to refresh');
        return false;
      }
      
      // Get the current origin to handle port changes
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const refreshUrl = `${currentOrigin}/api/admin/auth/refresh`;
      
      console.log('[AuthContext] Calling refresh endpoint:', refreshUrl);
      
      const response = await axios.post(
        refreshUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );
      
      if (response.data.success) {
        console.log('[AuthContext] Token refreshed successfully');
        
        // Get the new token and user data
        const { token: newToken, admin: userData } = response.data.data;
        
        // Update state
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
        setError(null); // Clear any previous errors
        
        // Update localStorage
        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('adminUser', JSON.stringify(userData));
        
        // Update axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        return true;
      } else {
        console.log('[AuthContext] Token refresh failed:', response.data.message);
        // Don't clear auth state here, just return false
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing token:', error);
      
      // Don't clear auth state on network errors, just return false
      // This prevents logout on temporary network issues
      return false;
    }
  };

  // Axios response interceptor
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        // If we get a successful response, just return it
        return response;
      },
      async (error) => {
        console.log('[AuthContext] Axios error interceptor triggered:', error.message);
        
        // Check if the error is due to an expired token (401 Unauthorized)
        if (error.response && error.response.status === 401) {
          console.log('[AuthContext] 401 error detected in axios interceptor');
          
          // Only try to refresh if we're not already on the login page
          const currentPath = window.location.pathname;
          const isLoginPage = currentPath.includes('/admin/login') || currentPath.includes('/admin/register');
          
          if (token && !isLoginPage) {
            console.log('[AuthContext] Token exists and not on login page, attempting to refresh...');
            
            try {
              // Try to refresh the token
              const refreshed = await refreshToken();
              
              if (refreshed) {
                console.log('[AuthContext] Token refreshed successfully, retrying original request');
                
                // Update the Authorization header with the new token
                const originalRequest = error.config;
                originalRequest.headers.Authorization = `Bearer ${token}`;
                
                // Retry the original request with the new token
                return axios(originalRequest);
              } else {
                console.log('[AuthContext] Token refresh failed');
                
                // Set error message but don't redirect
                setError('Your session has expired. Please refresh the page or log in again.');
                // IMPORTANT: Don't set isAuthenticated to false here to prevent redirect loops
              }
            } catch (refreshError) {
              console.error('[AuthContext] Error refreshing token:', refreshError);
              
              // Set error message but don't redirect
              setError('Error refreshing your session. Please try again.');
              // IMPORTANT: Don't set isAuthenticated to false here to prevent redirect loops
            }
            
            // IMPORTANT: Don't automatically redirect on auth failures
            // This prevents redirect loops
            console.log('[AuthContext] Not automatically redirecting to prevent redirect loops');
          }
        }
        
        // For other errors, just pass them through
        return Promise.reject(error);
      }
    );
    
    // Clean up the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshToken]);

  // Check authentication status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AuthContext] Checking authentication status on initial load');
      
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('adminToken');
      
      if (storedToken) {
        try {
          // Set the token in state and axios headers
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // IMPORTANT: Skip automatic token verification on page load
          // This prevents redirect loops when the token is invalid or expired
          console.log('[AuthContext] Token found in localStorage, skipping automatic verification');
          
          // Just assume the token is valid for now
          // The user can manually refresh or login if needed
          setIsAuthenticated(true);
          setLoading(false);
          
          // Try to get user info in the background without triggering redirects
          try {
            const userResponse = await axios.get('/api/admin/dashboard/stats?minimal=true', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            
            if (userResponse.data.success) {
              setUser(userResponse.data.data.admin);
            }
          } catch (userError) {
            console.log('[AuthContext] Error fetching user info, but continuing without redirect:', userError);
          }
        } catch (error) {
          console.error('[AuthContext] Error setting up authentication:', error);
          setIsAuthenticated(false);
          setLoading(false);
        }
      } else {
        console.log('[AuthContext] No token found in localStorage');
        setIsAuthenticated(false);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Function to verify token is still valid
  const verifyToken = async (tokenToVerify: string) => {
    try {
      console.log('[verifyToken] Attempting to verify token...');
      
      // Get the current origin to handle port changes
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const verifyUrl = `${currentOrigin}/api/admin/users/verify`;
      
      console.log('[verifyToken] Sending verification request to:', verifyUrl);
      
      const response = await axios.post(verifyUrl, {}, {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`
        }
      });
      
      console.log('[verifyToken] Verification response:', response.status, response.data);
      
      // If we get here, the token is valid
      return true;
    } catch (err: any) {
      console.error('[verifyToken] Token verification failed:', err.message);
      console.error('[verifyToken] Response status:', err.response?.status);
      console.error('[verifyToken] Response data:', err.response?.data);
      
      // IMPORTANT: Don't automatically log out on 401 errors
      // This prevents redirect loops
      if (err.response && err.response.status === 401) {
        console.log('[verifyToken] 401 received, but not logging out to prevent redirect loops');
        // IMPORTANT: Don't set isAuthenticated to false here to prevent redirect loops
        return false;
      }
      
      // For other errors, don't immediately log out
      console.log('[verifyToken] Error was not a 401, not logging out');
      return true; // Return true to prevent logout for non-auth errors
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current origin to handle port changes
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const loginUrl = `${currentOrigin}/api/admin/auth/login`;
      
      console.log('Authenticating with:', loginUrl);
      
      const response = await axios.post(loginUrl, {
        username,
        password
      });
      
      if (response.data.success) {
        const { token: newToken, admin: userData } = response.data.data;
        
        // Save to state
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Save to localStorage
        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('adminUser', JSON.stringify(userData));
        
        // Redirect to admin dashboard
        router.push('/admin/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'Failed to connect to the server'
      );
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = (redirectToLogin = true) => {
    console.log('[AuthContext] Logging out user', redirectToLogin ? 'with redirect' : 'without redirect');
    
    // Clear state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
    
    // Clear localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Only redirect if specified
    if (redirectToLogin) {
      // Use window.location for a full page refresh to clear any state
      window.location.href = '/admin/login';
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};