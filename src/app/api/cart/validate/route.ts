
// src/app/api/cart/validate/route.ts - Validate entire cart
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CartService } from '@/lib/services/cart.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import { CartItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items }: { items?: CartItem[] } = body;

    let cartItems = items;

    // If no items provided, get current cart
    if (!cartItems) {
      const cartService = new CartService();
      const currentCart = await cartService.getUserCart(userId);
      cartItems = currentCart?.cart_data?.items || [];
    }

    if (!Array.isArray(cartItems)) {
      return NextResponse.json(
        { success: false, error: 'Items must be an array' },
        { status: 400 }
      );
    }

    if (cartItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          valid: true,
          errors: [],
          warnings: [],
          item_count: 0,
          conflicts: [],
        },
      });
    }

    const purchaseService = new PurchaseTrackingService();
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: Array<{
      item_id: string;
      item_type: string;
      item_title: string;
      conflict_type: 'already_owned' | 'in_bundle' | 'duplicate';
      message: string;
    }> = [];

    // Check for duplicates in cart
    const seen = new Set<string>();
    for (const item of cartItems) {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) {
        errors.push(`Duplicate item in cart: ${item.title}`);
        conflicts.push({
          item_id: item.id,
          item_type: item.type,
          item_title: item.title,
          conflict_type: 'duplicate',
          message: 'This item appears multiple times in your cart',
        });
      }
      seen.add(key);
    }

    // Check ownership conflicts
    const courseItems = cartItems.filter(item => item.type === 'course');
    const bundleItems = cartItems.filter(item => item.type === 'bundle');

    // Check course ownership
    if (courseItems.length > 0) {
      const courseIds = courseItems.map(item => item.id);
      const accessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
      
      for (const item of courseItems) {
        const access = accessMap[item.id];
        if (access?.has_access) {
          const message = access.access_type === 'bundle' ? 
            `You own "${item.title}" through a bundle` :
            `You already own "${item.title}"`;
            
          errors.push(message);
          conflicts.push({
            item_id: item.id,
            item_type: item.type,
            item_title: item.title,
            conflict_type: access.access_type === 'bundle' ? 'in_bundle' : 'already_owned',
            message,
          });
        }
      }
    }

    // Check bundle ownership
    if (bundleItems.length > 0) {
      const enrollments = await purchaseService.getUserActiveEnrollments(userId);
      const ownedBundleIds = new Set(
        enrollments
          .filter(e => e.enrollment_type === 'bundle')
          .map(e => e.item_id)
      );

      for (const item of bundleItems) {
        if (ownedBundleIds.has(item.id)) {
          const message = `You already own the "${item.title}" bundle`;
          errors.push(message);
          conflicts.push({
            item_id: item.id,
            item_type: item.type,
            item_title: item.title,
            conflict_type: 'already_owned',
            message,
          });
        }
      }
    }

    // Generate warnings for potential issues
    if (courseItems.length >= 5 && courseItems.length < 10) {
      warnings.push(`Add ${10 - courseItems.length} more courses to get 18% off (currently 13% off)`);
    }

    // Price validation warnings
    for (const item of cartItems) {
      if (item.price <= 0) {
        warnings.push(`Invalid price for "${item.title}"`);
      }
      
      if (item.price !== item.original_price && item.original_price > 0) {
        const discount = ((item.original_price - item.price) / item.original_price) * 100;
        if (discount > 50) {
          warnings.push(`Large discount applied to "${item.title}" (${discount.toFixed(0)}% off)`);
        }
      }
    }

    const validationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      item_count: cartItems.length,
      conflicts,
      course_count: courseItems.length,
      bundle_count: bundleItems.length,
      byob_eligible: courseItems.length >= 5,
      byob_tier: courseItems.length >= 10 ? '10plus' : courseItems.length >= 5 ? '5plus' : null,
    };

    return NextResponse.json({
      success: true,
      data: validationResult,
    });

  } catch (error) {
    console.error('Error validating cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to validate cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}