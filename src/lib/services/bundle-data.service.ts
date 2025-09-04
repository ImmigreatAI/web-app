import { createPublicClient } from '@/lib/supabase/server';
import { Bundle, BundleWithCourses, CourseCategory } from '@/lib/types';
import { CourseDataService } from './course-data.service';

// Simplified Bundle Filters - Only category-based
export interface SimplifiedBundleFilters {
  category?: CourseCategory; // 'EB1A' | 'EB2-NIW' | 'Other'
}

export class BundleDataService {
  private courseService: CourseDataService;

  constructor() {
    // Use public client since bundles are public data
    this.courseService = new CourseDataService(false); // Not authenticated
  }

  private getSupabaseClient() {
    return createPublicClient();
  }

  /**
   * Get all bundles with simplified category-based filtering
   */
  async getAllBundles(filters?: SimplifiedBundleFilters): Promise<Bundle[]> {
    const supabase = this.getSupabaseClient();
    let query = supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Only apply category filter if provided
    if (filters?.category) {
      // Assuming bundle_type maps to category (e.g., 'eb1a', 'eb2-niw', 'other')
      query = query.eq('bundle_type', filters.category.toLowerCase());
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bundles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get bundles by category - main filtering method
   */
  async getBundlesByCategory(category: CourseCategory): Promise<Bundle[]> {
    return this.getAllBundles({ category });
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

  /**
   * Get bundles containing a specific course - useful for cross-selling
   */
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

  /**
   * Simple search within bundles - title and description only
   */
  async searchBundles(searchTerm: string, category?: CourseCategory): Promise<Bundle[]> {
    const supabase = this.getSupabaseClient();
    let query = supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    // Optionally filter by category during search
    if (category) {
      query = query.eq('bundle_type', category.toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching bundles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get available categories from bundles - for dynamic navigation
   */
  async getAvailableCategories(): Promise<CourseCategory[]> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('bundle_type')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching bundle categories:', error);
      throw error;
    }

    // Convert bundle_type to CourseCategory and remove duplicates
    const categories = Array.from(
      new Set(
        data?.map(bundle => {
          const bundleType = bundle.bundle_type;
          // Map bundle_type to CourseCategory
          switch (bundleType.toLowerCase()) {
            case 'eb1a':
              return 'EB1A';
            case 'eb2-niw':
              return 'EB2-NIW';
            case 'other':
              return 'Other';
            default:
              return 'Other';
          }
        }) || []
      )
    );

    return categories as CourseCategory[];
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

  // ========================================
  // SSG-COMPATIBLE STATIC METHODS
  // ========================================

  /**
   * Static method for build-time bundle fetching (SSG)
   */
  static async getStaticBundles(): Promise<Bundle[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching static bundles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Static method to get all bundle slugs for generateStaticParams
   */
  static async getStaticBundleSlugs(): Promise<string[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('slug')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching static bundle slugs:', error);
      throw error;
    }

    return data?.map(bundle => bundle.slug) || [];
  }

  /**
   * Static method to get available categories for navigation generation
   */
  static async getStaticCategories(): Promise<CourseCategory[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('bundle_type')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching static categories:', error);
      return ['EB1A', 'EB2-NIW', 'Other']; // Fallback
    }

    // Convert and deduplicate categories
    const categories = Array.from(
      new Set(
        data?.map(bundle => {
          const bundleType = bundle.bundle_type;
          switch (bundleType.toLowerCase()) {
            case 'eb1a':
              return 'EB1A';
            case 'eb2-niw':
              return 'EB2-NIW';
            case 'other':
              return 'Other';
            default:
              return 'Other';
          }
        }) || []
      )
    );

    return categories as CourseCategory[];
  }

  /**
   * Client-side filtering helper for pre-loaded bundles
   */
  static filterBundlesClientSide(
    bundles: Bundle[],
    filters: {
      category?: CourseCategory;
      searchTerm?: string;
    }
  ): Bundle[] {
    let filtered = bundles;

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(bundle => 
        bundle.bundle_type.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(bundle =>
        bundle.title.toLowerCase().includes(term) ||
        (bundle.description?.toLowerCase().includes(term) ?? false)
      );
    }

    return filtered;
  }
}