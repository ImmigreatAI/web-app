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

    // Difficulty filter removed per updated requirements

    if (filters?.tags && filters.tags.length > 0) {
      // Filter by tags in metadata
      for (const tag of filters.tags) {
        query = query.contains('metadata->tags', [tag]);
      }
    }

    // Price-based filters removed per updated requirements

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }

    return data || [];
  }

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
}
