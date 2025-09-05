import { BaseService } from './base.service';
import { getServiceClient } from '@/lib/supabase/server';
import { Bundle, BundleWithCourses, CourseCategory } from '@/lib/types';
import { CourseDataService } from './course-data.service';

export interface SimplifiedBundleFilters {
  category?: CourseCategory;
}

export class BundleDataService extends BaseService {
  private courseService: CourseDataService;

  constructor() {
    super();
    this.courseService = new CourseDataService();
  }

  async getAllBundles(filters?: SimplifiedBundleFilters): Promise<Bundle[]> {
    let query = this.supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('bundle_type', filters.category.toLowerCase());
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bundles:', error);
      throw error;
    }

    return data || [];
  }

  async getBundlesByCategory(category: CourseCategory): Promise<Bundle[]> {
    return this.getAllBundles({ category });
  }

  async getBundleBySlug(slug: string): Promise<Bundle | null> {
    const { data, error } = await this.supabase
      .from('bundles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching bundle by slug:', error);
      throw error;
    }

    return data;
  }

  async getBundleById(id: string): Promise<Bundle | null> {
    const { data, error } = await this.supabase
      .from('bundles')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async getBundleWithCourses(bundleId: string): Promise<BundleWithCourses | null> {
    const bundle = await this.getBundleById(bundleId);
    if (!bundle) return null;

    const courses = await this.courseService.getCoursesByIds(bundle.course_ids);

    return {
      ...bundle,
      courses,
    };
  }

  async getBundleWithCoursesBySlug(slug: string): Promise<BundleWithCourses | null> {
    const bundle = await this.getBundleBySlug(slug);
    if (!bundle) return null;

    const courses = await this.courseService.getCoursesByIds(bundle.course_ids);

    return {
      ...bundle,
      courses,
    };
  }

  async getBundlesContainingCourse(courseId: string): Promise<Bundle[]> {
    const { data, error } = await this.supabase
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

  async searchBundles(searchTerm: string, category?: CourseCategory): Promise<Bundle[]> {
    let query = this.supabase
      .from('bundles')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

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
  // STATIC METHODS FOR SSG
  // ========================================

  static async getStaticBundles(): Promise<Bundle[]> {
    const supabase = getServiceClient();
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

  static async getStaticBundleSlugs(): Promise<string[]> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('bundles')
      .select('slug')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching static bundle slugs:', error);
      throw error;
    }

    return (data as any)?.map((bundle: any) => bundle.slug) || [];
  }
}
