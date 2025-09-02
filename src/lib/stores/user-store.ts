// src/lib/stores/user-store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  User, 
  UserPurchase, 
  UserEnrollment, 
  CourseAccessInfo,
  EnrollmentWithPurchase,
  PurchaseWithEnrollments 
} from '@/lib/types';
import { toast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface CachedAccessInfo {
  [courseId: string]: {
    accessInfo: CourseAccessInfo;
    cachedAt: number;
    expiresAt: number;
  };
}

interface UserStoreState {
  // User Profile Data
  user: User | null;
  isAuthenticated: boolean;
  clerkId: string | null;
  
  // Purchase & Enrollment Data
  purchases: UserPurchase[];
  enrollments: UserEnrollment[];
  enrollmentsWithPurchase: EnrollmentWithPurchase[];
  purchasesWithEnrollments: PurchaseWithEnrollments[];
  
  // Cached Access Status
  courseAccessCache: CachedAccessInfo;
  ownedCourseIds: Set<string>;
  
  // Loading States
  isLoadingProfile: boolean;
  isLoadingPurchases: boolean;
  isLoadingEnrollments: boolean;
  isRefreshing: boolean;
  
  // Statistics
  stats: {
    totalSpent: number;
    totalPurchases: number;
    activeEnrollments: number;
    expiredEnrollments: number;
    expiringEnrollments: number; // Expiring in next 30 days
  } | null;
  
  // Error States
  profileError: string | null;
  purchasesError: string | null;
  enrollmentsError: string | null;
  
  // Actions - Profile Management
  setUser: (user: User | null, clerkId?: string) => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  // Actions - Purchase Management
  loadPurchases: (includeEnrollments?: boolean) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  getPurchaseById: (purchaseId: string) => UserPurchase | null;
  
  // Actions - Enrollment Management
  loadEnrollments: (includeExpired?: boolean) => Promise<void>;
  refreshEnrollments: () => Promise<void>;
  getActiveEnrollments: () => UserEnrollment[];
  getExpiringEnrollments: (daysAhead?: number) => UserEnrollment[];
  
  // Actions - Access Checking
  checkCourseAccess: (courseId: string, useCache?: boolean) => Promise<CourseAccessInfo>;
  checkMultipleCourseAccess: (courseIds: string[], useCache?: boolean) => Promise<Record<string, CourseAccessInfo>>;
  refreshCourseAccessCache: (courseIds?: string[]) => Promise<void>;
  clearAccessCache: () => void;
  
  // Actions - Statistics
  loadStatistics: () => Promise<void>;
  
  // Actions - Full Data Refresh
  refreshAllData: () => Promise<void>;
  
  // Utilities
  hasActivePurchase: (itemId: string) => boolean;
  isEnrollmentExpiring: (enrollment: UserEnrollment, daysAhead?: number) => boolean;
  getEnrollmentByItemId: (itemId: string) => UserEnrollment | null;
  
  // Internal Methods
  _updateOwnedCourses: () => void;
  _calculateStatistics: () => void;
  _clearAllData: () => void;
}

// ========================================
// CONSTANTS
// ========================================

const ACCESS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const EXPIRING_SOON_DAYS = 30;

// ========================================
// USER STORE
// ========================================

export const useUserStore = create<UserStoreState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // INITIAL STATE
    // ========================================
    
    user: null,
    isAuthenticated: false,
    clerkId: null,
    
    purchases: [],
    enrollments: [],
    enrollmentsWithPurchase: [],
    purchasesWithEnrollments: [],
    
    courseAccessCache: {},
    ownedCourseIds: new Set(),
    
    isLoadingProfile: false,
    isLoadingPurchases: false,
    isLoadingEnrollments: false,
    isRefreshing: false,
    
    stats: null,
    
    profileError: null,
    purchasesError: null,
    enrollmentsError: null,

    // ========================================
    // PROFILE MANAGEMENT
    // ========================================

    setUser: (user, clerkId) => {
      const wasAuthenticated = get().isAuthenticated;
      
      set({
        user,
        isAuthenticated: !!user,
        clerkId: clerkId || null,
      });

      // Load user data if newly authenticated
      if (!wasAuthenticated && user && clerkId) {
        get().refreshAllData();
      } else if (!user) {
        // Clear all data if user signed out
        get()._clearAllData();
      }
    },

    refreshProfile: async () => {
      const state = get();
      if (!state.clerkId) return;

      set({ isLoadingProfile: true, profileError: null });

      try {
        const response = await fetch('/api/auth/user-profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const { data: user } = await response.json();
        set({ user });
        
      } catch (error) {
        console.error('Error refreshing profile:', error);
        set({ profileError: error instanceof Error ? error.message : 'Failed to load profile' });
      } finally {
        set({ isLoadingProfile: false });
      }
    },

    updateProfile: async (updates) => {
      const state = get();
      if (!state.user) return;

      try {
        const response = await fetch('/api/auth/user-profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        const { data: updatedUser } = await response.json();
        set({ user: updatedUser });
        
        toast.success('Profile updated successfully');
        
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        throw error;
      }
    },

    // ========================================
    // PURCHASE MANAGEMENT
    // ========================================

    loadPurchases: async (includeEnrollments = false) => {
      const state = get();
      if (!state.clerkId) return;

      set({ isLoadingPurchases: true, purchasesError: null });

      try {
        const url = `/api/purchases${includeEnrollments ? '?include_enrollments=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch purchases');
        }

        const { data } = await response.json();
        
        if (includeEnrollments) {
          set({ purchasesWithEnrollments: data });
        } else {
          set({ purchases: data });
        }
        
      } catch (error) {
        console.error('Error loading purchases:', error);
        set({ purchasesError: error instanceof Error ? error.message : 'Failed to load purchases' });
      } finally {
        set({ isLoadingPurchases: false });
      }
    },

    refreshPurchases: async () => {
      await Promise.all([
        get().loadPurchases(false),
        get().loadPurchases(true)
      ]);
      get()._calculateStatistics();
    },

    getPurchaseById: (purchaseId) => {
      return get().purchases.find(purchase => purchase.id === purchaseId) || null;
    },

    // ========================================
    // ENROLLMENT MANAGEMENT
    // ========================================

    loadEnrollments: async (includeExpired = false) => {
      const state = get();
      if (!state.clerkId) return;

      set({ isLoadingEnrollments: true, enrollmentsError: null });

      try {
        const url = `/api/enrollments${includeExpired ? '?include_expired=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch enrollments');
        }

        const { data: enrollments } = await response.json();
        set({ enrollments });
        
        // Also load enrollments with purchase context for My Purchases page
        const enrichedResponse = await fetch('/api/enrollments/with-purchase');
        if (enrichedResponse.ok) {
          const { data: enrollmentsWithPurchase } = await enrichedResponse.json();
          set({ enrollmentsWithPurchase });
        }
        
        get()._updateOwnedCourses();
        
      } catch (error) {
        console.error('Error loading enrollments:', error);
        set({ enrollmentsError: error instanceof Error ? error.message : 'Failed to load enrollments' });
      } finally {
        set({ isLoadingEnrollments: false });
      }
    },

    refreshEnrollments: async () => {
      await Promise.all([
        get().loadEnrollments(false),
        get().loadEnrollments(true)
      ]);
      get()._calculateStatistics();
    },

    getActiveEnrollments: () => {
      const now = new Date().toISOString();
      return get().enrollments.filter(enrollment => 
        enrollment.is_active && enrollment.expires_at > now
      );
    },

    getExpiringEnrollments: (daysAhead = EXPIRING_SOON_DAYS) => {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      return get().enrollments.filter(enrollment => {
        if (!enrollment.is_active) return false;
        const expiryDate = new Date(enrollment.expires_at);
        return expiryDate >= now && expiryDate <= futureDate;
      });
    },

    // ========================================
    // ACCESS CHECKING
    // ========================================

    checkCourseAccess: async (courseId, useCache = true) => {
      const state = get();
      
      // Check cache first
      if (useCache && state.courseAccessCache[courseId]) {
        const cached = state.courseAccessCache[courseId];
        if (Date.now() < cached.expiresAt) {
          return cached.accessInfo;
        }
      }

      // Not authenticated - no access
      if (!state.clerkId) {
        const noAccess: CourseAccessInfo = {
          has_access: false,
          access_type: 'none',
          expires_at: null,
          enrollment_id: null,
          days_until_expiry: null,
          bundle_id: null,
          purchase_id: null,
        };
        return noAccess;
      }

      try {
        const response = await fetch('/api/enrollments/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        if (!response.ok) {
          throw new Error('Failed to check course access');
        }

        const { data: accessInfo } = await response.json();
        
        // Cache the result
        set(state => ({
          courseAccessCache: {
            ...state.courseAccessCache,
            [courseId]: {
              accessInfo,
              cachedAt: Date.now(),
              expiresAt: Date.now() + ACCESS_CACHE_DURATION,
            }
          }
        }));

        return accessInfo;
        
      } catch (error) {
        console.error('Error checking course access:', error);
        // Return no access on error
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
    },

    checkMultipleCourseAccess: async (courseIds, useCache = true) => {
      const state = get();
      const results: Record<string, CourseAccessInfo> = {};
      const uncachedIds: string[] = [];

      // Check cache for each course
      if (useCache) {
        for (const courseId of courseIds) {
          const cached = state.courseAccessCache[courseId];
          if (cached && Date.now() < cached.expiresAt) {
            results[courseId] = cached.accessInfo;
          } else {
            uncachedIds.push(courseId);
          }
        }
      } else {
        uncachedIds.push(...courseIds);
      }

      // Fetch uncached courses
      if (uncachedIds.length > 0 && state.clerkId) {
        try {
          const response = await fetch('/api/enrollments/check-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseIds: uncachedIds }),
          });

          if (response.ok) {
            const { data: accessMap } = await response.json();
            
            // Update cache and results
            const newCache = { ...state.courseAccessCache };
            for (const [courseId, accessInfo] of Object.entries(accessMap)) {
              results[courseId] = accessInfo as CourseAccessInfo;
              newCache[courseId] = {
                accessInfo: accessInfo as CourseAccessInfo,
                cachedAt: Date.now(),
                expiresAt: Date.now() + ACCESS_CACHE_DURATION,
              };
            }
            
            set({ courseAccessCache: newCache });
          }
        } catch (error) {
          console.error('Error checking multiple course access:', error);
        }
      }

      // Fill in any missing results with no access
      for (const courseId of courseIds) {
        if (!results[courseId]) {
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
    },

    refreshCourseAccessCache: async (courseIds) => {
      if (courseIds) {
        await get().checkMultipleCourseAccess(courseIds, false);
      } else {
        set({ courseAccessCache: {} });
      }
    },

    clearAccessCache: () => {
      set({ courseAccessCache: {} });
    },

    // ========================================
    // STATISTICS
    // ========================================

    loadStatistics: async () => {
      const state = get();
      if (!state.clerkId) return;

      try {
        const response = await fetch('/api/purchases/stats');
        
        if (response.ok) {
          const { data: stats } = await response.json();
          set({ stats });
        }
        
      } catch (error) {
        console.error('Error loading statistics:', error);
      }
    },

    // ========================================
    // FULL REFRESH
    // ========================================

    refreshAllData: async () => {
      const state = get();
      if (!state.clerkId) return;

      set({ isRefreshing: true });

      try {
        await Promise.all([
          get().refreshProfile(),
          get().refreshPurchases(),
          get().refreshEnrollments(),
          get().loadStatistics(),
        ]);
        
        get()._calculateStatistics();
        
      } catch (error) {
        console.error('Error refreshing all data:', error);
        toast.error('Failed to refresh user data');
      } finally {
        set({ isRefreshing: false });
      }
    },

    // ========================================
    // UTILITIES
    // ========================================

    hasActivePurchase: (itemId) => {
      const now = new Date().toISOString();
      return get().enrollments.some(enrollment => 
        enrollment.item_id === itemId && 
        enrollment.is_active && 
        enrollment.expires_at > now
      );
    },

    isEnrollmentExpiring: (enrollment, daysAhead = EXPIRING_SOON_DAYS) => {
      if (!enrollment.is_active) return false;
      
      const now = new Date();
      const expiryDate = new Date(enrollment.expires_at);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      return expiryDate >= now && expiryDate <= futureDate;
    },

    getEnrollmentByItemId: (itemId) => {
      return get().enrollments.find(enrollment => enrollment.item_id === itemId) || null;
    },

    // ========================================
    // INTERNAL METHODS
    // ========================================

    _updateOwnedCourses: () => {
      const state = get();
      const ownedIds = new Set<string>();
      
      // Add directly owned courses
      state.enrollments
        .filter(enrollment => enrollment.is_active && new Date(enrollment.expires_at) > new Date())
        .forEach(enrollment => {
          if (enrollment.enrollment_type === 'course') {
            ownedIds.add(enrollment.item_id);
          } else if (enrollment.enrollment_type === 'bundle' && enrollment.bundle_courses) {
            enrollment.bundle_courses.included_courses?.forEach(course => {
              ownedIds.add(course.course_id);
            });
          }
        });
      
      set({ ownedCourseIds: ownedIds });
    },

    _calculateStatistics: () => {
      const state = get();
      const now = new Date().toISOString();
      
      const activeEnrollments = state.enrollments.filter(e => 
        e.is_active && e.expires_at > now
      ).length;
      
      const expiredEnrollments = state.enrollments.filter(e => 
        !e.is_active || e.expires_at <= now
      ).length;
      
      const expiringEnrollments = get().getExpiringEnrollments().length;
      
      const totalSpent = state.purchases
        .filter(p => p.processing_status === 'completed')
        .reduce((sum, p) => sum + p.amount_paid, 0);
      
      set({
        stats: {
          totalSpent,
          totalPurchases: state.purchases.length,
          activeEnrollments,
          expiredEnrollments,
          expiringEnrollments,
        }
      });
    },

    _clearAllData: () => {
      set({
        user: null,
        isAuthenticated: false,
        clerkId: null,
        purchases: [],
        enrollments: [],
        enrollmentsWithPurchase: [],
        purchasesWithEnrollments: [],
        courseAccessCache: {},
        ownedCourseIds: new Set(),
        stats: null,
        profileError: null,
        purchasesError: null,
        enrollmentsError: null,
      });
    },
  }))
);

// ========================================
// CONVENIENCE HOOKS
// ========================================

export const useUserProfile = () => {
  const store = useUserStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoadingProfile: store.isLoadingProfile,
    profileError: store.profileError,
    refreshProfile: store.refreshProfile,
    updateProfile: store.updateProfile,
  };
};

export const useUserPurchases = () => {
  const store = useUserStore();
  return {
    purchases: store.purchases,
    purchasesWithEnrollments: store.purchasesWithEnrollments,
    isLoadingPurchases: store.isLoadingPurchases,
    purchasesError: store.purchasesError,
    refreshPurchases: store.refreshPurchases,
    getPurchaseById: store.getPurchaseById,
  };
};

export const useUserEnrollments = () => {
  const store = useUserStore();
  return {
    enrollments: store.enrollments,
    enrollmentsWithPurchase: store.enrollmentsWithPurchase,
    isLoadingEnrollments: store.isLoadingEnrollments,
    enrollmentsError: store.enrollmentsError,
    refreshEnrollments: store.refreshEnrollments,
    getActiveEnrollments: store.getActiveEnrollments,
    getExpiringEnrollments: store.getExpiringEnrollments,
  };
};

export const useUserAccess = () => {
  const store = useUserStore();
  return {
    checkCourseAccess: store.checkCourseAccess,
    checkMultipleCourseAccess: store.checkMultipleCourseAccess,
    hasActivePurchase: store.hasActivePurchase,
    ownedCourseIds: store.ownedCourseIds,
    clearAccessCache: store.clearAccessCache,
  };
};

export const useUserStats = () => {
  const store = useUserStore();
  return {
    stats: store.stats,
    loadStatistics: store.loadStatistics,
    refreshAllData: store.refreshAllData,
    isRefreshing: store.isRefreshing,
  };
};