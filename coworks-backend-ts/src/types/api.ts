/**
 * Generic API response interface for consistent formatting
 */
export interface ApiResponse<T = any> {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Message to display to the user
   */
  message?: string;
  
  /**
   * Response data (null if error or undefined if no data)
   */
  data: T;
  
  /**
   * Pagination details (if applicable)
   */
  pagination?: PaginationMeta;
  
  /**
   * Additional metadata (if applicable)
   */
  meta?: Record<string, any>;
  
  /**
   * Error details (if applicable)
   */
  errors?: ApiError[];
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /**
   * Current page number
   */
  current_page: number;
  
  /**
   * Total number of pages
   */
  total_pages: number;
  
  /**
   * Number of items per page
   */
  per_page: number;
  
  /**
   * Total number of items
   */
  total_items: number;
}

/**
 * API error details
 */
export interface ApiError {
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Field that caused the error (if applicable)
   */
  field?: string;
} 