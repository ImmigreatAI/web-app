// src/app/api/cart/remove/route.ts - Remove item from cart
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CartService } from '@/lib/services/cart.service';

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const itemType = searchParams.get('item_type') as 'course' | 'bundle';

    if (!itemId || !itemType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters',
          message: 'Both item_id and item_type are required'
        },
        { status: 400 }
      );
    }

    if (!['course', 'bundle'].includes(itemType)) {
      return NextResponse.json(
        { success: false, error: 'Item type must be "course" or "bundle"' },
        { status: 400 }
      );
    }

    const cartService = new CartService();
    
    // Check if item exists in cart
    const currentCart = await cartService.getUserCart(userId);
    if (!currentCart?.cart_data?.items) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cart is empty',
          message: 'No items to remove'
        },
        { status: 404 }
      );
    }

    const itemExists = currentCart.cart_data.items.some(
      item => item.id === itemId && item.type === itemType
    );

    if (!itemExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Item not found in cart',
          message: 'The specified item is not in your cart'
        },
        { status: 404 }
      );
    }

    // Remove item from cart
    const updatedCart = await cartService.removeFromCart(userId, itemId, itemType);
    
    return NextResponse.json({
      success: true,
      data: updatedCart,
      message: 'Item removed from cart',
    });

  } catch (error) {
    console.error('Error removing item from cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to remove item from cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


