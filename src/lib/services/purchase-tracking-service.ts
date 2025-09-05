import { BaseService } from './base.service';
import {
  UserPurchase,
  UserEnrollment,
  CourseAccessInfo,
  PurchaseWithEnrollments,
  EnrollmentWithPurchase,
} from '@/lib/types';

export class PurchaseTrackingService extends BaseService {
  async getUserPurchases(clerkId: string): Promise<UserPurchase[]> {
    const { data, error } = await this.supabase
      .from('user_purchases')
      .select('*')
      .eq('clerk_id', clerkId)
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async checkCourseAccess(clerkId: string, courseId: string): Promise<CourseAccessInfo> {
    // Check direct enrollment
    const { data: enrollment } = await this.supabase
      .from('user_enrollments')
      .select('*')
      .eq('clerk_id', clerkId)
      .eq('item_id', courseId)
      .eq('enrollment_type', 'course')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (enrollment) {
      return {
        has_access: true,
        access_type: 'direct',
        expires_at: enrollment.expires_at,
        enrollment_id: enrollment.id,
        days_until_expiry: this.calculateDaysUntilExpiry(enrollment.expires_at),
        bundle_id: null,
        purchase_id: enrollment.purchase_id,
      };
    }

    // Check bundle enrollment
    const { data: bundles } = await this.supabase
      .from('bundles')
      .select('id, course_ids')
      .contains('course_ids', [courseId]);

    if (bundles && (bundles as any[]).length > 0) {
      const bundleIds = (bundles as any[]).map((b: any) => b.id);
      
      const { data: bundleEnrollment } = await this.supabase
        .from('user_enrollments')
        .select('*')
        .eq('clerk_id', clerkId)
        .in('item_id', bundleIds)
        .eq('enrollment_type', 'bundle')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (bundleEnrollment) {
        return {
          has_access: true,
          access_type: 'bundle',
          expires_at: bundleEnrollment.expires_at,
          enrollment_id: bundleEnrollment.id,
          days_until_expiry: this.calculateDaysUntilExpiry(bundleEnrollment.expires_at),
          bundle_id: bundleEnrollment.item_id,
          purchase_id: bundleEnrollment.purchase_id,
        };
      }
    }

    return {
      has_access: false,
      access_type: 'none',
      expires_at: null,
      enrollment_id: null,
      days_until_expiry: null,
      bundle_id: null,
      purchase_id: null,
    };
  }

  private calculateDaysUntilExpiry(expiresAt: string): number {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // =============================
  // Added helper/query methods
  // =============================

  async getUserActiveEnrollments(clerkId: string): Promise<UserEnrollment[]> {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('user_enrollments')
      .select('*')
      .eq('clerk_id', clerkId)
      .eq('is_active', true)
      .gte('expires_at', nowIso)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return (data as UserEnrollment[]) || [];
  }

  async getUserAllEnrollments(clerkId: string): Promise<UserEnrollment[]> {
    const { data, error } = await this.supabase
      .from('user_enrollments')
      .select('*')
      .eq('clerk_id', clerkId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return (data as UserEnrollment[]) || [];
  }

  async getEnrollmentsExpiringSoon(clerkId: string, daysAhead: number): Promise<UserEnrollment[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const { data, error } = await this.supabase
      .from('user_enrollments')
      .select('*')
      .eq('clerk_id', clerkId)
      .eq('is_active', true)
      .lte('expires_at', future.toISOString())
      .gte('expires_at', now.toISOString())
      .order('expires_at', { ascending: true });

    if (error) throw error;
    return (data as UserEnrollment[]) || [];
  }

  async checkMultipleCourseAccess(
    clerkId: string,
    courseIds: string[]
  ): Promise<Record<string, CourseAccessInfo>> {
    const results: Record<string, CourseAccessInfo> = {};
    const checks = await Promise.all(
      courseIds.map((id) => this.checkCourseAccess(clerkId, id))
    );
    courseIds.forEach((id, idx) => {
      results[id] = checks[idx];
    });
    return results;
  }

  async getUserEnrollmentsWithPurchase(clerkId: string): Promise<EnrollmentWithPurchase[]> {
    const enrollments = await this.getUserAllEnrollments(clerkId);
    if (enrollments.length === 0) return [];

    // Fetch purchases for mapping
    const purchaseIds = Array.from(new Set(enrollments.map((e) => e.purchase_id)));
    const { data: purchases, error } = await this.supabase
      .from('user_purchases')
      .select('id, purchased_at, amount_paid, stripe_session_id')
      .in('id', purchaseIds);
    if (error) throw error;

    const purchaseMap = new Map<string, { purchased_at: string; amount_paid: number; stripe_session_id: string }>();
    (purchases || []).forEach((p: any) => {
      purchaseMap.set(p.id, {
        purchased_at: p.purchased_at,
        amount_paid: p.amount_paid,
        stripe_session_id: p.stripe_session_id,
      });
    });

    // Optional: fetch course/bundle details if needed later
    const results: EnrollmentWithPurchase[] = enrollments.map((e) => ({
      ...e,
      purchase: purchaseMap.get(e.purchase_id) as any,
    }));

    return results;
  }

  async getUserPurchasesWithEnrollments(clerkId: string): Promise<PurchaseWithEnrollments[]> {
    const purchases = await this.getUserPurchases(clerkId);
    if (purchases.length === 0) return [];

    const purchaseIds = purchases.map((p) => p.id);
    const { data: enrollments, error } = await this.supabase
      .from('user_enrollments')
      .select('*')
      .in('purchase_id', purchaseIds);
    if (error) throw error;

    const grouped = new Map<string, UserEnrollment[]>();
    (enrollments as UserEnrollment[] | null)?.forEach((e) => {
      const arr = grouped.get(e.purchase_id) || [];
      arr.push(e);
      grouped.set(e.purchase_id, arr);
    });

    return purchases.map((p) => {
      const ens = grouped.get(p.id) || [];
      const activeCount = ens.filter((e) => e.is_active && new Date(e.expires_at) > new Date()).length;
      return {
        ...p,
        enrollments: ens,
        enrollment_count: ens.length,
        active_enrollment_count: activeCount,
      } as PurchaseWithEnrollments;
    });
  }

  async getUserPurchaseStats(clerkId: string): Promise<{
    total_purchases: number;
    total_spent: number;
    total_enrollments: number;
    active_enrollments: number;
    last_purchase_at: string | null;
  }> {
    const [purchases, enrollments] = await Promise.all([
      this.getUserPurchases(clerkId),
      this.getUserAllEnrollments(clerkId),
    ]);

    const totalSpent = purchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const activeEnrollments = enrollments.filter(
      (e) => e.is_active && new Date(e.expires_at) > new Date()
    ).length;
    const lastPurchaseAt = purchases[0]?.purchased_at || null;

    return {
      total_purchases: purchases.length,
      total_spent: totalSpent,
      total_enrollments: enrollments.length,
      active_enrollments: activeEnrollments,
      last_purchase_at: lastPurchaseAt,
    };
  }

  async getPurchaseById(clerkId: string, purchaseId: string): Promise<UserPurchase | null> {
    const { data, error } = await this.supabase
      .from('user_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('clerk_id', clerkId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return (data as UserPurchase) || null;
  }
}
