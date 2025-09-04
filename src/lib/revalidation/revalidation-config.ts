// ========================================
// FILE: src/lib/revalidation/revalidation-config.ts
// ✅ Configuration and Settings for Revalidation System
// ========================================

import { RevalidationConfig, CourseCategory } from '@/lib/types';

/**
 * Global revalidation configuration
 */
export const REVALIDATION_SETTINGS = {
  // Default revalidation time (1 hour)
  DEFAULT_REVALIDATE_TIME: 3600,
  
  // Background processing delay between items (100ms)
  BACKGROUND_DELAY_MS: 100,
  
  // Maximum concurrent revalidations
  MAX_CONCURRENT_REVALIDATIONS: 5,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Log retention
  LOG_RETENTION_DAYS: 30,
  QUEUE_RETENTION_DAYS: 7,
  
  // Performance thresholds
  WARNING_DURATION_MS: 5000,   // Warn if revalidation takes > 5 seconds
  ERROR_DURATION_MS: 15000,    // Error if revalidation takes > 15 seconds
  
  // Batch processing
  BATCH_SIZE: 10,
  BATCH_DELAY_MS: 1000,
} as const;

/**
 * Path templates for different content types
 */
export const REVALIDATION_PATHS = {
  // Course paths
  COURSE_PATHS: (slug: string, category: CourseCategory) => [
    '/courses',
    `/courses/${category.toLowerCase()}`,
    `/course/${slug}`,
    '/', // Home page might show courses
  ],
  
  // Bundle paths
  BUNDLE_PATHS: (slug: string, category: CourseCategory) => [
    '/bundles',
    `/bundles?category=${category.toLowerCase()}`,
    `/bundle/${slug}`,
    '/courses', // Courses page might show bundle recommendations
    `/courses/${category.toLowerCase()}`,
  ],
  
  // Category paths
  CATEGORY_PATHS: (category: CourseCategory) => [
    '/courses',
    `/courses/${category.toLowerCase()}`,
    '/bundles',
    `/bundles?category=${category.toLowerCase()}`,
  ],
  
  // Global paths (always revalidated)
  GLOBAL_PATHS: [
    '/',
    '/courses',
    '/bundles',
  ],
} as const;

/**
 * Priority levels for different revalidation types
 */
export const REVALIDATION_PRIORITIES = {
  URGENT: 1,      // Immediate revalidation (blocking)
  HIGH: 2,        // High priority (background, but fast)
  MEDIUM: 5,      // Normal priority (background)
  LOW: 8,         // Low priority (background, batched)
  CLEANUP: 10,    // System cleanup operations
} as const;

/**
 * Configuration for different content types
 */
export const CONTENT_REVALIDATION_CONFIGS: Record<string, RevalidationConfig> = {
  // Course creation/updates
  course_create: {
    paths: [],
    revalidateTime: 0, // Immediate
    strategy: 'background',
    priority: 'high',
  },
  
  course_update: {
    paths: [],
    revalidateTime: 300, // 5 minutes
    strategy: 'background', 
    priority: 'medium',
  },
  
  course_delete: {
    paths: [],
    revalidateTime: 0, // Immediate
    strategy: 'background',
    priority: 'high',
  },
  
  // Bundle creation/updates
  bundle_create: {
    paths: [],
    revalidateTime: 0, // Immediate
    strategy: 'background',
    priority: 'high',
  },
  
  bundle_update: {
    paths: [],
    revalidateTime: 300, // 5 minutes
    strategy: 'background',
    priority: 'medium',
  },
  
  bundle_delete: {
    paths: [],
    revalidateTime: 0, // Immediate
    strategy: 'background',
    priority: 'high',
  },
  
  // Category changes
  category_update: {
    paths: [],
    revalidateTime: 600, // 10 minutes
    strategy: 'background',
    priority: 'medium',
  },
  
  // Manual/urgent revalidation
  manual_urgent: {
    paths: [],
    revalidateTime: 0, // Immediate
    strategy: 'blocking',
    priority: 'high',
  },
  
  // Scheduled/maintenance
  scheduled_maintenance: {
    paths: [],
    revalidateTime: 1800, // 30 minutes
    strategy: 'background',
    priority: 'low',
  },
};
