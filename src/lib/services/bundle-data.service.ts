import { createPublicClient } from '@/lib/supabase/server';
import { Bundle, BundleFilters, BundleWithCourses } from '@/lib/types';
import { CourseDataService } from './course-data.service';

export class BundleDataService {
  private courseService: CourseDataService;

  constructor() {
    // Use public client since bundles are public data
    this.courseService = new CourseDataService(false); // Not authenticated
  }

  private getSupabaseClient() {
    return createPublicClient();
  }

  async getAllBundles(filters?: BundleFilters): Promise<Bundle[]> {
    const supabase = this.getSupabaseClient();
    let query = supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.bundle_type) {
      query = query.eq('bundle_type', filters.bundle_type);
    }

    if (filters?.featured !== undefined) {
      query = query.eq('metadata->>featured', filters.featured);
    }

    if (filters?.minPrice) {
      query = query.gte('pricing->price', filters.minPrice);
    }

    if (filters?.maxPrice) {
      query = query.lte('pricing->price', filters.maxPrice);
    }

    if (filters?.courseCount) {
      query = query.eq('metadata->>courses_count', filters.courseCount);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bundles:', error);
      throw error;
    }

    return data || [];
  }

  async getBundleBySlug(slug: string): Promise<Bundle | null> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching bundle by slug:', error);
      throw error;
    }

    return data;
  }

  async getBundleById(id: string): Promise<Bundle | null> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching bundle by ID:', error);
      throw error;
    }

    return data;
  }

  async getBundleWithCourses(bundleId: string): Promise<BundleWithCourses | null> {
    // Get bundle first
    const bundle = await this.getBundleById(bundleId);
    if (!bundle) return null;

    // Get all courses in the bundle
    const courses = await this.courseService.getCoursesByIds(bundle.course_ids);

    return {
      ...bundle,
      courses,
    };
  }

  async getBundleWithCoursesBySlug(slug: string): Promise<BundleWithCourses | null> {
    // Get bundle first
    const bundle = await this.getBundleBySlug(slug);
    if (!bundle) return null;

    // Get all courses in the bundle
    const courses = await this.courseService.getCoursesByIds(bundle.course_ids);

    return {
      ...bundle,
      courses,
    };
  }

  async getFeaturedBundles(): Promise<Bundle[]> {
    return this.getAllBundles({ featured: true });
  }

  async getBundlesByType(bundleType: string): Promise<Bundle[]> {
    return this.getAllBundles({ bundle_type: bundleType as any });
  }

  async getBundlesContainingCourse(courseId: string): Promise<Bundle[]> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .contains('course_ids', [courseId])
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bundles containing course:', error);
      throw error;
    }

    return data || [];
  }

  async searchBundles(searchTerm: string): Promise<Bundle[]> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching bundles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Calculate bundle savings compared to individual course purchases
   */
  calculateBundleSavings(bundle: BundleWithCourses): {
    totalIndividualPrice: number;
    bundlePrice: number;
    savings: number;
    savingsPercentage: number;
  } {
    const totalIndividualPrice = bundle.courses.reduce((sum, course) => {
      const price = course.pricing.sale_price || course.pricing.base_price;
      return sum + price;
    }, 0);

    const bundlePrice = bundle.pricing.price;
    const savings = totalIndividualPrice - bundlePrice;
    const savingsPercentage = totalIndividualPrice > 0 ? (savings / totalIndividualPrice) * 100 : 0;

    return {
      totalIndividualPrice,
      bundlePrice,
      savings,
      savingsPercentage: Math.round(savingsPercentage),
    };
  }
}