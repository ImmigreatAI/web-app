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
  id: string; // 8-character ID
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
  id: string; // 8-character ID
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

export interface UserPurchase {
  id: string;
  clerk_id: string;
  purchase_type: PurchaseType;
  item_id: string;
  enrollment_id: string | null;
  purchase_data: PurchaseData;
  enrollment_status: EnrollmentStatus;
  purchased_at: string;
  expires_at: string;
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
export type PurchaseType = 'course' | 'bundle' | 'byob';
export type EnrollmentStatus = 'pending' | 'completed' | 'failed';
export type ValidityTier = '3month' | '6month' | '9month';
export type BYOBTier = null | '5plus' | '10plus';

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

export interface PurchaseData {
  stripe_session_id: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  amount_paid: number;
  currency: string;
  enrollment_ids_used: string[];
  validity_months: number;
  discount_applied?: DiscountInfo;
  bundle_courses?: string[];
  byob_details?: BYOBDetails;
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

// ========================================
// FILTER TYPES
// ========================================

export interface CourseFilters {
  category?: CourseCategory;
  series?: string;
  tags?: string[];
  difficulty?: CourseMetadata['difficulty'];
  minPrice?: number;
  maxPrice?: number;
}

export interface BundleFilters {
  bundle_type?: BundleType;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  courseCount?: number;
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

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, any>;
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