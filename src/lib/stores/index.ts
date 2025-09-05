// src/lib/stores/index.ts
// Store Integration & Coordination

import { useCartStore } from './cart-store';
import { useUserStore } from './user-store';
import { useUIStore } from './ui-store';
import { useEffect } from 'react';
import { toast } from 'sonner';

// ========================================
// STORE COORDINATION HOOKS
// ========================================

/**
 * Master hook to coordinate authentication state across all stores
 * Call this at the app root level
 */
export const useStoreAuth = (isSignedIn: boolean, userId?: string) => {
  const setCartAuth = useCartStore(state => state.setAuthenticated);
  const setUserAuth = useUserStore(state => state.setUser);
  const refreshUserData = useUserStore(state => state.refreshAllData);

  useEffect(() => {
    // Update cart store authentication
    setCartAuth(isSignedIn, userId);

    if (isSignedIn && userId) {
      // User signed in - trigger data loading
      refreshUserData();
    } else {
      // User signed out - clear user store
      setUserAuth(null);
    }
  }, [isSignedIn, userId, setCartAuth, setUserAuth, refreshUserData]);
};

/**
 * Hook to synchronize cart and user data
 * Handles cart validation based on user purchases
 */
export const useCartUserSync = () => {
  const cartItems = useCartStore(state => state.items);
  const validateCart = useCartStore(state => state.validateCart);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const ownedCourseIds = useUserStore(state => state.ownedCourseIds);
  
  useEffect(() => {
    if (isAuthenticated && cartItems.length > 0) {
      // Validate cart when user data changes
      validateCart();
    }
  }, [isAuthenticated, ownedCourseIds.size, cartItems.length, validateCart]);
};

/**
 * Hook to coordinate UI state with cart changes
 * Automatically opens cart drawer on certain actions
 */
export const useCartUISync = () => {
  const cartItemCount = useCartStore(state => state.getItemCount());
  const openCartDrawer = useUIStore(state => state.openCartDrawer);
  const setGlobalLoading = useUIStore(state => state.setGlobalLoading);
  const isUpdating = useCartStore(state => state.isUpdating);
  
  // Open cart drawer when items are added (with a slight delay to feel natural)
  const prevItemCount = useCartStore(state => state.items.length);
  useEffect(() => {
    if (cartItemCount > prevItemCount && cartItemCount > 0) {
      setTimeout(() => {
        openCartDrawer();
      }, 100);
    }
  }, [cartItemCount, prevItemCount, openCartDrawer]);

  // Show global loading during cart operations
  useEffect(() => {
    if (isUpdating) {
      setGlobalLoading(true, 'Updating cart...');
    } else {
      setGlobalLoading(false);
    }
  }, [isUpdating, setGlobalLoading]);
};

/**
 * Hook to handle purchase completion workflow
 * Coordinates between cart clearing and UI updates
 */
export const usePurchaseWorkflow = () => {
  const clearCart = useCartStore(state => state.clearCart);
  const refreshUserData = useUserStore(state => state.refreshAllData);
  const closeAllModals = useUIStore(state => state.closeAllModals);
  const setCurrentPage = useUIStore(state => state.setCurrentPage);

  const completePurchase = async (purchaseId: string) => {
    try {
      // Clear cart after successful purchase
      await clearCart();
      
      // Refresh user data to get new purchases/enrollments
      await refreshUserData();
      
      // Close any open modals
      closeAllModals();
      
      // Navigate to my purchases page
      setCurrentPage('my-purchases');
      
      toast.success('Purchase completed!', {
        description: 'Your courses are now available in My Purchases',
      });
      
    } catch (error) {
      console.error('Error completing purchase workflow:', error);
      toast.error('Purchase completed but failed to update interface');
    }
  };

  return { completePurchase };
};

// ========================================
// COMBINED STATE SELECTORS
// ========================================

/**
 * Get comprehensive cart state including user context
 */
export const useEnhancedCartState = () => {
  const cartState = useCartStore();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const ownedCourseIds = useUserStore(state => state.ownedCourseIds);
  const checkCourseAccess = useUserStore(state => state.checkCourseAccess);
  
  // Check if any cart items are already owned
  const conflictingItems = cartState.items.filter(item => 
    item.type === 'course' && ownedCourseIds.has(item.id)
  );

  return {
    ...cartState,
    isAuthenticated,
    conflictingItems,
    hasConflicts: conflictingItems.length > 0,
    canCheckout: cartState.items.length > 0 && 
                 cartState.validationErrors.length === 0 && 
                 conflictingItems.length === 0,
    checkCourseAccess,
  };
};

/**
 * Get user dashboard data combining purchases and enrollments
 */
export const useUserDashboard = () => {
  const userState = useUserStore();
  const isLoadingAny = userState.isLoadingProfile || 
                      userState.isLoadingPurchases || 
                      userState.isLoadingEnrollments;

  // Get expiring enrollments for notifications
  const expiringEnrollments = userState.enrollments
    ? userState.getExpiringEnrollments(30)
    : [];

  return {
    user: userState.user,
    purchases: userState.purchases,
    enrollments: userState.enrollments,
    enrollmentsWithPurchase: userState.enrollmentsWithPurchase,
    stats: userState.stats,
    expiringEnrollments,
    isLoading: isLoadingAny,
    hasExpiringEnrollments: expiringEnrollments.length > 0,
    refreshAll: userState.refreshAllData,
  };
};

/**
 * Get filtered and sorted course/bundle data based on UI filters
 */
export const useFilteredContent = (type: 'courses' | 'bundles') => {
  const uiState = useUIStore();
  const filters = type === 'courses' ? uiState.courseFilters : uiState.bundleFilters;
  // Updated: use preloaded data loading state (SSG-friendly)
  const isLoading = !uiState.preloadedData.isDataLoaded;
  
  return {
    filters,
    isLoading,
    hasActiveFilters: uiState.hasActiveFilters(type),
    activeFilterCount: uiState.getActiveFilterCount(type),
    // viewMode: filters.viewMode,
    // sortBy: filters.sortBy,
    searchTerm: filters.searchTerm,
  };
};

// ========================================
// ACTION COORDINATORS
// ========================================

/**
 * Coordinated add to cart action with all side effects
 */
export const useAddToCart = () => {
  const addToCart = useCartStore(state => state.addItem);
  const checkCourseAccess = useUserStore(state => state.checkCourseAccess);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const openAuthModal = useUIStore(state => state.openModal);
  const openCartDrawer = useUIStore(state => state.openCartDrawer);

  const addItemToCart = async (item: Parameters<typeof addToCart>[0], options?: {
    skipAuthCheck?: boolean;
    openDrawer?: boolean;
  }) => {
    try {
      // Check authentication if needed
      if (!options?.skipAuthCheck && !isAuthenticated) {
        openAuthModal('authModal');
        return false;
      }

      // Check if user owns the item (if authenticated)
      if (isAuthenticated && item.type === 'course') {
        const access = await checkCourseAccess(item.id);
        if (access.has_access) {
          toast.warning('You already own this course', {
            description: 'Check your purchases for access',
          });
          return false;
        }
      }

      // Add to cart
      await addToCart(item);
      
      // Optionally open cart drawer
      if (options?.openDrawer !== false) {
        setTimeout(() => openCartDrawer(), 200);
      }

      return true;
      
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
      return false;
    }
  };

  return { addItemToCart };
};

/**
 * Coordinated course/bundle action buttons logic
 */
export const useContentActions = () => {
  const { addItemToCart } = useAddToCart();
  const checkCourseAccess = useUserStore(state => state.checkCourseAccess);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const hasItem = useCartStore(state => state.hasItem);

  const getItemActions = async (item: {
    id: string;
    type: 'course' | 'bundle';
    title: string;
    price: number;
    thumbnail_url?: string;
    enrollment_id: string;
  }) => {
    let access = null;
    
    if (isAuthenticated && item.type === 'course') {
      access = await checkCourseAccess(item.id);
    }

    const inCart = hasItem(item.id, item.type);
    const owned = access?.has_access || false;

    return {
      // Button states
      showAddToCart: !owned && !inCart,
      showInCart: inCart && !owned,
      showAccess: owned,
      
      // Access info
      access,
      
      // Actions
      addToCart: () => addItemToCart({
        id: item.id,
        type: item.type,
        title: item.title,
        price: item.price,
        original_price: item.price,
        thumbnail_url: item.thumbnail_url || null,
        enrollment_id: item.enrollment_id,
      }),
      
      // Labels
      buttonText: owned ? 'Access Course' : inCart ? 'In Cart' : 'Add to Cart',
      buttonVariant: owned ? 'default' : inCart ? 'secondary' : 'default',
    };
  };

  return { getItemActions };
};

// ========================================
// PERSISTENCE & HYDRATION
// ========================================

/**
 * Hook to handle store hydration and persistence
 */
export const useStoreHydration = () => {
  const rehydrateCart = useCartStore(state => state._loadFromStorage);
  
  useEffect(() => {
    // Ensure cart is properly hydrated
    rehydrateCart();
  }, [rehydrateCart]);
};

// ========================================
// EXPORTS
// ========================================

// Re-export all stores for convenience
export { useCartStore, useUserStore, useUIStore };

// Export individual store hooks
export {
  useCartActions,
  useCartState,
  useCartUtils,
} from './cart-store';

export {
  useUserProfile,
  useUserPurchases,
  useUserEnrollments,
  useUserAccess,
  useUserStats,
} from './user-store';

export {
  useCartDrawer,
  useModalState,
  useFilters,
  usePageState,
  useErrorState,
  usePreferences,
} from './ui-store';

// Type exports
export type {
  CartItem,
  CartSummary,
  CourseAccessInfo,
  UserPurchase,
  UserEnrollment,
} from '@/lib/types';

// ========================================
// STORE DEBUGGING (Development Only)
// ========================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add store debugging capabilities
  (window as any).immigreatStores = {
    cart: useCartStore.getState,
    user: useUserStore.getState,
    ui: useUIStore.getState,
  };
  
  console.log('🏪 Immigreat stores available at window.immigreatStores');
}
