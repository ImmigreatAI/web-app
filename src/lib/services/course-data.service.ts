import { BaseService } from './base.service';
import { getServiceClient } from '@/lib/supabase/server';
import { Course, CourseFilters } from '@/lib/types';

export class CourseDataService extends BaseService {
  // No constructor needed - uses BaseService

  /**
   * Get all courses with filters
   */
  async getAllCourses(filters?: CourseFilters): Promise<Course[]> {
    let query = this.supabase
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
   * Get course by slug
   */
  async getCourseBySlug(slug: string): Promise<Course | null> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching course by slug:', error);
      throw error;
    }

    return data;
  }

  async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching course by ID:', error);
      throw error;
    }

    return data;
  }

  async getCoursesByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
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

  async searchCourses(searchTerm: string): Promise<Course[]> {
    const { data, error } = await this.supabase
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
  // STATIC METHODS FOR SSG (No authentication needed)
  // ========================================

  /**
   * Static method for SSG - uses single database connection
   */
  static async getAllCoursesForSSG(): Promise<Course[]> {
    const supabase = getServiceClient(); // Use service client for SSG
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

  static async getCourseBySlugForSSG(slug: string): Promise<Course | null> {
    const supabase = getServiceClient();
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
  // CLIENT-SIDE FILTERING HELPERS (Keep these - they're useful)
  // ========================================

  static filterCourses(
    courses: Course[],
    filters: CourseFilters & { searchTerm?: string }
  ): Course[] {
    let filtered = [...courses];

    if (filters.category) {
      filtered = filtered.filter(course => course.category === filters.category);
    }

    if (filters.series) {
      filtered = filtered.filter(course => course.series === filters.series);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(course => {
        const courseTags = course.metadata?.tags || [];
        return filters.tags!.some(tag => courseTags.includes(tag));
      });
    }

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

      if (!seriesByCategory[course.category]) {
        seriesByCategory[course.category] = new Set();
      }
      if (course.series) {
        seriesByCategory[course.category].add(course.series);
      }

      if (!tagsByCategory[course.category]) {
        tagsByCategory[course.category] = new Set();
      }
      const tags = course.metadata?.tags || [];
      tags.forEach(tag => tagsByCategory[course.category].add(tag));
    });

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
}
