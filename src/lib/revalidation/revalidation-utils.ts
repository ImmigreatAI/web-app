// ========================================
// FILE: src/lib/revalidation/revalidation-utils.ts
// ✅ Utility Functions for Revalidation System
// ========================================

import { ContentChange, CourseCategory } from '@/lib/types';
import { REVALIDATION_PATHS } from './revalidation-config';

/**
 * Generate paths to revalidate based on content change
 */
export function generateRevalidationPaths(change: ContentChange): string[] {
  const { type, slug, category } = change;
  
  if (!slug || !category) {
    return REVALIDATION_PATHS.GLOBAL_PATHS;
  }
  
  switch (type) {
    case 'course':
      return REVALIDATION_PATHS.COURSE_PATHS(slug, category);
    
    case 'bundle':
      return REVALIDATION_PATHS.BUNDLE_PATHS(slug, category);
    
    default:
      return REVALIDATION_PATHS.GLOBAL_PATHS;
  }
}

/**
 * Batch content changes by type for efficient processing
 */
export function batchContentChanges(changes: ContentChange[]): {
  courses: ContentChange[];
  bundles: ContentChange[];
  categories: Set<CourseCategory>;
} {
  const courses: ContentChange[] = [];
  const bundles: ContentChange[] = [];
  const categories = new Set<CourseCategory>();
  
  for (const change of changes) {
    switch (change.type) {
      case 'course':
        courses.push(change);
        break;
      case 'bundle':
        bundles.push(change);
        break;
    }
    
    if (change.category) {
      categories.add(change.category);
    }
  }
  
  return { courses, bundles, categories };
}

/**
 * Deduplicate paths to avoid unnecessary revalidation
 */
export function deduplicatePaths(paths: string[]): string[] {
  return Array.from(new Set(paths)).sort();
}

/**
 * Validate content change object
 */
export function validateContentChange(change: any): change is ContentChange {
  return (
    change &&
    typeof change === 'object' &&
    ['course', 'bundle'].includes(change.type) &&
    ['created', 'updated', 'deleted'].includes(change.action) &&
    typeof change.id === 'string' &&
    typeof change.timestamp === 'string'
  );
}

/**
 * Calculate revalidation priority based on change type
 */
export function calculateRevalidationPriority(change: ContentChange): number {
  const { type, action } = change;
  
  // Urgent: deletions and new content
  if (action === 'deleted' || action === 'created') {
    return REVALIDATION_PRIORITIES.HIGH;
  }
  
  // Medium: updates
  if (action === 'updated') {
    return REVALIDATION_PRIORITIES.MEDIUM;
  }
  
  return REVALIDATION_PRIORITIES.LOW;
}

/**
 * Format duration for human readability
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

/**
 * Create performance summary for revalidation results
 */
export function createPerformanceSummary(
  pathsRevalidated: string[],
  errors: string[],
  durationMs: number
): {
  summary: string;
  status: 'success' | 'warning' | 'error';
  metrics: {
    pathsCount: number;
    errorCount: number;
    duration: string;
    successRate: string;
  };
} {
  const pathsCount = pathsRevalidated.length;
  const errorCount = errors.length;
  const successRate = pathsCount > 0 ? Math.round(((pathsCount - errorCount) / pathsCount) * 100) : 0;
  
  let status: 'success' | 'warning' | 'error' = 'success';
  let summary = '';
  
  if (errorCount === 0) {
    status = 'success';
    summary = `Successfully revalidated ${pathsCount} paths in ${formatDuration(durationMs)}`;
  } else if (errorCount < pathsCount * 0.3) {
    status = 'warning';
    summary = `Revalidated ${pathsCount - errorCount}/${pathsCount} paths with ${errorCount} errors`;
  } else {
    status = 'error';
    summary = `Revalidation failed for ${errorCount}/${pathsCount} paths`;
  }
  
  return {
    summary,
    status,
    metrics: {
      pathsCount,
      errorCount,
      duration: formatDuration(durationMs),
      successRate: `${successRate}%`,
    },
  };
}