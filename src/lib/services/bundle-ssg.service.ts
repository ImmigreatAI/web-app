// Bundle SSG Service - Build-time bundle data fetching
import { Bundle, Course, CourseCategory, BundleWithCourses } from '@/lib/types';
import { 
  StaticDataFetcher, 
  PreProcessedBundleData,
  SSGError,
  RevalidationHelper 
} from './static-data-fetcher';
import { CourseSSGService } from './course-ssg.service';

/**
 * Bundle-specific SSG service for build-time data fetching
 * Handles bundle data with course relationships for static generation
 */
export class BundleSSGService extends StaticDataFetcher {

  /**
   * Get all bundles for static site generation
   */
  static async getAllBundles(): Promise<Bundle[]> {
    try {
      const { data: bundles, error } = await this.client
        .from('bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new SSGError('Failed to fetch bundles', 'getAllBundles', error);
      }

      return bundles || [];
    } catch (error) {
      console.error('Error in BundleSSGService.getAllBundles:', error);
      throw error instanceof SSGError ? error : new SSGError(
        'Unexpected error fetching bundles',
        'getAllBundles',
        error
      );
    }
  }

  /**
   * Get bundles filtered by category
   */
  static async getBundlesByCategory(category: CourseCategory): Promise<Bundle[]> {
    try {
      // Bundles don't have a direct category field, so we need to filter by courses they contain
      const allBundles = await this.getAllBundles();
      const allCourses = await CourseSSGService.getAllCourses();
      
      // Create a map of course IDs to categories for efficient lookup
      const courseCategories = new Map<string, CourseCategory>();
      allCourses.forEach(course => {
        courseCategories.set(course.id, course.category);
      });

      // Filter bundles that contain courses from the specified category
      const categoryBundles = allBundles.filter(bundle => {
        return bundle.course_ids.some(courseId => 
          courseCategories.get(courseId) === category
        );
      });

      return categoryBundles;
    } catch (error) {
      console.error(`Error fetching bundles for category ${category}:`, error);
      throw new SSGError(
        `Failed to fetch bundles for category: ${category}`,
        'getBundlesByCategory',
        error
      );
    }
  }

  /**
   * Get a single bundle by slug with course details
   */
  static async getBundleBySlug(slug: string): Promise<BundleWithCourses | null> {
    try {
      const { data: bundle, error } = await this.client
        .from('bundles')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Bundle not found
        }
        throw new SSGError(
          `Failed to fetch bundle with slug: ${slug}`,
          'getBundleBySlug',
          error
        );
      }

      // Fetch courses for this bundle
      const courses = await this.getCoursesForBundle(bundle.course_ids);

      return {
        ...bundle,
        courses,
      };
    } catch (error) {
      console.error(`Error fetching bundle by slug ${slug}:`, error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        `Unexpected error fetching bundle: ${slug}`,
        'getBundleBySlug',
        error
      );
    }
  }

  /**
   * Get courses for a bundle by course IDs
   */
  static async getCoursesForBundle(courseIds: string[]): Promise<Course[]> {
    try {
      if (courseIds.length === 0) return [];

      const { data: courses, error } = await this.client
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .eq('is_active', true);

      if (error) {
        throw new SSGError(
          'Failed to fetch courses for bundle',
          'getCoursesForBundle',
          error
        );
      }

      // Maintain the order specified in courseIds
      const courseMap = new Map<string, Course>();
      (courses || []).forEach(course => courseMap.set(course.id, course));
      
      return courseIds
        .map(id => courseMap.get(id))
        .filter(Boolean) as Course[];
    } catch (error) {
      console.error('Error fetching courses for bundle:', error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        'Unexpected error fetching bundle courses',
        'getCoursesForBundle',
        error
      );
    }
  }

  /**
   * Generate static parameters for all bundle pages
   */
  static async generateBundleParams(): Promise<Array<{ bundleSlug: string }>> {
    try {
      const { data: bundles, error } = await this.client
        .from('bundles')
        .select('slug')
        .eq('is_active', true);

      if (error) {
        throw new SSGError('Failed to generate bundle parameters', 'generateBundleParams', error);
      }

      return (bundles || []).map(bundle => ({
        bundleSlug: bundle.slug,
      }));
    } catch (error) {
      console.error('Error generating bundle parameters:', error);
      throw error instanceof SSGError ? error : new SSGError(
        'Unexpected error generating bundle parameters',
        'generateBundleParams',
        error
      );
    }
  }

  /**
   * Get pre-processed bundle data for the bundles discovery page
   */
  static async getPreProcessedBundleData(): Promise<PreProcessedBundleData> {
    try {
      const [allBundles, categories, lastModified] = await Promise.all([
        this.getAllBundles(),
        this.getAllCategories(),
        this.getContentLastModified(),
      ]);

      // Group bundles by category
      const bundlesByCategory: Record<CourseCategory, Bundle[]> = {} as any;
      
      // Initialize with empty arrays
      categories.forEach(category => {
        bundlesByCategory[category] = [];
      });

      // Get all courses to map bundle categories
      const allCourses = await CourseSSGService.getAllCourses();
      const courseCategories = new Map<string, CourseCategory>();
      allCourses.forEach(course => {
        courseCategories.set(course.id, course.category);
      });

      // Categorize bundles based on their courses
      allBundles.forEach(bundle => {
        const bundleCategories = new Set<CourseCategory>();
        
        // Determine which categories this bundle covers
        bundle.course_ids.forEach(courseId => {
          const category = courseCategories.get(courseId);
          if (category) {
            bundleCategories.add(category);
          }
        });

        // Add bundle to all relevant categories
        bundleCategories.forEach(category => {
          bundlesByCategory[category].push(bundle);
        });
      });

      return {
        allBundles,
        bundlesByCategory,
        availableCategories: categories,
        totalBundles: allBundles.length,
        lastUpdated: lastModified.toISOString(),
      };
    } catch (error) {
      console.error('Error pre-processing bundle data:', error);
      throw new SSGError(
        'Failed to pre-process bundle data',
        'getPreProcessedBundleData',
        error
      );
    }
  }

  /**
   * Calculate bundle savings for all bundles
   * Pre-computes savings data for better performance
   */
  static async getBundlesWithSavings(): Promise<Array<Bundle & { 
    calculatedSavings: {
      totalIndividualPrice: number;
      bundlePrice: number;
      savingsAmount: number;
      savingsPercentage: number;
    };
  }>> {
    try {
      const allBundles = await this.getAllBundles();
      const allCourses = await CourseSSGService.getAllCourses();
      
      // Create course price lookup
      const coursePrices = new Map<string, number>();
      allCourses.forEach(course => {
        const price = course.pricing.sale_price || course.pricing.base_price;
        coursePrices.set(course.id, price);
      });

      // Calculate savings for each bundle
      return allBundles.map(bundle => {
        const totalIndividualPrice = bundle.course_ids.reduce((total, courseId) => {
          return total + (coursePrices.get(courseId) || 0);
        }, 0);

        const bundlePrice = bundle.pricing.price;
        const savingsAmount = totalIndividualPrice - bundlePrice;
        const savingsPercentage = totalIndividualPrice > 0 
          ? Math.round((savingsAmount / totalIndividualPrice) * 100)
          : 0;

        return {
          ...bundle,
          calculatedSavings: {
            totalIndividualPrice,
            bundlePrice,
            savingsAmount,
            savingsPercentage,
          },
        };
      });
    } catch (error) {
      console.error('Error calculating bundle savings:', error);
      throw new SSGError(
        'Failed to calculate bundle savings',
        'getBundlesWithSavings',
        error
      );
    }
  }

  /**
   * Get related bundles for a specific bundle
   */
  static async getRelatedBundles(
    bundleId: string,
    bundleType: string,
    limit = 3
  ): Promise<Bundle[]> {
    try {
      const { data: relatedBundles, error } = await this.client
        .from('bundles')
        .select('*')
        .eq('is_active', true)
        .neq('id', bundleId)
        .eq('bundle_type', bundleType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new SSGError(
          `Failed to fetch related bundles for bundle: ${bundleId}`,
          'getRelatedBundles',
          error
        );
      }

      return relatedBundles || [];
    } catch (error) {
      console.error(`Error fetching related bundles for ${bundleId}:`, error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        `Unexpected error fetching related bundles for: ${bundleId}`,
        'getRelatedBundles',
        error
      );
    }
  }

  /**
   * Get bundles that contain a specific course
   */
  static async getBundlesContainingCourse(courseId: string): Promise<Bundle[]> {
    try {
      const { data: bundles, error } = await this.client
        .from('bundles')
        .select('*')
        .contains('course_ids', [courseId])
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new SSGError(
          `Failed to fetch bundles containing course: ${courseId}`,
          'getBundlesContainingCourse',
          error
        );
      }

      return bundles || [];
    } catch (error) {
      console.error(`Error fetching bundles containing course ${courseId}:`, error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        `Unexpected error fetching bundles for course: ${courseId}`,
        'getBundlesContainingCourse',
        error
      );
    }
  }

  /**
   * Get optimal revalidation settings for bundle pages
   */
  static async getRevalidationSettings(): Promise<{
    bundlesPageRevalidate: number;
    bundleDetailRevalidate: number;
  }> {
    try {
      const lastModified = await this.getContentLastModified();
      const baseRevalidationTime = RevalidationHelper.calculateRevalidationTime(lastModified);

      return {
        bundlesPageRevalidate: baseRevalidationTime,
        bundleDetailRevalidate: baseRevalidationTime * 2,
      };
    } catch (error) {
      console.warn('Error calculating bundle revalidation settings, using defaults:', error);
      const defaultTime = RevalidationHelper.getDefaultRevalidation();
      
      return {
        bundlesPageRevalidate: defaultTime,
        bundleDetailRevalidate: defaultTime * 2,
      };
    }
  }

  /**
   * Validate bundle data integrity
   */
  static async validateBundleData(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: {
      totalBundles: number;
      bundlesWithInvalidCourses: number;
      duplicateSlugs: string[];
      emptyCourseIds: number;
    };
  }> {
    const issues: string[] = [];
    
    try {
      const [allBundles, allCourses] = await Promise.all([
        this.getAllBundles(),
        CourseSSGService.getAllCourses(),
      ]);

      const activeCourseIds = new Set(allCourses.map(course => course.id));
      const slugCounts = new Map<string, number>();
      let bundlesWithInvalidCourses = 0;
      let emptyCourseIds = 0;

      allBundles.forEach(bundle => {
        // Check slug uniqueness
        if (bundle.slug) {
          slugCounts.set(bundle.slug, (slugCounts.get(bundle.slug) || 0) + 1);
        }

        // Check course IDs validity
        if (!bundle.course_ids || bundle.course_ids.length === 0) {
          emptyCourseIds++;
        } else {
          const hasInvalidCourses = bundle.course_ids.some(courseId => 
            !activeCourseIds.has(courseId)
          );
          if (hasInvalidCourses) {
            bundlesWithInvalidCourses++;
          }
        }
      });

      const duplicateSlugs = Array.from(slugCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([slug, _]) => slug);

      // Collect issues
      if (duplicateSlugs.length > 0) {
        issues.push(`Duplicate bundle slugs: ${duplicateSlugs.join(', ')}`);
      }

      if (bundlesWithInvalidCourses > 0) {
        issues.push(`${bundlesWithInvalidCourses} bundles contain invalid course IDs`);
      }

      if (emptyCourseIds > 0) {
        issues.push(`${emptyCourseIds} bundles have no courses`);
      }

      if (allBundles.length === 0) {
        issues.push('No active bundles found');
      }

      return {
        isValid: issues.length === 0,
        issues,
        stats: {
          totalBundles: allBundles.length,
          bundlesWithInvalidCourses,
          duplicateSlugs,
          emptyCourseIds,
        },
      };
    } catch (error) {
      console.error('Error validating bundle data:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stats: {
          totalBundles: 0,
          bundlesWithInvalidCourses: 0,
          duplicateSlugs: [],
          emptyCourseIds: 0,
        },
      };
    }
  }
}