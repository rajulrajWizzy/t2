import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * ApiService class to handle all API calls
 * Includes methods for common CRUD operations and authentication
 */
class ApiService {
  private static instance: ApiService;
  private api: AxiosInstance;
  private baseUrl: string;
  private tokenCache: { value: string | null; timestamp: number } | null = null;
  private readonly TOKEN_CACHE_DURATION = 5000; // 5 seconds
  private isInitialized = false;
  private isServer: boolean;

  private constructor() {
    this.isServer = typeof window === 'undefined';
    
    // Use absolute URL in production, relative in development
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    
    // Set up axios with authentication from localStorage/cookies
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable sending cookies
    });
    
    // Only initialize with token if on client side
    if (!this.isServer) {
      this.initializeWithStoredToken();
    }

    // Add request interceptor to attach auth token to every request
    this.api.interceptors.request.use(
      async (config) => {
        if (this.isServer) return config;
        
        // Get token from cache first
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !this.isServer) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getCookieToken(): string | null {
    if (this.isServer) return null;
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('adminToken='))
      ?.split('=')[1] || null;
  }

  private getLocalStorageToken(): string | null {
    if (this.isServer) return null;
    try {
      return localStorage.getItem('adminToken');
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Initialize axios instance with token from localStorage or cookies
   */
  private initializeWithStoredToken(): void {
    if (!this.isServer && !this.isInitialized) {
      const token = this.getToken();
      if (token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        this.isInitialized = true;
      }
    }
  }

  /**
   * Get token from localStorage or cookies with caching
   */
  private getToken(): string | null {
    if (this.isServer) return null;

    // Check cache first
    if (this.tokenCache && Date.now() - this.tokenCache.timestamp < this.TOKEN_CACHE_DURATION) {
      return this.tokenCache.value;
    }

    // Try cookies first
    const cookieToken = this.getCookieToken();
    if (cookieToken) {
      this.tokenCache = { value: cookieToken, timestamp: Date.now() };
      return cookieToken;
    }

    // Fallback to localStorage
    const localToken = this.getLocalStorageToken();
    if (localToken) {
      this.tokenCache = { value: localToken, timestamp: Date.now() };
      return localToken;
    }
    
    this.tokenCache = { value: null, timestamp: Date.now() };
    return null;
  }

  /**
   * Handle unauthorized error (token expired)
   */
  private handleUnauthorized(): void {
    if (this.isServer) return;

    const currentPath = window.location.pathname;
    if (!currentPath.includes('/admin/login')) {
      // Use Next.js router for better client-side navigation
      window.location.href = `/admin/login?redirectTo=${encodeURIComponent(currentPath)}`;
    }
  }

  /**
   * Set token in localStorage and update axios headers
   */
  public setToken(token: string): void {
    if (this.isServer) return;

    try {
      // Update cache
      this.tokenCache = { value: token, timestamp: Date.now() };
      
      // Store token in localStorage
      try {
        localStorage.setItem('adminToken', token);
      } catch (error) {
        console.warn('Error storing token in localStorage:', error);
      }
      
      // Set cookie with proper parameters
      const domain = window.location.hostname;
      const cookieOptions = [
        `path=/`,
        `max-age=259200`,
        `SameSite=Lax`,
        `domain=${domain}`
      ];
      
      if (window.location.protocol === 'https:') {
        cookieOptions.push('Secure');
      }
      
      document.cookie = `adminToken=${token}; ${cookieOptions.join('; ')}`;
      
      // Update axios headers
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Remove token from storage
   */
  public clearToken(): void {
    if (this.isServer) return;

    // Clear cache
    this.tokenCache = null;
    this.isInitialized = false;
    
    // Clear from localStorage
    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminUser');
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
    
    // Clear from cookies
    const domain = window.location.hostname;
    document.cookie = `adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${domain}`;
    
    // Remove from headers
    if (this.api?.defaults?.headers) {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    if (this.isServer) return false;
    return !!this.getToken();
  }

  /**
   * Get current admin ID
   */
  public getAdminId(): string | null {
    if (this.isServer) return null;
    try {
      return localStorage.getItem('adminId');
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Get user data from localStorage
   */
  public getUser(): any {
    if (this.isServer) return null;
    try {
      const user = localStorage.getItem('adminUser');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Set user data in localStorage
   */
  public setUser(user: any): void {
    if (this.isServer) return;
    try {
      localStorage.setItem('adminUser', JSON.stringify(user));
    } catch (error) {
      console.warn('Error storing user data in localStorage:', error);
    }
  }

  /**
   * Admin login
   */
  public async login(email: string, password: string): Promise<any> {
    try {
      const response = await this.api.post('/admin/auth/login', { email, password });
      if (response.data.success && response.data.data.token) {
        // Set token and user data
        this.setToken(response.data.data.token);
        this.setUser(response.data.data.admin);
        
        // Update axios instance with new token
        this.api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
        
        return response.data;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Admin logout
   */
  public logout(): void {
    this.clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }

  /**
   * Verify session
   */
  public async verifySession(): Promise<{ authenticated: boolean }> {
    try {
      const response = await this.api.get('/admin/verify-session');
      return response.data;
    } catch (error) {
      this.clearToken();
      return { authenticated: false };
    }
  }

  /**
   * Generic GET request
   */
  public async get<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await this.api.get<T>(endpoint, { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  public async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.api.post<T>(endpoint, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   */
  public async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.api.put<T>(endpoint, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.api.delete<T>(endpoint);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload file
   */
  public async uploadFile<T>(endpoint: string, file: File, additionalData?: any): Promise<T> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (additionalData) {
        Object.keys(additionalData).forEach(key => {
          formData.append(key, additionalData[key]);
        });
      }
      
      const response = await this.api.post<T>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any, customMessage?: string): never {
    let errorMessage = customMessage || 'An error occurred';
    let errorData = {};
    
    if (error.response) {
      // Server responded with error
      const { data, status } = error.response;
      
      console.error(' API Error:', { 
        status, 
        message: data?.message || data?.error || errorMessage,
        data: data
      });
      
      // Use server error message if available
      errorMessage = data?.message || data?.error || errorMessage;
      errorData = data || {};
      
      // Handle specific status codes
      if (status === 401) {
        throw new Error('Unauthorized: Please log in again');
      }
    } else if (error.request) {
      // No response received
      console.error(' API Request Error:', error.request);
      errorMessage = 'No response from server';
    } else {
      // Error setting up request
      console.error(' API Setup Error:', error.message);
      errorMessage = error.message || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
}

// Export a singleton instance for use throughout the app
export const apiService = ApiService.getInstance();

// Default export
export default ApiService; 