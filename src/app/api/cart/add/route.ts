// src/app/api/cart/add/route.ts - Add item to cart with validation
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
    const { 
      item,
      skip_ownership_check = false 
    }: { 
      item: Omit<CartItem, 'validity_months'>;
      skip_ownership_check?: boolean;
    } = body;

    // Validate item structure
    if (!item || !item.id || !item.type || !item.title || !item.price) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid item data',
          message: 'Item must include id, type, title, and price'
        },
        { status: 400 }
      );
    }

    if (!['course', 'bundle'].includes(item.type)) {
      return NextResponse.json(
        { success: false, error: 'Item type must be "course" or "bundle"' },
        { status: 400 }
      );
    }

    const cartService = new CartService();

    // Check ownership before adding (unless skipped)
    if (!skip_ownership_check) {
      const purchaseService = new PurchaseTrackingService();
      
      if (item.type === 'course') {
        const access = await purchaseService.checkCourseAccess(userId, item.id);
        if (access.has_access) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Item already owned',
              message: `You already have access to "${item.title}"`,
              access_info: access,
            },
            { status: 409 }
          );
        }
      } else if (item.type === 'bundle') {
        // Check bundle ownership
        const enrollments = await purchaseService.getUserActiveEnrollments(userId);
        const hasBundle = enrollments.some(enrollment => 
          enrollment.enrollment_type === 'bundle' && enrollment.item_id === item.id
        );
        
        if (hasBundle) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Bundle already owned',
              message: `You already have access to the "${item.title}" bundle`,
            },
            { status: 409 }
          );
        }
      }
    }

    // Check if item already in cart
    const currentCart = await cartService.getUserCart(userId);
    if (currentCart?.cart_data?.items) {
      const existingItem = currentCart.cart_data.items.find(
        cartItem => cartItem.id === item.id && cartItem.type === item.type
      );
      
      if (existingItem) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Item already in cart',
            message: `"${item.title}" is already in your cart`,
          },
          { status: 409 }
        );
      }
    }

    // Create cart item with default validity (will be recalculated)
    const cartItem: CartItem = {
      ...item,
      validity_months: 3, // Default, will be updated by BYOB logic
    };

    // Add item to cart
    const updatedCart = await cartService.addToCart(userId, cartItem);
    
    return NextResponse.json({
      success: true,
      data: updatedCart,
      message: `"${item.title}" added to cart`,
    });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add item to cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


