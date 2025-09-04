// ========================================
// COMMON TYPES & ENUMS
// Shared types used across the application
// ========================================

export type CourseCategory = 'EB1A' | 'EB2-NIW' | 'Other';
export type BundleType = 'curated' | 'beginner' | 'premium' | 'specialized';
export type ValidityTier = '3month' | '6month' | '9month';
export type BYOBTier = null | '5plus' | '10plus';

export type ProcessingStatus = 
  | 'pending'      // Payment successful, waiting for queue
  | 'processing'   // Queue is processing enrollments
  | 'completed'    // All enrollments successful
  | 'partial'      // Some enrollments failed
  | 'failed';      // All enrollments failed

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = string;
export type Timestamp = string;
export type NonEmptyArray<T> = [T, ...T[]];