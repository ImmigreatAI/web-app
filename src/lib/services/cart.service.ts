import { createClient as createServerClient } from '@/lib/supabase/server';
import { Cart, CartData, CartItem, CartSummary, BYOBTier } from '@/lib/types';

export class CartService {

  constructor() {
  }

  private async getSupabaseClient() {
    return await createServerClient();
  }

  /**
   * Get user's cart from database
   */
  async getUserCart(clerkId: string): Promise<Cart | null> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('carts')
        .select('*')
        .eq('clerk_id', clerkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No cart exists
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  /**
   * Update user's cart in database
   */
  async updateUserCart(clerkId: string, cartData: CartData): Promise<Cart> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('carts')
        .upsert({
          clerk_id: clerkId,
          cart_data: cartData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }

  /**
   * Clear user's cart
   */
  async clearUserCart(clerkId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('clerk_id', clerkId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(clerkId: string, item: CartItem): Promise<Cart> {
    try {
      // Get current cart
      const currentCart = await this.getUserCart(clerkId);
      
      let items: CartItem[] = [];
      
      if (currentCart?.cart_data?.items) {
        // Check if item already exists
        const existingItemIndex = currentCart.cart_data.items.findIndex(
          existingItem => existingItem.id === item.id && existingItem.type === item.type
        );

        if (existingItemIndex >= 0) {
          // Item already exists, don't add duplicate
          items = currentCart.cart_data.items;
        } else {
          // Add new item
          items = [...currentCart.cart_data.items, item];
        }
      } else {
        // New cart
        items = [item];
      }

      // Apply BYOB rules and calculate totals
      const updatedItems = this.applyBYOBRules(items);
      const summary = this.calculateCartTotals(updatedItems);

      const cartData: CartData = {
        items: updatedItems,
        summary,
      };

      return await this.updateUserCart(clerkId, cartData);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(clerkId: string, itemId: string, itemType: 'course' | 'bundle'): Promise<Cart> {
    try {
      const currentCart = await this.getUserCart(clerkId);
      
      if (!currentCart?.cart_data?.items) {
        throw new Error('Cart not found');
      }

      // Remove item
      const items = currentCart.cart_data.items.filter(
        item => !(item.id === itemId && item.type === itemType)
      );

      // Apply BYOB rules and calculate totals
      const updatedItems = this.applyBYOBRules(items);
      const summary = this.calculateCartTotals(updatedItems);

      const cartData: CartData = {
        items: updatedItems,
        summary,
      };

      return await this.updateUserCart(clerkId, cartData);
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  /**
   * Calculate cart totals with BYOB discounts
   */
  calculateCartTotals(items: CartItem[]): CartSummary {
    const subtotal = items.reduce((sum, item) => sum + item.original_price, 0);
    let discountRate = 0;
    let byobTier: BYOBTier = null;

    // Only apply BYOB to course items (not bundles)
    const courseItems = items.filter(item => item.type === 'course');
    const courseCount = courseItems.length;

    // BYOB discount logic
    if (courseCount >= 10) {
      discountRate = 0.18;
      byobTier = '10plus';
    } else if (courseCount >= 5) {
      discountRate = 0.13;
      byobTier = '5plus';
    }

    const discountAmount = subtotal * discountRate;
    const total = subtotal - discountAmount;

    return {
      subtotal,
      discount_amount: discountAmount,
      total,
      byob_tier: byobTier,
    };
  }

  /**
   * Apply BYOB rules to items (upgrade validity and enrollment IDs)
   */
  applyBYOBRules(items: CartItem[]): CartItem[] {
    const courseItems = items.filter(item => item.type === 'course');
    const bundleItems = items.filter(item => item.type === 'bundle');
    const courseCount = courseItems.length;

    let validityMonths = 3; // Default
    
    // Determine validity upgrade based on course count
    if (courseCount >= 10) {
      validityMonths = 9;
    } else if (courseCount >= 5) {
      validityMonths = 6;
    }

    // Update course items with new validity and pricing
    const updatedCourseItems = courseItems.map(item => {
      let discountRate = 0;
      
      if (courseCount >= 10) {
        discountRate = 0.18;
      } else if (courseCount >= 5) {
        discountRate = 0.13;
      }

      const discountedPrice = item.original_price * (1 - discountRate);

      return {
        ...item,
        validity_months: validityMonths,
        price: discountedPrice,
        // Note: enrollment_id would be updated based on validity
        // This would require course data to determine correct enrollment ID
      };
    });

    // Bundle items are not affected by BYOB rules
    return [...updatedCourseItems, ...bundleItems];
  }

  /**
   * Get validity tier based on cart quantity
   */
  determineValidityFromCart(items: CartItem[]): number {
    const courseCount = items.filter(item => item.type === 'course').length;
    
    if (courseCount >= 10) return 9;
    if (courseCount >= 5) return 6;
    return 3;
  }

  /**
   * Validate cart items (check for conflicts, ownership, etc.)
   */
  async validateCartItems(clerkId: string, items: CartItem[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // This would integrate with EnrollmentService to check ownership
    // For now, basic validation
    
    const duplicateCheck = new Set();
    for (const item of items) {
      const key = `${item.type}-${item.id}`;
      if (duplicateCheck.has(key)) {
        errors.push(`Duplicate item detected: ${item.title}`);
      }
      duplicateCheck.add(key);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}