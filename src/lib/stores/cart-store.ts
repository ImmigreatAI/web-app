// src/lib/stores/cart-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartData, CartItem, CartSummary, BYOBTier, CourseAccessInfo } from '@/lib/types';
import { toast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface CartState {
  // Cart Data
  items: CartItem[];
  summary: CartSummary | null;
  
  // Loading States
  isLoading: boolean;
  isUpdating: boolean;
  isSyncing: boolean;
  
  // Error States
  error: string | null;
  validationErrors: string[];
  validationWarnings: string[];
  
  // User Context
  isAuthenticated: boolean;
  clerkId: string | null;
  
  // Actions
  addItem: (item: Omit<CartItem, 'validity_months'>) => Promise<void>;
  removeItem: (itemId: string, itemType: 'course' | 'bundle') => Promise<void>;
  updateItem: (itemId: string, itemType: 'course' | 'bundle', updates: Partial<CartItem>) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // User Actions
  setAuthenticated: (isAuth: boolean, clerkId?: string) => void;
  syncWithServer: () => Promise<void>;
  mergeLocalCartOnSignIn: (clerkId: string) => Promise<void>;
  
  // Validation
  validateCart: () => Promise<void>;
  checkItemConflicts: (newItem: CartItem) => Promise<{ canAdd: boolean; warnings: string[]; errors: string[] }>;
  
  // Calculations
  recalculateCart: () => void;
  getBYOBDiscount: () => { tier: BYOBTier; discountRate: number; validityMonths: number };
  
  // Utilities
  getItemCount: () => number;
  hasItem: (itemId: string, itemType: 'course' | 'bundle') => boolean;
  getCartTotal: () => number;
  
  // Internal
  _updateSummary: () => void;
  _persistCart: () => void;
  _loadFromStorage: () => void;
}

// ========================================
// BYOB CALCULATION HELPERS
// ========================================

const calculateBYOBTier = (courseCount: number): BYOBTier => {
  if (courseCount >= 10) return '10plus';
  if (courseCount >= 5) return '5plus';
  return null;
};

const getBYOBDiscountRate = (tier: BYOBTier): number => {
  switch (tier) {
    case '10plus': return 0.18;
    case '5plus': return 0.13;
    default: return 0;
  }
};

const getBYOBValidityMonths = (tier: BYOBTier): number => {
  switch (tier) {
    case '10plus': return 9;
    case '5plus': return 6;
    default: return 3;
  }
};

// ========================================
// CART STORE
// ========================================

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      summary: null,
      isLoading: false,
      isUpdating: false,
      isSyncing: false,
      error: null,
      validationErrors: [],
      validationWarnings: [],
      isAuthenticated: false,
      clerkId: null,

      // ========================================
      // CORE CART ACTIONS
      // ========================================

      addItem: async (item) => {
        const state = get();
        set({ isUpdating: true, error: null });

        try {
          // Check if item already exists
          const existingItemIndex = state.items.findIndex(
            existingItem => existingItem.id === item.id && existingItem.type === item.type
          );

          if (existingItemIndex >= 0) {
            toast.warning('Item already in cart');
            set({ isUpdating: false });
            return;
          }

          // Create cart item with default validity
          const cartItem: CartItem = {
            ...item,
            validity_months: 3, // Default, will be recalculated
          };

          // Check for conflicts if authenticated
          if (state.isAuthenticated && state.clerkId) {
            const conflicts = await get().checkItemConflicts(cartItem);
            if (!conflicts.canAdd) {
              set({ 
                isUpdating: false, 
                validationErrors: conflicts.errors,
                validationWarnings: conflicts.warnings 
              });
              toast.error('Cannot add item to cart', { description: conflicts.errors[0] });
              return;
            }
            if (conflicts.warnings.length > 0) {
              set({ validationWarnings: conflicts.warnings });
              conflicts.warnings.forEach(warning => toast.warning(warning));
            }
          }

          // Add item and recalculate
          const newItems = [...state.items, cartItem];
          set({ items: newItems });
          get().recalculateCart();

          // Sync with server if authenticated
          if (state.isAuthenticated) {
            await get().syncWithServer();
          }

          toast.success('Added to cart', { description: item.title });
          
        } catch (error) {
          console.error('Error adding item to cart:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to add item' });
          toast.error('Failed to add item to cart');
        } finally {
          set({ isUpdating: false });
        }
      },

      removeItem: async (itemId, itemType) => {
        const state = get();
        set({ isUpdating: true, error: null });

        try {
          const newItems = state.items.filter(
            item => !(item.id === itemId && item.type === itemType)
          );
          
          set({ items: newItems });
          get().recalculateCart();

          // Sync with server if authenticated
          if (state.isAuthenticated) {
            await get().syncWithServer();
          }

          toast.success('Removed from cart');
          
        } catch (error) {
          console.error('Error removing item from cart:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove item' });
          toast.error('Failed to remove item');
        } finally {
          set({ isUpdating: false });
        }
      },

      updateItem: async (itemId, itemType, updates) => {
        const state = get();
        set({ isUpdating: true, error: null });

        try {
          const newItems = state.items.map(item => 
            item.id === itemId && item.type === itemType 
              ? { ...item, ...updates }
              : item
          );
          
          set({ items: newItems });
          get().recalculateCart();

          // Sync with server if authenticated
          if (state.isAuthenticated) {
            await get().syncWithServer();
          }
          
        } catch (error) {
          console.error('Error updating cart item:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update item' });
          toast.error('Failed to update cart item');
        } finally {
          set({ isUpdating: false });
        }
      },

      clearCart: async () => {
        const state = get();
        set({ isUpdating: true });

        try {
          set({ 
            items: [], 
            summary: null,
            validationErrors: [],
            validationWarnings: []
          });

          // Clear server cart if authenticated
          if (state.isAuthenticated && state.clerkId) {
            try {
              await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
              });
            } catch (error) {
              console.error('Error clearing server cart:', error);
            }
          }

          toast.success('Cart cleared');
          
        } catch (error) {
          console.error('Error clearing cart:', error);
          toast.error('Failed to clear cart');
        } finally {
          set({ isUpdating: false });
        }
      },

      // ========================================
      // USER AUTHENTICATION ACTIONS
      // ========================================

      setAuthenticated: (isAuth, clerkId) => {
        set({ 
          isAuthenticated: isAuth, 
          clerkId: clerkId || null 
        });

        // Trigger sync if user just signed in
        if (isAuth && clerkId) {
          get().mergeLocalCartOnSignIn(clerkId);
        }
      },

      mergeLocalCartOnSignIn: async (clerkId) => {
        const state = get();
        set({ isSyncing: true });

        try {
          // Get server cart
          const response = await fetch('/api/cart');
          let serverCart: CartData | null = null;
          
          if (response.ok) {
            const data = await response.json();
            serverCart = data.cart_data || null;
          }

          // Merge logic: Local cart takes precedence, but avoid duplicates
          if (serverCart && serverCart.items && serverCart.items.length > 0) {
            const mergedItems = [...state.items];
            
            for (const serverItem of serverCart.items) {
              const existsInLocal = mergedItems.some(
                localItem => localItem.id === serverItem.id && localItem.type === serverItem.type
              );
              
              if (!existsInLocal) {
                mergedItems.push(serverItem);
              }
            }

            set({ items: mergedItems });
            get().recalculateCart();
            
            if (mergedItems.length > state.items.length) {
              toast.success('Cart synced with your account');
            }
          }

          // Sync the merged cart back to server
          await get().syncWithServer();
          
        } catch (error) {
          console.error('Error merging cart on sign in:', error);
          set({ error: 'Failed to sync cart with account' });
        } finally {
          set({ isSyncing: false });
        }
      },

      syncWithServer: async () => {
        const state = get();
        
        if (!state.isAuthenticated || !state.clerkId) return;

        try {
          const cartData: CartData = {
            items: state.items,
            summary: state.summary ?? undefined,
          };

          const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_data: cartData }),
          });

          if (!response.ok) {
            throw new Error('Failed to sync cart with server');
          }
          
        } catch (error) {
          console.error('Error syncing cart with server:', error);
          // Don't show error to user for background sync failures
        }
      },

      // ========================================
      // VALIDATION
      // ========================================

      validateCart: async () => {
        const state = get();
        
        if (!state.isAuthenticated || !state.clerkId) {
          set({ validationErrors: [], validationWarnings: [] });
          return;
        }

        try {
          const response = await fetch('/api/cart/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: state.items }),
          });

          if (response.ok) {
            const validation = await response.json();
            set({
              validationErrors: validation.errors || [],
              validationWarnings: validation.warnings || []
            });
          }
          
        } catch (error) {
          console.error('Error validating cart:', error);
        }
      },

      checkItemConflicts: async (newItem) => {
        const state = get();
        
        if (!state.isAuthenticated || !state.clerkId) {
          return { canAdd: true, warnings: [], errors: [] };
        }

        try {
          const response = await fetch('/api/enrollments/check-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: newItem.id }),
          });

          if (response.ok) {
            const { data }: { data: CourseAccessInfo } = await response.json();
            
            if (data.has_access) {
              return {
                canAdd: false,
                errors: ['You already own this item'],
                warnings: []
              };
            }
          }

          return { canAdd: true, warnings: [], errors: [] };
          
        } catch (error) {
          console.error('Error checking item conflicts:', error);
          return { canAdd: true, warnings: [], errors: [] };
        }
      },

      // ========================================
      // CALCULATIONS
      // ========================================

      recalculateCart: () => {
        const state = get();
        
        if (state.items.length === 0) {
          set({ summary: null });
          get()._persistCart();
          return;
        }

        // Calculate BYOB tier
        const courseCount = state.items.filter(item => item.type === 'course').length;
        const byobTier = calculateBYOBTier(courseCount);
        const discountRate = getBYOBDiscountRate(byobTier);
        const validityMonths = getBYOBValidityMonths(byobTier);

        // Update course items with BYOB validity and pricing
        const updatedItems = state.items.map(item => {
          if (item.type === 'course') {
            const discountedPrice = item.original_price * (1 - discountRate);
            return {
              ...item,
              price: discountedPrice,
              validity_months: validityMonths,
            };
          }
          return item; // Bundles unchanged
        });

        // Calculate totals
        const subtotal = updatedItems.reduce((sum, item) => sum + item.original_price, 0);
        const discountAmount = subtotal * discountRate;
        const total = subtotal - discountAmount;

        const summary: CartSummary = {
          subtotal,
          discount_amount: discountAmount,
          total,
          byob_tier: byobTier,
        };

        set({ 
          items: updatedItems,
          summary 
        });
        
        get()._persistCart();
      },

      getBYOBDiscount: () => {
        const state = get();
        const courseCount = state.items.filter(item => item.type === 'course').length;
        const tier = calculateBYOBTier(courseCount);
        
        return {
          tier,
          discountRate: getBYOBDiscountRate(tier),
          validityMonths: getBYOBValidityMonths(tier),
        };
      },

      // ========================================
      // UTILITIES
      // ========================================

      getItemCount: () => {
        return get().items.length;
      },

      hasItem: (itemId, itemType) => {
        return get().items.some(item => item.id === itemId && item.type === itemType);
      },

      getCartTotal: () => {
        return get().summary?.total || 0;
      },

      // ========================================
      // INTERNAL METHODS
      // ========================================

      _updateSummary: () => {
        get().recalculateCart();
      },

      _persistCart: () => {
        // Persistence is handled by zustand persist middleware
      },

      _loadFromStorage: () => {
        // Loading is handled by zustand persist middleware
        get().recalculateCart();
      },
    }),
    {
      name: 'immigreat-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data for anonymous users
        items: state.items,
        summary: state.summary,
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate cart after rehydration
        if (state) {
          state.recalculateCart();
        }
      },
    }
  )
);

// ========================================
// CART HOOKS
// ========================================

// Convenience hooks for common operations
export const useCartActions = () => {
  const store = useCartStore();
  return {
    addItem: store.addItem,
    removeItem: store.removeItem,
    clearCart: store.clearCart,
    validateCart: store.validateCart,
  };
};

export const useCartState = () => {
  const store = useCartStore();
  return {
    items: store.items,
    summary: store.summary,
    itemCount: store.getItemCount(),
    total: store.getCartTotal(),
    isLoading: store.isLoading,
    isUpdating: store.isUpdating,
    error: store.error,
    validationErrors: store.validationErrors,
    validationWarnings: store.validationWarnings,
  };
};

export const useCartUtils = () => {
  const store = useCartStore();
  return {
    hasItem: store.hasItem,
    getBYOBDiscount: store.getBYOBDiscount,
    isEmpty: store.items.length === 0,
    canCheckout: store.items.length > 0 && store.validationErrors.length === 0,
  };
};