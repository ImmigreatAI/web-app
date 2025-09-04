import { createPublicClient, createClient as createServerClient } from '@/lib/supabase/server';
import { Course, CourseFilters } from '@/lib/types';

export class CourseDataService {
  private isAuthenticated: boolean;

  constructor(authenticated = false) {
    this.isAuthenticated = authenticated;
  }

  private async getSupabaseClient() {
    return this.isAuthenticated ? await createServerClient() : createPublicClient();
  }

  // ========================================
  // EXISTING RUNTIME METHODS (Keep for user-specific operations)
  // ========================================

  /**
   * Get all courses with filters - RUNTIME VERSION
   * Used for authenticated operations and API routes
   */
  async getAllCourses(filters?: CourseFilters): Promise<Course[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.series) {
      query = query.eq('series', filters.series);
    }

    if (filters?.tags && filters.tags.length > 0) {
      // Filter by tags in metadata
      for (const tag of filters.tags) {
        query = query.contains('metadata->tags', [tag]);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get course by slug - RUNTIME VERSION
   * Used for API routes and authenticated operations
   */
  async getCourseBySlug(slug: string): Promise<Course | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching course by slug:', error);
      throw error;
    }

    return data;
  }

  async getCourseById(id: string): Promise<Course | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching course by ID:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get courses by IDs - RUNTIME VERSION
   * Used for bundle operations and cart validation
   */
  async getCoursesByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .in('id', ids)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching courses by IDs:', error);
      throw error;
    }

    return data || [];
  }

  async getCoursesByCategory(category: string): Promise<Course[]> {
    return this.getAllCourses({ category: category as any });
  }

  async getCoursesBySeries(category: string, series: string): Promise<Course[]> {
    return this.getAllCourses({ category: category as any, series });
  }

  /**
   * Search courses - RUNTIME VERSION
   * Used for API search operations
   */
  async searchCourses(searchTerm: string): Promise<Course[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching courses:', error);
      throw error;
    }

    return data || [];
  }

  // ========================================
  // NEW SSG-COMPATIBLE METHODS
  // ========================================

  /**
   * Get courses optimized for SSG build process
   * Uses minimal database connections and bulk operations
   */
  static async getAllCoursesForSSG(): Promise<Course[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SSG Error fetching courses:', error);
      throw new Error(`SSG course fetch failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get course by slug optimized for SSG
   */
  static async getCourseBySlugForSSG(slug: string): Promise<Course | null> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('SSG Error fetching course by slug:', error);
      throw new Error(`SSG course fetch failed: ${error.message}`);
    }

    return data;
  }

  // ========================================
  // CLIENT-SIDE FILTERING HELPERS
  // ========================================

  /**
   * Pre-process courses for optimal client-side filtering
   */
  static preprocessCoursesForClientFiltering(courses: Course[]): {
    coursesByCategory: Record<string, Course[]>;
    coursesBySeries: Record<string, Course[]>;
    coursesByTags: Record<string, Course[]>;
    allSeries: string[];
    allTags: string[];
    searchIndex: Array<{ id: string; searchText: string; course: Course }>;
  } {
    const coursesByCategory: Record<string, Course[]> = {};
    const coursesBySeries: Record<string, Course[]> = {};
    const coursesByTags: Record<string, Course[]> = {};
    const allSeries = new Set<string>();
    const allTags = new Set<string>();
    const searchIndex: Array<{ id: string; searchText: string; course: Course }> = [];

    courses.forEach(course => {
      // Group by category
      if (!coursesByCategory[course.category]) {
        coursesByCategory[course.category] = [];
      }
      coursesByCategory[course.category].push(course);

      // Group by series
      if (course.series) {
        allSeries.add(course.series);
        if (!coursesBySeries[course.series]) {
          coursesBySeries[course.series] = [];
        }
        coursesBySeries[course.series].push(course);
      }

      // Group by tags
      const tags = course.metadata?.tags || [];
      tags.forEach(tag => {
        allTags.add(tag);
        if (!coursesByTags[tag]) {
          coursesByTags[tag] = [];
        }
        coursesByTags[tag].push(course);
      });

      // Build search index
      const searchText = [
        course.title,
        course.description,
        course.category,
        course.series,
        ...(tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      searchIndex.push({
        id: course.id,
        searchText,
        course,
      });
    });

    return {
      coursesByCategory,
      coursesBySeries,
      coursesByTags,
      allSeries: Array.from(allSeries).sort(),
      allTags: Array.from(allTags).sort(),
      searchIndex,
    };
  }

  /**
   * Client-side filter implementation for pre-loaded courses
   */
  static filterCourses(
    courses: Course[],
    filters: CourseFilters & { searchTerm?: string }
  ): Course[] {
    let filtered = [...courses];

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(course => course.category === filters.category);
    }

    // Apply series filter
    if (filters.series) {
      filtered = filtered.filter(course => course.series === filters.series);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(course => {
        const courseTags = course.metadata?.tags || [];
        return filters.tags!.some(tag => courseTags.includes(tag));
      });
    }

    // Apply search filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(course => {
        const searchableText = [
          course.title,
          course.description,
          course.category,
          course.series,
          ...(course.metadata?.tags || [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        return searchableText.includes(searchTerm);
      });
    }

    return filtered;
  }

  /**
   * Get filter options from pre-loaded courses
   */
  static getFilterOptions(courses: Course[]): {
    categories: string[];
    seriesByCategory: Record<string, string[]>;
    tagsByCategory: Record<string, string[]>;
  } {
    const categories = new Set<string>();
    const seriesByCategory: Record<string, Set<string>> = {};
    const tagsByCategory: Record<string, Set<string>> = {};

    courses.forEach(course => {
      categories.add(course.category);

      // Series by category
      if (!seriesByCategory[course.category]) {
        seriesByCategory[course.category] = new Set();
      }
      if (course.series) {
        seriesByCategory[course.category].add(course.series);
      }

      // Tags by category
      if (!tagsByCategory[course.category]) {
        tagsByCategory[course.category] = new Set();
      }
      const tags = course.metadata?.tags || [];
      tags.forEach(tag => tagsByCategory[course.category].add(tag));
    });

    // Convert Sets to sorted arrays
    const result = {
      categories: Array.from(categories).sort(),
      seriesByCategory: {} as Record<string, string[]>,
      tagsByCategory: {} as Record<string, string[]>,
    };

    Object.keys(seriesByCategory).forEach(category => {
      result.seriesByCategory[category] = Array.from(seriesByCategory[category]).sort();
    });

    Object.keys(tagsByCategory).forEach(category => {
      result.tagsByCategory[category] = Array.from(tagsByCategory[category]).sort();
    });

    return result;
  }

  // ========================================
  // DATA VALIDATION FOR SSG
  // ========================================

  /**
   * Validate courses data for SSG build process
   */
  static validateCoursesForSSG(courses: Course[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (courses.length === 0) {
      errors.push('No courses found for SSG build');
      return { isValid: false, errors, warnings };
    }

    const slugs = new Set<string>();
    const categories = new Set<string>();

    courses.forEach((course, index) => {
      // Check required fields
      if (!course.slug) {
        errors.push(`Course at index ${index} missing slug`);
      } else if (slugs.has(course.slug)) {
        errors.push(`Duplicate slug found: ${course.slug}`);
      } else {
        slugs.add(course.slug);
      }

      if (!course.title) {
        errors.push(`Course at index ${index} missing title`);
      }

      if (!course.category) {
        errors.push(`Course at index ${index} missing category`);
      } else {
        categories.add(course.category);
      }

      // Check pricing
      if (!course.pricing?.base_price || course.pricing.base_price <= 0) {
        warnings.push(`Course ${course.slug} has invalid pricing`);
      }

      // Check enrollment IDs
      if (!course.enrollment_ids?.three_month) {
        warnings.push(`Course ${course.slug} missing enrollment IDs`);
      }
    });

    if (categories.size === 0) {
      warnings.push('No categories found in courses');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}