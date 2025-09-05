// ========================================
// FILE: src/lib/revalidation/content-revalidation.ts
// ✅ STEP 7 SIMPLIFIED: Basic Content Revalidation Service
// ========================================

import { revalidatePath, revalidateTag } from 'next/cache';
import { CourseCategory } from '@/lib/types';

export class ContentRevalidationService {
  
  /**
   * Revalidate all course-related pages
   */
  static async revalidateAllCourses(): Promise<{ success: boolean; message: string; pathsRevalidated: string[] }> {
    const pathsRevalidated: string[] = [];
    
    try {
      // Core course pages
      const coursePaths = [
        '/',
        '/courses',
        '/courses/eb1a',
        '/courses/eb2-niw', 
        '/courses/other',
      ];

      // Revalidate each path
      for (const path of coursePaths) {
        revalidatePath(path);
        pathsRevalidated.push(path);
      }

      // Revalidate course tags
      revalidateTag('courses-all');
      revalidateTag('courses-eb1a');
      revalidateTag('courses-eb2-niw');
      revalidateTag('courses-other');

      return {
        success: true,
        message: `Successfully revalidated ${pathsRevalidated.length} course paths`,
        pathsRevalidated
      };

    } catch (error) {
      console.error('Course revalidation error:', error);
      return {
        success: false,
        message: `Course revalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pathsRevalidated
      };
    }
  }

  /**
   * Revalidate all bundle-related pages
   */
  static async revalidateAllBundles(): Promise<{ success: boolean; message: string; pathsRevalidated: string[] }> {
    const pathsRevalidated: string[] = [];
    
    try {
      // Core bundle pages
      const bundlePaths = [
        '/bundles',
        '/bundles?category=eb1a',
        '/bundles?category=eb2-niw',
        '/bundles?category=other',
      ];

      // Revalidate each path
      for (const path of bundlePaths) {
        revalidatePath(path);
        pathsRevalidated.push(path);
      }

      // Revalidate bundle tags
      revalidateTag('bundles-all');
      revalidateTag('bundles-eb1a');
      revalidateTag('bundles-eb2-niw');
      revalidateTag('bundles-other');

      return {
        success: true,
        message: `Successfully revalidated ${pathsRevalidated.length} bundle paths`,
        pathsRevalidated
      };

    } catch (error) {
      console.error('Bundle revalidation error:', error);
      return {
        success: false,
        message: `Bundle revalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pathsRevalidated
      };
    }
  }

  /**
   * Revalidate a specific course page
   */
  static async revalidateCoursePage(slug: string): Promise<{ success: boolean; message: string; pathsRevalidated: string[] }> {
    const pathsRevalidated: string[] = [];
    
    try {
      const coursePath = `/course/${slug}`;
      
      // Revalidate the specific course page
      revalidatePath(coursePath);
      pathsRevalidated.push(coursePath);
      
      // Also revalidate course listing pages (they might show this course)
      revalidatePath('/courses');
      pathsRevalidated.push('/courses');
      
      // Revalidate tags
      revalidateTag(`course-${slug}`);
      revalidateTag('courses-all');

      return {
        success: true,
        message: `Successfully revalidated course: ${slug}`,
        pathsRevalidated
      };

    } catch (error) {
      console.error('Course page revalidation error:', error);
      return {
        success: false,
        message: `Course revalidation failed for ${slug}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pathsRevalidated
      };
    }
  }

  /**
   * Revalidate a specific bundle page
   */
  static async revalidateBundlePage(slug: string): Promise<{ success: boolean; message: string; pathsRevalidated: string[] }> {
    const pathsRevalidated: string[] = [];
    
    try {
      const bundlePath = `/bundle/${slug}`;
      
      // Revalidate the specific bundle page
      revalidatePath(bundlePath);
      pathsRevalidated.push(bundlePath);
      
      // Also revalidate bundle listing page
      revalidatePath('/bundles');
      pathsRevalidated.push('/bundles');
      
      // Revalidate tags
      revalidateTag(`bundle-${slug}`);
      revalidateTag('bundles-all');

      return {
        success: true,
        message: `Successfully revalidated bundle: ${slug}`,
        pathsRevalidated
      };

    } catch (error) {
      console.error('Bundle page revalidation error:', error);
      return {
        success: false,
        message: `Bundle revalidation failed for ${slug}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pathsRevalidated
      };
    }
  }

  /**
   * Revalidate everything (full site revalidation)
   */
  static async revalidateEverything(): Promise<{ success: boolean; message: string; results: any[] }> {
    try {
      // Revalidate all courses and bundles
      const [courseResult, bundleResult] = await Promise.all([
        this.revalidateAllCourses(),
        this.revalidateAllBundles()
      ]);

      // Also revalidate home page
      revalidatePath('/');
      
      // Global tags
      revalidateTag('global-content');

      const allPathsRevalidated = [
        ...courseResult.pathsRevalidated,
        ...bundleResult.pathsRevalidated,
        '/'
      ];

      return {
        success: courseResult.success && bundleResult.success,
        message: `Full revalidation complete: ${allPathsRevalidated.length} paths updated`,
        results: [courseResult, bundleResult]
      };

    } catch (error) {
      console.error('Full revalidation error:', error);
      return {
        success: false,
        message: `Full revalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: []
      };
    }
  }
}