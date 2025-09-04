// ========================================
// TYPE SYSTEM INDEX
// ✅ Step 6 Implementation: Modular Type System
// Re-export all types for clean imports
// ========================================

import { BundleType, CourseCategory, ProcessingStatus } from './common.types';

// Common types - Enums and shared utilities
export * from './common.types';

// Database types - Core table interfaces
export * from './database.types';

// Business logic types - Operations and logic
export * from './business.types';

// UI types - Component and interface types
export * from './ui.types';

// API types - Request/response interfaces
export * from './api.types';

// ✅ NEW: SSG types - Static Site Generation types
export * from './ssg.types';

// ========================================
// CONVENIENCE RE-EXPORTS
// Most commonly used types for easier importing
// ========================================

// Core entities
export type { Course, Bundle, User } from './database.types';
export type { CourseCategory, BundleType } from './common.types';

// UI essentials
export type { CourseWithEnrollment, BundleWithCourses } from './ui.types';

// API essentials
export type { ApiResponse, CourseFilters, BundleFilters } from './api.types';

// ✅ NEW: SSG essentials
export type { 
  StaticPageProps, 
  CourseStaticProps, 
  BundleStaticProps,
  FilteredContentData 
} from './ssg.types';

// Business logic essentials
export type { CourseAccessInfo, PurchaseWithEnrollments } from './business.types';

// ========================================
// TYPE GUARDS & UTILITIES
// Helper functions for type safety
// ========================================

export const isValidCourseCategory = (value: string): value is CourseCategory => {
  return ['EB1A', 'EB2-NIW', 'Other'].includes(value);
};

export const isValidBundleType = (value: string): value is BundleType => {
  return ['curated', 'beginner', 'premium', 'specialized'].includes(value);
};

export const isValidProcessingStatus = (value: string): value is ProcessingStatus => {
  return ['pending', 'processing', 'completed', 'partial', 'failed'].includes(value);
};

// ========================================
// VERSION INFO
// Track type system changes
// ========================================

export const TYPE_SYSTEM_VERSION = '2.0.0'; // Updated for SSG implementation
export const LAST_UPDATED = '2024-12-19';
export const BREAKING_CHANGES = [
  'Modularized type system into separate files',
  'Added SSG-specific types for static generation', 
  'Enhanced type safety with guards and utilities'
];