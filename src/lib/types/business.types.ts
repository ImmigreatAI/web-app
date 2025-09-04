// ========================================
// BUSINESS LOGIC TYPES
// Business operations and logic types
// ========================================

import { User, UserPurchase, UserEnrollment, Course, Bundle } from './database.types';
import { BYOBTier, ValidityTier } from './common.types';

export interface CourseAccessInfo {
  has_access: boolean;
  access_type: 'direct' | 'bundle' | 'none';
  expires_at: string | null;
  enrollment_id: string | null;
  days_until_expiry: number | null;
  bundle_id: string | null;
  purchase_id: string | null;
}

export interface PurchaseWithEnrollments extends UserPurchase {
  enrollments: UserEnrollment[];
  enrollment_count: number;
  active_enrollment_count: number;
}

export interface EnrollmentWithPurchase extends UserEnrollment {
  purchase: {
    purchased_at: string;
    amount_paid: number;
    stripe_session_id: string;
  };
  course?: Course; // If enrollment_type === 'course'
  bundle?: Bundle; // If enrollment_type === 'bundle'
}

export interface DiscountInfo {
  type: 'byob' | 'coupon' | 'sale';
  amount: number;
  percentage: number;
  code?: string;
}

export interface BYOBDetails {
  tier: BYOBTier;
  original_validity: ValidityTier;
  upgraded_validity: ValidityTier;
  discount_rate: number;
}

export interface QueueJob {
  id: string;
  purchase_id: string;
  clerk_id: string;
  job_type: 'enrollment_processing';
  priority: number;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: {
    items_to_enroll: Array<{
      type: 'course' | 'bundle';
      id: string;
      enrollment_id: string;
      validity_months: number;
    }>;
    user_details: {
      clerk_id: string;
      email: string;
      name: string;
    };
  };
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}