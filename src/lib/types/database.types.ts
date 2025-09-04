// ========================================
// DATABASE TYPES
// Core database table interfaces
// ========================================

import { CourseCategory, BundleType, ProcessingStatus, BYOBTier } from './common.types';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  stripe_customer_id: string | null;
  learnworlds_user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CourseMetadata {
  tags: string[];
  evidence_types?: string[];
  duration: string;
  lessons: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites?: string[];
  features?: string[];
}

export interface CoursePricing {
  base_price: number;
  currency: string;
  sale_price?: number;
}

export interface EnrollmentIds {
  three_month: string;
  six_month: string;
  nine_month: string;
}

export interface CourseCurriculum {
  modules: CourseModule[];
}

export interface CourseModule {
  title: string;
  lessons: number;
  duration: string;
}

export interface Course {
  id: string; // UUID
  slug: string;
  title: string;
  description: string | null;
  category: CourseCategory;
  series: string | null;
  thumbnail_url: string | null;
  img_url: string | null;
  preview_video_url: string | null;
  metadata: CourseMetadata;
  pricing: CoursePricing;
  enrollment_ids: EnrollmentIds;
  learnworlds_data?: Record<string, any>;
  curriculum?: CourseCurriculum;
  is_active: boolean;
  rating: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface BundleMetadata {
  featured?: boolean;
  courses_count: number;
  bonus_materials?: string[];
  difficulty: string;
  estimated_completion: string;
  target_audience?: string;
  exclusive?: boolean;
}

export interface BundlePricing {
  price: number;
  original_value: number;
  savings_amount: number;
  savings_percentage: number;
}

export interface Bundle {
  id: string; // UUID
  slug: string;
  title: string;
  description: string | null;
  bundle_type: BundleType;
  thumbnail_url: string | null;
  img_url: string | null;
  metadata: BundleMetadata;
  pricing: BundlePricing;
  course_ids: string[];
  enrollment_id: string | null;
  learnworlds_data?: Record<string, any>;
  validity_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  type: 'course' | 'bundle';
  id: string;
  title: string;
  thumbnail_url: string | null;
  price: number;
  original_price: number;
  enrollment_id: string;
  validity_months: number;
}

export interface CartSummary {
  subtotal: number;
  discount_amount: number;
  total: number;
  byob_tier: BYOBTier;
}

export interface CartData {
  items: CartItem[];
  summary?: CartSummary;
}

export interface Cart {
  id: string;
  clerk_id: string;
  cart_data: CartData;
  updated_at: string;
}

export interface PurchaseItemsData {
  courses: Array<{
    course_id: string;
    title: string;
    price_paid: number;
    enrollment_id_to_use: string;
    validity_months: number;
  }>;
  bundles: Array<{
    bundle_id: string;
    title: string;
    price_paid: number;
    enrollment_id: string;
    validity_months: number;
    course_ids: string[];
  }>;
  byob_applied?: {
    tier: '5plus' | '10plus' | null;
    discount_rate: number;
    original_validity: number;
    upgraded_validity: number;
  };
  discount_details: {
    subtotal: number;
    discount_amount: number;
    total: number;
  };
}

export interface QueueMetadata {
  queue_job_id?: string;
  processing_attempts?: number;
  last_attempt_at?: string;
  failure_reasons?: string[];
  enrollment_results?: {
    successful: string[]; // enrollment IDs that succeeded
    failed: string[];     // enrollment IDs that failed
  };
  created_from?: string;
  checkout_type?: string;
  cart_item_count?: number;
  payment_completed_at?: string;
  session_mode?: string;
  payment_status?: string;
  edge_function_called?: boolean;
  error?: string;
  response_status?: number;
  response_text?: string;
  error_message?: string;
}

export interface UserPurchase {
  id: string;
  clerk_id: string;
  
  // Stripe Transaction Data
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_customer_id: string | null;
  
  // Purchase Details
  purchase_type: string; // 'course', 'bundle', 'byob', 'mixed'
  amount_paid: number;
  currency: string;
  
  // Items Purchased (snapshot at purchase time)
  items_purchased: PurchaseItemsData;
  
  // Processing Status
  processing_status: ProcessingStatus;
  queue_metadata: QueueMetadata;
  
  // Timestamps
  purchased_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundleCourseData {
  included_courses: Array<{
    course_id: string;
    course_title: string;
    learnworlds_course_id: string;
  }>;
}

export interface UserEnrollment {
  id: string;
  clerk_id: string;
  purchase_id: string; // References UserPurchase
  
  // Enrollment Details
  enrollment_type: 'course' | 'bundle';
  item_id: string; // course_id or bundle_id
  item_title: string;
  
  // LearnWorlds Integration
  learnworlds_enrollment_id: string;
  learnworlds_course_id: string | null;
  learnworlds_bundle_id: string | null;
  
  // Access Details
  validity_months: number;
  enrolled_at: string;
  expires_at: string;
  
  // Bundle-Specific Data
  bundle_courses: BundleCourseData | null;
  
  // Status
  is_active: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}