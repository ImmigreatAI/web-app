// Static Data Fetcher - Build-time data fetching utilities
import { createClient } from '@supabase/supabase-js';
import { Course, Bundle, CourseCategory } from '@/lib/types';

// Server-only Supabase client for build-time operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for SSG operations');
}

// Build-time only client with service role permissions
const supabaseBuild = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Base class for build-time data fetching
 * Only runs during Next.js build process
 */
export class StaticDataFetcher {
  protected static client = supabaseBuild;

  /**
   * Get all active categories from courses
   * Used to generate category pages dynamically
   */
  static async getAllCategories(): Promise<CourseCategory[]> {
    const { data: courses, error } = await this.client
      .from('courses')
      .select('category')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories for SSG');
    }

    // Get unique categories and sort them
    const categories = [...new Set(courses?.map(course => course.category) || [])];
    
    // Define preferred order for categories
    const categoryOrder: CourseCategory[] = ['EB1A', 'EB2-NIW', 'Other'];
    
    return categoryOrder.filter(cat => categories.includes(cat));
  }

  /**
   * Get all unique series for a category
   * Used for client-side filtering options
   */
  static async getSeriesForCategory(category: CourseCategory): Promise<string[]> {
    const { data: courses, error } = await this.client
      .from('courses')
      .select('series')
      .eq('category', category)
      .eq('is_active', true)
      .not('series', 'is', null);

    if (error) {
      console.error('Error fetching series:', error);
      return [];
    }

    return [...new Set(courses?.map(course => course.series).filter(Boolean) || [])].sort();
  }

  /**
   * Get all unique tags for a category
   * Used for client-side filtering options
   */
  static async getTagsForCategory(category: CourseCategory): Promise<string[]> {
    const { data: courses, error } = await this.client
      .from('courses')
      .select('metadata')
      .eq('category', category)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tags:', error);
      return [];
    }

    const allTags = new Set<string>();
    courses?.forEach(course => {
      const tags = course.metadata?.tags || [];
      tags.forEach((tag: string) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  /**
   * Get revalidation timestamp for content freshness tracking
   */
  static async getContentLastModified(): Promise<Date> {
    const [coursesResult, bundlesResult] = await Promise.all([
      this.client
        .from('courses')
        .select('updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      this.client
        .from('bundles')
        .select('updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
    ]);

    const latestCourse = coursesResult.data?.[0]?.updated_at;
    const latestBundle = bundlesResult.data?.[0]?.updated_at;

    const latestUpdate = [latestCourse, latestBundle]
      .filter(Boolean)
      .sort()
      .pop();

    return latestUpdate ? new Date(latestUpdate) : new Date();
  }

  /**
   * Validate database connection and required tables
   * Called during build to ensure everything is ready
   */
  static async validateDatabaseAccess(): Promise<boolean> {
    try {
      // Test access to required tables
      const tests = await Promise.all([
        this.client.from('courses').select('id').limit(1),
        this.client.from('bundles').select('id').limit(1),
      ]);

      return tests.every(test => !test.error);
    } catch (error) {
      console.error('Database validation failed:', error);
      return false;
    }
  }
}

/**
 * Pre-processed data structure for client-side filtering
 */
export interface PreProcessedCategoryData {
  category: CourseCategory;
  courses: Course[];
  availableSeries: string[];
  availableTags: string[];
  totalCourses: number;
  lastUpdated: string;
}

/**
 * Pre-processed data structure for bundles
 */
export interface PreProcessedBundleData {
  allBundles: Bundle[];
  bundlesByCategory: Record<CourseCategory, Bundle[]>;
  availableCategories: CourseCategory[];
  totalBundles: number;
  lastUpdated: string;
}

/**
 * Build-time data preprocessing utilities
 */
export class DataProcessor {
  /**
   * Process course data for optimal client-side filtering
   */
  static processCourseData(courses: Course[]): {
    byCategory: Record<CourseCategory, Course[]>;
    bySeries: Record<string, Course[]>;
    byTags: Record<string, Course[]>;
  } {
    const byCategory: Record<CourseCategory, Course[]> = {} as any;
    const bySeries: Record<string, Course[]> = {};
    const byTags: Record<string, Course[]> = {};

    courses.forEach(course => {
      // Group by category
      if (!byCategory[course.category]) {
        byCategory[course.category] = [];
      }
      byCategory[course.category].push(course);

      // Group by series
      if (course.series) {
        if (!bySeries[course.series]) {
          bySeries[course.series] = [];
        }
        bySeries[course.series].push(course);
      }

      // Group by tags
      const tags = course.metadata?.tags || [];
      tags.forEach(tag => {
        if (!byTags[tag]) {
          byTags[tag] = [];
        }
        byTags[tag].push(course);
      });
    });

    return { byCategory, bySeries, byTags };
  }

  /**
   * Generate search index for client-side search
   */
  static generateSearchIndex(courses: Course[]): Array<{
    id: string;
    searchableText: string;
    course: Course;
  }> {
    return courses.map(course => ({
      id: course.id,
      searchableText: [
        course.title,
        course.description,
        course.category,
        course.series,
        ...(course.metadata?.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      course,
    }));
  }
}

/**
 * Error types for SSG operations
 */
export class SSGError extends Error {
  constructor(
    message: string, 
    public readonly operation: string,
    public readonly originalError?: unknown
  ) {
    super(`SSG Error [${operation}]: ${message}`);
    this.name = 'SSGError';
  }
}

/**
 * ISR revalidation utilities
 */
export class RevalidationHelper {
  /**
   * Calculate optimal revalidation time based on content update frequency
   */
  static calculateRevalidationTime(lastModified: Date): number {
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
    );

    // More frequent updates for recently changed content
    if (daysSinceUpdate < 1) return 3600; // 1 hour
    if (daysSinceUpdate < 7) return 7200; // 2 hours
    if (daysSinceUpdate < 30) return 14400; // 4 hours
    return 86400; // 24 hours for stable content
  }

  /**
   * Get fallback revalidation time
   */
  static getDefaultRevalidation(): number {
    return 14400; // 4 hours default
  }
}