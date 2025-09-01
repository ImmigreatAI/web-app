import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { 
  UserPurchase, 
  UserEnrollment, 
  PurchaseWithEnrollments, 
  EnrollmentWithPurchase,
  CourseAccessInfo,
  ProcessingStatus,
  PurchaseItemsData
} from '@/lib/types';

export class PurchaseTrackingService {
  private serviceClient;

  constructor() {
    this.serviceClient = createServiceClient(); // For admin operations
  }

  private async getSupabaseClient() {
    return await createServerClient();
  }

  // ========================================
  // PURCHASE METHODS
  // ========================================

  /**
   * Get all purchases for a user
   */
  async getUserPurchases(clerkId: string): Promise<UserPurchase[]> {
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
      console.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  /**
   * Get purchase by ID (user must own it)
   */
  async getPurchaseById(clerkId: string, purchaseId: string): Promise<UserPurchase | null> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('clerk_id', clerkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching purchase by ID:', error);
      throw error;
    }
  }

  /**
   * Get purchases with enrollment details
   */
  async getUserPurchasesWithEnrollments(clerkId: string): Promise<PurchaseWithEnrollments[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          *,
          enrollments:user_enrollments(*)
        `)
        .eq('clerk_id', clerkId)
        .order('purchased_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(purchase => ({
        ...purchase,
        enrollments: purchase.enrollments || [],
        enrollment_count: purchase.enrollments?.length || 0,
        active_enrollment_count: purchase.enrollments?.filter(
          (e: UserEnrollment) => e.is_active && new Date(e.expires_at) > new Date()
        ).length || 0,
      }));
    } catch (error) {
      console.error('Error fetching purchases with enrollments:', error);
      throw error;
    }
  }

  /**
   * Update purchase processing status
   */
  async updatePurchaseStatus(
    purchaseId: string,
    status: ProcessingStatus,
    queueMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status,
        updated_at: new Date().toISOString(),
      };

      if (queueMetadata) {
        updateData.queue_metadata = queueMetadata;
      }

      if (status === 'processing') {
        updateData.processing_started_at = new Date().toISOString();
      } else if (['completed', 'failed', 'partial'].includes(status)) {
        updateData.processing_completed_at = new Date().toISOString();
      }

      const { error } = await this.serviceClient
        .from('user_purchases')
        .update(updateData)
        .eq('id', purchaseId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
      throw error;
    }
  }

  // ========================================
  // ENROLLMENT METHODS
  // ========================================

  /**
   * Get all active enrollments for a user
   */
  async getUserActiveEnrollments(clerkId: string): Promise<UserEnrollment[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching active enrollments:', error);
      throw error;
    }
  }

  /**
   * Get all enrollments (including expired) for a user
   */
  async getUserAllEnrollments(clerkId: string): Promise<UserEnrollment[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .order('enrolled_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all enrollments:', error);
      throw error;
    }
  }

  /**
   * Get enrollments with purchase context (for My Purchases page)
   */
  async getUserEnrollmentsWithPurchase(clerkId: string): Promise<EnrollmentWithPurchase[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select(`
          *,
          purchase:user_purchases!inner(
            purchased_at,
            amount_paid,
            stripe_session_id
          )
        `)
        .eq('clerk_id', clerkId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('enrolled_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching enrollments with purchase:', error);
      throw error;
    }
  }

  /**
   * Check course access for a user
   */
  async checkCourseAccess(clerkId: string, courseId: string): Promise<CourseAccessInfo> {
    const supabase = await this.getSupabaseClient();

    try {
      // Check direct course enrollment
      const { data: directEnrollment, error: directError } = await supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('enrollment_type', 'course')
        .eq('item_id', courseId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (directError && directError.code !== 'PGRST116') {
        throw directError;
      }

      if (directEnrollment) {
        return {
          has_access: true,
          access_type: 'direct',
          expires_at: directEnrollment.expires_at,
          enrollment_id: directEnrollment.id,
          days_until_expiry: this.calculateDaysUntilExpiry(directEnrollment.expires_at),
          bundle_id: null,
          purchase_id: directEnrollment.purchase_id,
        };
      }

      // Check bundle enrollment
      const { data: bundleEnrollments, error: bundleError } = await supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('enrollment_type', 'bundle')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());

      if (bundleError) {
        throw bundleError;
      }

      // Check if any bundle contains the course
      for (const enrollment of bundleEnrollments || []) {
        if (enrollment.bundle_courses?.included_courses) {
          const courseFound = enrollment.bundle_courses.included_courses.some(
            (course: any) => course.course_id === courseId
          );
          
          if (courseFound) {
            return {
              has_access: true,
              access_type: 'bundle',
              expires_at: enrollment.expires_at,
              enrollment_id: enrollment.id,
              days_until_expiry: this.calculateDaysUntilExpiry(enrollment.expires_at),
              bundle_id: enrollment.item_id,
              purchase_id: enrollment.purchase_id,
            };
          }
        }
      }

      // No access found
      return {
        has_access: false,
        access_type: 'none',
        expires_at: null,
        enrollment_id: null,
        days_until_expiry: null,
        bundle_id: null,
        purchase_id: null,
      };

    } catch (error) {
      console.error('Error checking course access:', error);
      throw error;
    }
  }

  /**
   * Check multiple courses access at once
   */
  async checkMultipleCourseAccess(
    clerkId: string, 
    courseIds: string[]
  ): Promise<Record<string, CourseAccessInfo>> {
    const results: Record<string, CourseAccessInfo> = {};

    // Check access for each course
    for (const courseId of courseIds) {
      try {
        results[courseId] = await this.checkCourseAccess(clerkId, courseId);
      } catch (error) {
        console.error(`Error checking access for course ${courseId}:`, error);
        results[courseId] = {
          has_access: false,
          access_type: 'none',
          expires_at: null,
          enrollment_id: null,
          days_until_expiry: null,
          bundle_id: null,
          purchase_id: null,
        };
      }
    }

    return results;
  }

  /**
   * Get enrollments expiring soon
   */
  async getEnrollmentsExpiringSoon(
    clerkId: string, 
    daysAhead: number = 30
  ): Promise<UserEnrollment[]> {
    const supabase = await this.getSupabaseClient();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', futureDate.toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching expiring enrollments:', error);
      throw error;
    }
  }

  // ========================================
  // ADMIN/QUEUE METHODS (Service Client)
  // ========================================

  /**
   * Create enrollment record (used by queue system)
   */
  async createEnrollment(enrollmentData: {
    clerk_id: string;
    purchase_id: string;
    enrollment_type: 'course' | 'bundle';
    item_id: string;
    item_title: string;
    learnworlds_enrollment_id: string;
    learnworlds_course_id?: string;
    learnworlds_bundle_id?: string;
    validity_months: number;
    expires_at: string;
    bundle_courses?: any;
  }): Promise<UserEnrollment> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_enrollments')
        .insert({
          ...enrollmentData,
          enrolled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw error;
    }
  }

  /**
   * Get pending purchases for queue processing
   */
  async getPendingPurchases(): Promise<UserPurchase[]> {
    try {
      const { data, error } = await this.serviceClient
        .from('user_purchases')
        .select('*')
        .eq('processing_status', 'pending')
        .order('purchased_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending purchases:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiresAt: string): number {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate expiry date based on validity months
   */
  calculateExpiryDate(validityMonths: number, fromDate?: Date): string {
    const baseDate = fromDate || new Date();
    const expiryDate = new Date(baseDate);
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
    return expiryDate.toISOString();
  }

  /**
   * Get purchase statistics for a user
   */
  async getUserPurchaseStats(clerkId: string): Promise<{
    totalPurchases: number;
    totalSpent: number;
    activeEnrollments: number;
    expiredEnrollments: number;
    processingPurchases: number;
  }> {
    const supabase = await this.getSupabaseClient();

    try {
      const [purchaseData, enrollmentData] = await Promise.all([
        supabase
          .from('user_purchases')
          .select('amount_paid, processing_status')
          .eq('clerk_id', clerkId),
        supabase
          .from('user_enrollments')
          .select('expires_at, is_active')
          .eq('clerk_id', clerkId)
      ]);

      if (purchaseData.error || enrollmentData.error) {
        throw purchaseData.error || enrollmentData.error;
      }

      const purchases = purchaseData.data || [];
      const enrollments = enrollmentData.data || [];
      const now = new Date().toISOString();

      return {
        totalPurchases: purchases.length,
        totalSpent: purchases.reduce((sum, p) => sum + p.amount_paid, 0),
        activeEnrollments: enrollments.filter(e => e.is_active && e.expires_at > now).length,
        expiredEnrollments: enrollments.filter(e => !e.is_active || e.expires_at <= now).length,
        processingPurchases: purchases.filter(p => p.processing_status === 'processing').length,
      };
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
      throw error;
    }
  }
}