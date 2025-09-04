// Course SSG Service - Build-time course data fetching
import { Course, CourseCategory } from '@/lib/types';
import { 
  StaticDataFetcher, 
  PreProcessedCategoryData, 
  DataProcessor,
  SSGError,
  RevalidationHelper 
} from './static-data-fetcher';

/**
 * Course-specific SSG service for build-time data fetching
 * Optimized for static site generation and client-side filtering
 */
export class CourseSSGService extends StaticDataFetcher {
  
  /**
   * Get all courses for static site generation
   * This is the primary method for fetching course data at build time
   */
  static async getAllCourses(): Promise<Course[]> {
    try {
      const { data: courses, error } = await this.client
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new SSGError('Failed to fetch courses', 'getAllCourses', error);
      }

      return courses || [];
    } catch (error) {
      console.error('Error in CourseSSGService.getAllCourses:', error);
      throw error instanceof SSGError ? error : new SSGError(
        'Unexpected error fetching courses',
        'getAllCourses', 
        error
      );
    }
  }

  /**
   * Get courses for a specific category
   * Used for category-specific pages
   */
  static async getCoursesByCategory(category: CourseCategory): Promise<Course[]> {
    try {
      const { data: courses, error } = await this.client
        .from('courses')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new SSGError(
          `Failed to fetch courses for category: ${category}`, 
          'getCoursesByCategory',
          error
        );
      }

      return courses || [];
    } catch (error) {
      console.error(`Error fetching courses for category ${category}:`, error);
      throw error instanceof SSGError ? error : new SSGError(
        `Unexpected error fetching courses for category: ${category}`,
        'getCoursesByCategory',
        error
      );
    }
  }

  /**
   * Get a single course by slug for static generation
   */
  static async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const { data: course, error } = await this.client
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - course not found
          return null;
        }
        throw new SSGError(
          `Failed to fetch course with slug: ${slug}`,
          'getCourseBySlug',
          error
        );
      }

      return course;
    } catch (error) {
      console.error(`Error fetching course by slug ${slug}:`, error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        `Unexpected error fetching course: ${slug}`,
        'getCourseBySlug',
        error
      );
    }
  }

  /**
   * Generate static parameters for all course pages
   * Used by Next.js generateStaticParams
   */
  static async generateCourseParams(): Promise<Array<{ courseSlug: string }>> {
    try {
      const { data: courses, error } = await this.client
        .from('courses')
        .select('slug')
        .eq('is_active', true);

      if (error) {
        throw new SSGError('Failed to generate course parameters', 'generateCourseParams', error);
      }

      return (courses || []).map(course => ({
        courseSlug: course.slug,
      }));
    } catch (error) {
      console.error('Error generating course parameters:', error);
      throw error instanceof SSGError ? error : new SSGError(
        'Unexpected error generating course parameters',
        'generateCourseParams',
        error
      );
    }
  }

  /**
   * Generate static parameters for category pages
   * Used by Next.js generateStaticParams for /courses/[categorySlug]
   */
  static async generateCategoryParams(): Promise<Array<{ categorySlug: string }>> {
    try {
      const categories = await this.getAllCategories();
      
      // Convert category names to URL-friendly slugs
      const categorySlugMap: Record<CourseCategory, string> = {
        'EB1A': 'eb1a',
        'EB2-NIW': 'eb2-niw', 
        'Other': 'other',
      };

      return categories.map(category => ({
        categorySlug: categorySlugMap[category] || category.toLowerCase(),
      }));
    } catch (error) {
      console.error('Error generating category parameters:', error);
      throw new SSGError(
        'Failed to generate category parameters',
        'generateCategoryParams',
        error
      );
    }
  }

  /**
   * Get pre-processed category data for optimal client-side performance
   * Includes all data needed for filtering and display
   */
  static async getPreProcessedCategoryData(category: CourseCategory): Promise<PreProcessedCategoryData> {
    try {
      const [courses, availableSeries, availableTags, lastModified] = await Promise.all([
        this.getCoursesByCategory(category),
        this.getSeriesForCategory(category),
        this.getTagsForCategory(category),
        this.getContentLastModified(),
      ]);

      return {
        category,
        courses,
        availableSeries,
        availableTags,
        totalCourses: courses.length,
        lastUpdated: lastModified.toISOString(),
      };
    } catch (error) {
      console.error(`Error pre-processing category data for ${category}:`, error);
      throw new SSGError(
        `Failed to pre-process data for category: ${category}`,
        'getPreProcessedCategoryData',
        error
      );
    }
  }

  /**
   * Get courses discovery data for the main /courses page
   * Includes category overviews and featured content
   */
  static async getCoursesDiscoveryData(): Promise<{
    categories: CourseCategory[];
    categoryOverviews: Array<{
      category: CourseCategory;
      courseCount: number;
      featuredCourses: Course[];
      series: string[];
    }>;
    recentCourses: Course[];
    totalCourses: number;
    lastUpdated: string;
  }> {
    try {
      const [allCourses, categories, lastModified] = await Promise.all([
        this.getAllCourses(),
        this.getAllCategories(),
        this.getContentLastModified(),
      ]);

      // Process data by category
      const { byCategory } = DataProcessor.processCourseData(allCourses);

      const categoryOverviews = await Promise.all(
        categories.map(async (category) => {
          const categoryCourses = byCategory[category] || [];
          const series = await this.getSeriesForCategory(category);
          
          return {
            category,
            courseCount: categoryCourses.length,
            featuredCourses: categoryCourses.slice(0, 3), // Top 3 courses for preview
            series,
          };
        })
      );

      // Get recent courses (last 6)
      const recentCourses = allCourses
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);

      return {
        categories,
        categoryOverviews,
        recentCourses,
        totalCourses: allCourses.length,
        lastUpdated: lastModified.toISOString(),
      };
    } catch (error) {
      console.error('Error getting courses discovery data:', error);
      throw new SSGError(
        'Failed to fetch courses discovery data',
        'getCoursesDiscoveryData',
        error
      );
    }
  }

  /**
   * Get related courses for a specific course
   * Used on course detail pages
   */
  static async getRelatedCourses(
    courseId: string,
    category: CourseCategory,
    series?: string | null
  ): Promise<Course[]> {
    try {
      let query = this.client
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .neq('id', courseId) // Exclude current course
        .eq('category', category);

      // Prioritize courses from same series
      if (series) {
        query = query.eq('series', series);
      }

      const { data: relatedCourses, error } = await query
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        throw new SSGError(
          `Failed to fetch related courses for course: ${courseId}`,
          'getRelatedCourses',
          error
        );
      }

      return relatedCourses || [];
    } catch (error) {
      console.error(`Error fetching related courses for ${courseId}:`, error);
      if (error instanceof SSGError) throw error;
      throw new SSGError(
        `Unexpected error fetching related courses for: ${courseId}`,
        'getRelatedCourses',
        error
      );
    }
  }

  /**
   * Get optimal revalidation settings for course pages
   */
  static async getRevalidationSettings(): Promise<{
    coursesPageRevalidate: number;
    categoryPageRevalidate: number;
    courseDetailRevalidate: number;
  }> {
    try {
      const lastModified = await this.getContentLastModified();
      const baseRevalidationTime = RevalidationHelper.calculateRevalidationTime(lastModified);

      return {
        coursesPageRevalidate: baseRevalidationTime, // Main discovery page
        categoryPageRevalidate: baseRevalidationTime * 1.5, // Category pages change less frequently
        courseDetailRevalidate: baseRevalidationTime * 2, // Individual courses change least frequently
      };
    } catch (error) {
      console.warn('Error calculating revalidation settings, using defaults:', error);
      const defaultTime = RevalidationHelper.getDefaultRevalidation();
      
      return {
        coursesPageRevalidate: defaultTime,
        categoryPageRevalidate: defaultTime * 1.5,
        courseDetailRevalidate: defaultTime * 2,
      };
    }
  }

  /**
   * Validate course data integrity for build process
   */
  static async validateCourseData(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: {
      totalCourses: number;
      coursesByCategory: Record<CourseCategory, number>;
      coursesWithoutSlugs: number;
      duplicateSlugs: string[];
    };
  }> {
    const issues: string[] = [];
    
    try {
      const allCourses = await this.getAllCourses();
      const categories = await this.getAllCategories();

      // Basic stats
      const { byCategory } = DataProcessor.processCourseData(allCourses);
      const coursesByCategory = Object.fromEntries(
        categories.map(cat => [cat, (byCategory[cat] || []).length])
      ) as Record<CourseCategory, number>;

      // Validation checks
      const coursesWithoutSlugs = allCourses.filter(course => !course.slug).length;
      const slugCounts = new Map<string, number>();
      
      allCourses.forEach(course => {
        if (course.slug) {
          slugCounts.set(course.slug, (slugCounts.get(course.slug) || 0) + 1);
        }
      });

      const duplicateSlugs = Array.from(slugCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([slug, _]) => slug);

      // Collect issues
      if (coursesWithoutSlugs > 0) {
        issues.push(`${coursesWithoutSlugs} courses missing slugs`);
      }

      if (duplicateSlugs.length > 0) {
        issues.push(`Duplicate slugs found: ${duplicateSlugs.join(', ')}`);
      }

      if (allCourses.length === 0) {
        issues.push('No active courses found');
      }

      return {
        isValid: issues.length === 0,
        issues,
        stats: {
          totalCourses: allCourses.length,
          coursesByCategory,
          coursesWithoutSlugs,
          duplicateSlugs,
        },
      };
    } catch (error) {
      console.error('Error validating course data:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stats: {
          totalCourses: 0,
          coursesByCategory: {} as Record<CourseCategory, number>,
          coursesWithoutSlugs: 0,
          duplicateSlugs: [],
        },
      };
    }
  }
}