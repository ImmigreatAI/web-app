import { BaseService } from './base.service';
import { Cart, CartData, CartItem, CartSummary, BYOBTier } from '@/lib/types';

export class CartService extends BaseService {
  // No constructor needed - uses BaseService

  async getUserCart(clerkId: string): Promise<Cart | null> {
    try {
      const { data, error } = await this.supabase
        .from('carts')
        .select('*')
        .eq('clerk_id', clerkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  async updateUserCart(clerkId: string, cartData: CartData): Promise<Cart> {
    try {
      const { data, error } = await this.supabase
        .from('carts')
        .upsert({
          clerk_id: clerkId,
          cart_data: cartData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }

  async clearUserCart(clerkId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('carts')
        .delete()
        .eq('clerk_id', clerkId);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  async addToCart(clerkId: string, item: CartItem): Promise<Cart> {
    try {
      const currentCart = await this.getUserCart(clerkId);
      let items: CartItem[] = [];
      
      if (currentCart?.cart_data?.items) {
        const existingItemIndex = currentCart.cart_data.items.findIndex(
          existingItem => existingItem.id === item.id && existingItem.type === item.type
        );

        if (existingItemIndex >= 0) {
          items = currentCart.cart_data.items;
        } else {
          items = [...currentCart.cart_data.items, item];
        }
      } else {
        items = [item];
      }

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

  async removeFromCart(clerkId: string, itemId: string, itemType: 'course' | 'bundle'): Promise<Cart> {
    try {
      const currentCart = await this.getUserCart(clerkId);
      
      if (!currentCart?.cart_data?.items) {
        throw new Error('Cart not found');
      }

      const items = currentCart.cart_data.items.filter(
        item => !(item.id === itemId && item.type === itemType)
      );

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

  calculateCartTotals(items: CartItem[]): CartSummary {
    const subtotal = items.reduce((sum, item) => sum + item.original_price, 0);
    let discountRate = 0;
    let byobTier: BYOBTier = null;

    const courseItems = items.filter(item => item.type === 'course');
    const courseCount = courseItems.length;

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

  applyBYOBRules(items: CartItem[]): CartItem[] {
    const courseItems = items.filter(item => item.type === 'course');
    const bundleItems = items.filter(item => item.type === 'bundle');
    const courseCount = courseItems.length;

    let validityMonths = 3;
    
    if (courseCount >= 10) {
      validityMonths = 9;
    } else if (courseCount >= 5) {
      validityMonths = 6;
    }

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
      };
    });

    return [...updatedCourseItems, ...bundleItems];
  }

  async validateCartItems(clerkId: string, items: CartItem[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

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