import { createClient as createServerClient } from '@/lib/supabase/server';
import { EnrollmentInfo, UserPurchase } from '@/lib/types';

export class EnrollmentService {

  constructor() {
    // Always use authenticated client for enrollment operations
  }

  private async getSupabaseClient() {
    return await createServerClient();
  }

  /**
   * Check if user owns a specific course (directly or via bundle)
   */
  async checkCourseOwnership(clerkId: string, courseId: string): Promise<EnrollmentInfo> {
    const supabase = await this.getSupabaseClient();

    try {
      // Check direct course ownership first
      const { data: directPurchase, error: directError } = await supabase
        .from('user_purchases')
        .select('expires_at, enrollment_status')
        .eq('clerk_id', clerkId)
        .eq('item_id', courseId)
        .eq('purchase_type', 'course')
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (directError && directError.code !== 'PGRST116') {
        throw directError;
      }

      if (directPurchase) {
        return {
          owns_course: true,
          access_type: 'direct',
          expires_at: directPurchase.expires_at,
          bundle_id: null,
        };
      }

      // Check bundle ownership
      const { data: bundlePurchases, error: bundleError } = await supabase
        .from('user_purchases')
        .select(`
          item_id,
          expires_at,
          bundles!inner(course_ids)
        `)
        .eq('clerk_id', clerkId)
        .eq('purchase_type', 'bundle')
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString());

      if (bundleError) {
        throw bundleError;
      }

      // Check if any bundle contains the course
      for (const purchase of bundlePurchases || []) {
        const bundle = purchase.bundles as any;
        if (bundle?.course_ids?.includes(courseId)) {
          return {
            owns_course: true,
            access_type: 'bundle',
            expires_at: purchase.expires_at,
            bundle_id: purchase.item_id,
          };
        }
      }

      // No ownership found
      return {
        owns_course: false,
        access_type: 'none',
        expires_at: null,
        bundle_id: null,
      };

    } catch (error) {
      console.error('Error checking course ownership:', error);
      throw error;
    }
  }

  /**
   * Get all active enrollments for a user
   */
  async getUserEnrollments(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .gte('expires_at', new Date().toISOString())
        .eq('enrollment_status', 'completed')
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user enrollments:', error);
      throw error;
    }
  }

  /**
   * Get all purchases (including expired) for a user
   */
  async getUserPurchaseHistory(clerkId: string): Promise<UserPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('clerk_id', clerkId)
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user purchase history:', error);
      throw error;
    }
  }

  /**
   * Check multiple courses ownership at once
   */
  async checkMultipleCourseOwnership(
    clerkId: string, 
    courseIds: string[]
  ): Promise<Record<string, EnrollmentInfo>> {
    const results: Record<string, EnrollmentInfo> = {};

    // Check ownership for each course
    for (const courseId of courseIds) {
      try {
        results[courseId] = await this.checkCourseOwnership(clerkId, courseId);
      } catch (error) {
        console.error(`Error checking ownership for course ${courseId}:`, error);
        results[courseId] = {
          owns_course: false,
          access_type: 'none',
          expires_at: null,
          bundle_id: null,
        };
      }
    }

    return results;
  }

  /**
   * Get courses owned by user (directly or via bundles)
   */
  async getOwnedCourses(clerkId: string): Promise<string[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get direct course purchases
      const { data: directPurchases, error: directError } = await supabase
        .from('user_purchases')
        .select('item_id')
        .eq('clerk_id', clerkId)
        .eq('purchase_type', 'course')
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString());

      if (directError) {
        throw directError;
      }

      // Get bundle purchases and their course IDs
      const { data: bundlePurchases, error: bundleError } = await supabase
        .from('user_purchases')
        .select(`
          bundles!inner(course_ids)
        `)
        .eq('clerk_id', clerkId)
        .eq('purchase_type', 'bundle')
        .eq('enrollment_status', 'completed')
        .gte('expires_at', new Date().toISOString());

      if (bundleError) {
        throw bundleError;
      }

      // Combine direct and bundle course IDs
      const directCourseIds = directPurchases?.map(p => p.item_id) || [];
      const bundleCourseIds = bundlePurchases?.flatMap(p => (p.bundles as any)?.course_ids || []) || [];

      // Return unique course IDs
      return [...new Set([...directCourseIds, ...bundleCourseIds])];

    } catch (error) {
      console.error('Error getting owned courses:', error);
      throw error;
    }
  }
}