// ========================================
// SSG (STATIC SITE GENERATION) TYPES
// ✅ NEW: Step 6 Implementation - SSG-specific types
// ========================================

import { Course, Bundle } from './database.types';
import { CourseCategory, BundleType } from './common.types';

/**
 * Static page props for SSG pages
 */
export interface StaticPageProps {
  courses: Course[];
  bundles: Bundle[];
  categories: CourseCategory[];
  revalidatedAt?: string;
}

/**
 * Course-specific static props for /courses pages
 */
export interface CourseStaticProps {
  courses: Course[];
  categories: CourseCategory[];
  series: string[];
  tags: string[];
  revalidatedAt?: string;
}

/**
 * Bundle-specific static props for /bundles pages
 */
export interface BundleStaticProps {
  bundles: Bundle[];
  categories: CourseCategory[];
  bundleTypes: BundleType[];
  revalidatedAt?: string;
}

/**
 * Individual course page props for /course/[slug]
 */
export interface CoursePageProps {
  course: Course;
  relatedCourses: Course[];
  containingBundles: Bundle[];
  category: CourseCategory;
  series: string | null;
}

/**
 * Individual bundle page props for /bundle/[slug]
 */
export interface BundlePageProps {
  bundle: Bundle;
  courses: Course[];
  relatedBundles: Bundle[];
  category: CourseCategory;
}

/**
 * ISR revalidation configuration
 */
export interface RevalidationConfig {
  paths: string[];
  revalidateTime: number; // seconds
  strategy: 'background' | 'blocking';
  priority: 'high' | 'medium' | 'low';
}

/**
 * Client-side filtering data structure
 */
export interface FilteredContentData {
  filteredCourses: Course[];
  filteredBundles: Bundle[];
  activeFilters: FilterState;
  totalResults: number;
}

/**
 * Filter state for client-side operations
 */
export interface FilterState {
  courses: {
    category?: CourseCategory;
    series?: string;
    tags?: string[];
    searchTerm?: string;
  };
  bundles: {
    category?: CourseCategory;
    searchTerm?: string;
  };
}

/**
 * Preprocessed data for client-side filtering performance
 */
export interface ProcessedContentData {
  courses: ProcessedCourseData;
  bundles: ProcessedBundleData;
  searchIndex: SearchIndex;
}

export interface ProcessedCourseData {
  byCategory: Record<CourseCategory, Course[]>;
  bySeries: Record<string, Course[]>;
  byTags: Record<string, Course[]>;
  searchableTerms: string[];
}

export interface ProcessedBundleData {
  byCategory: Record<CourseCategory, Bundle[]>;
  searchableTerms: string[];
}

/**
 * Search index for fast client-side searching
 */
export interface SearchIndex {
  courses: Record<string, string[]>; // courseId -> searchable terms
  bundles: Record<string, string[]>; // bundleId -> searchable terms
}

/**
 * Static params generation helpers
 */
export interface StaticParams {
  courses: Array<{ slug: string }>;
  bundles: Array<{ slug: string }>;
  categories: Array<{ categorySlug: string }>;
}

/**
 * Build-time data fetching results
 */
export interface BuildTimeData {
  courses: Course[];
  bundles: Bundle[];
  categories: CourseCategory[];
  series: string[];
  tags: string[];
  lastBuilt: string;
}

/**
 * Content change detection for revalidation
 */
export interface ContentChange {
  type: 'course' | 'bundle';
  action: 'created' | 'updated' | 'deleted';
  id: string;
  slug?: string;
  category?: CourseCategory;
  timestamp: string;
}

/**
 * Revalidation queue item
 */
export interface RevalidationQueueItem {
  id: string;
  paths: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  scheduledFor: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-side data hydration state
 */
export interface HydrationState {
  isHydrated: boolean;
  staticDataLoaded: boolean;
  userDataLoaded: boolean;
  errors: string[];
}

/**
 * SSG build configuration
 */
export interface SSGBuildConfig {
  revalidateTime: number;
  fallback: boolean | 'blocking';
  generateAtBuildTime: boolean;
  preloadUserData: boolean;
}