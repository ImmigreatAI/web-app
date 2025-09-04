// ========================================
// DATABASE TYPES
// ========================================

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

// ========================================
// NEW: SEPARATE PURCHASE & ENROLLMENT TABLES
// ========================================

/**
 * User Purchases - Transaction records (payment completed)
 * Created immediately after successful payment
 * Status tracks queue processing progress
 */
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

/**
 * User Enrollments - Active access records
 * Created by queue system after successful LearnWorlds enrollment
 */
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

export interface Cart {
  id: string;
  clerk_id: string;
  cart_data: CartData;
  updated_at: string;
}

// ========================================
// ENUM TYPES
// ========================================

export type CourseCategory = 'EB1A' | 'EB2-NIW' | 'Other';
export type BundleType = 'curated' | 'beginner' | 'premium' | 'specialized';
export type ValidityTier = '3month' | '6month' | '9month';
export type BYOBTier = null | '5plus' | '10plus';

export type ProcessingStatus = 
  | 'pending'      // Payment successful, waiting for queue
  | 'processing'   // Queue is processing enrollments
  | 'completed'    // All enrollments successful
  | 'partial'      // Some enrollments failed
  | 'failed';      // All enrollments failed

// ========================================
// SUPPORTING TYPES
// ========================================

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

export interface BundleCourseData {
  included_courses: Array<{
    course_id: string;
    course_title: string;
    learnworlds_course_id: string;
  }>;
}

// ========================================
// NESTED OBJECT TYPES
// ========================================

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

// ========================================
// CART TYPES
// ========================================

export interface CartData {
  items: CartItem[];
  summary?: CartSummary;
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

// ========================================
// BUSINESS LOGIC TYPES
// ========================================

/**
 * Combined enrollment info for UI components
 * Replaces the old EnrollmentInfo interface
 */
export interface CourseAccessInfo {
  has_access: boolean;
  access_type: 'direct' | 'bundle' | 'none';
  expires_at: string | null;
  enrollment_id: string | null;
  days_until_expiry: number | null;
  bundle_id: string | null;
  purchase_id: string | null;
}

/**
 * Purchase with enrollment details (for purchase history)
 */
export interface PurchaseWithEnrollments extends UserPurchase {
  enrollments: UserEnrollment[];
  enrollment_count: number;
  active_enrollment_count: number;
}

/**
 * Enrollment with purchase context (for My Purchases page)
 */
export interface EnrollmentWithPurchase extends UserEnrollment {
  purchase: {
    purchased_at: string;
    amount_paid: number;
    stripe_session_id: string;
  };
  course?: Course; // If enrollment_type === 'course'
  bundle?: Bundle; // If enrollment_type === 'bundle'
}

// ========================================
// UI TYPES
// ========================================

export interface CourseWithEnrollment extends Course {
  user_owns: boolean;
  ownership_type: 'direct' | 'bundle' | 'none';
  expires_at: string | null;
  bundle_id: string | null;
}

export interface BundleWithCourses extends Bundle {
  courses: Course[];
}

// Legacy interface - use CourseAccessInfo instead
export interface EnrollmentInfo {
  owns_course: boolean;
  access_type: 'direct' | 'bundle' | 'none';
  expires_at: string | null;
  bundle_id: string | null;
  access_url?: string;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  purchaseId: string;
}

export interface PurchaseStatusResponse {
  purchase_id: string;
  status: ProcessingStatus;
  items_count: number;
  enrollments_created: number;
  processing_progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  estimated_completion?: string;
  error_details?: string[];
}

// ========================================
// FILTER TYPES
// ========================================

export interface CourseFilters {
  category?: CourseCategory;
  series?: string;
  tags?: string[];
}

export interface BundleFilters {
  bundle_type?: BundleType;
}

// ========================================
// FORM TYPES
// ========================================

export interface CheckoutFormData {
  items: CartItem[];
  total: number;
  discount?: DiscountInfo;
  customer: {
    email: string;
    name: string;
  };
}

export interface CheckoutSessionRequest {
  clerkId: string;
  userEmail: string;
  userName: string;
  cartData?: CartData; // For cart checkout
  singleItem?: { // For Buy Now checkout
    type: 'course' | 'bundle';
    id: string;
    title: string;
    price: number;
    enrollmentId: string;
    validityMonths: number;
    thumbnailUrl?: string;
  };
  successUrl: string;
  cancelUrl: string;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, any>;
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

// ========================================
// QUEUE SYSTEM TYPES
// ========================================

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

// ========================================
// HOOK RETURN TYPES
// ========================================

export interface UseUserReturn {
  clerkUser: any;
  supabaseUser: User | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  syncUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<void>;
  isLoadingSupabaseUser: boolean;
  supabaseError: string | null;
}

