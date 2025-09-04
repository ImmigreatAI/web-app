// ========================================
// API REQUEST/RESPONSE TYPES
// API interaction and data exchange types
// ========================================

import { CartData, CartItem } from './database.types';
import { ProcessingStatus, CourseCategory, BundleType } from './common.types';
import { DiscountInfo } from './business.types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  purchaseId: string;
}

export interface PurchaseStatusResponse {
  purchase_id: string;
  status: ProcessingStatus;
  items_count: number;
  enrollments_created: number;
  processing_progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  estimated_completion?: string;
  error_details?: string[];
}

export interface CourseFilters {
  category?: CourseCategory;
  series?: string;
  tags?: string[];
}

export interface BundleFilters {
  bundle_type?: BundleType;
}

export interface CheckoutFormData {
  items: CartItem[];
  total: number;
  discount?: DiscountInfo;
  customer: {
    email: string;
    name: string;
  };
}

export interface CheckoutSessionRequest {
  clerkId: string;
  userEmail: string;
  userName: string;
  cartData?: CartData; // For cart checkout
  singleItem?: { // For Buy Now checkout
    type: 'course' | 'bundle';
    id: string;
    title: string;
    price: number;
    enrollmentId: string;
    validityMonths: number;
    thumbnailUrl?: string;
  };
  successUrl: string;
  cancelUrl: string;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, any>;
}

// Generic type helpers
export type APIResult<T> = ApiResponse<T>;
export type PaginatedResult<T> = PaginatedResponse<T>;