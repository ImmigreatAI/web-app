// Data Access Services
export { CourseDataService } from './course-data.service';
export { BundleDataService } from './bundle-data.service';
export { PurchaseDataService } from './purchase-data.service';

// Business Logic Services  
export { EnrollmentService } from './enrollment.service';
export { CartService } from './cart.service';

// Service Types
export type {
  Course,
  Bundle,
  UserPurchase,
  Cart,
  CartItem,
  CartData,
  CartSummary,
  EnrollmentInfo,
  CourseFilters,
  BundleFilters,
  BundleWithCourses,
} from '@/lib/types';

// Utility functions for common operations
export const ServiceUtils = {
  /**
   * Format price for display
   */
  formatPrice: (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  },

  /**
   * Calculate discount percentage
   */
  calculateDiscountPercentage: (originalPrice: number, discountedPrice: number): number => {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  },

  /**
   * Format date for display
   */
  formatDate: (dateString: string): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  },

  /**
   * Check if purchase is expiring soon
   */
  isExpiringSoon: (expiresAt: string, daysAhead: number = 30): boolean => {
    const expiry = new Date(expiresAt);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);
    return expiry <= threshold;
  },

  /**
   * Get days until expiry
   */
  getDaysUntilExpiry: (expiresAt: string): number => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Determine enrollment ID based on validity months
   */
  getEnrollmentIdByValidity: (
    enrollmentIds: { three_month: string; six_month: string; nine_month: string },
    validityMonths: number
  ): string => {
    switch (validityMonths) {
      case 9:
        return enrollmentIds.nine_month;
      case 6:
        return enrollmentIds.six_month;
      case 3:
      default:
        return enrollmentIds.three_month;
    }
  },
};