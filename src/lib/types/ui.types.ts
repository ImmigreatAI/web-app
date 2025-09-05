// ========================================
// UI COMPONENT TYPES
// User interface and component types
// ========================================

import { Course, Bundle, User } from './database.types';

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