// src/app/api/cart/route.ts - Enhanced with POST for updating entire cart
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CartService } from '@/lib/services/cart.service';
import { CartData } from '@/lib/types';

/**
 * GET /api/cart - Fetch user's cart
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cartService = new CartService();
    const cart = await cartService.getUserCart(userId);
    
    return NextResponse.json({
      success: true,
      data: cart || { 
        id: null,
        clerk_id: userId,
        cart_data: { items: [], summary: null },
        updated_at: new Date().toISOString()
      },
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart - Update entire cart
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cart_data }: { cart_data: CartData } = body;

    if (!cart_data) {
      return NextResponse.json(
        { success: false, error: 'Cart data is required' },
        { status: 400 }
      );
    }

    // Validate cart data structure
    if (!Array.isArray(cart_data.items)) {
      return NextResponse.json(
        { success: false, error: 'Cart items must be an array' },
        { status: 400 }
      );
    }

    const cartService = new CartService();
    
    // Validate cart items before updating
    const validation = await cartService.validateCartItems(userId, cart_data.items);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cart validation failed',
          validation_errors: validation.errors,
          validation_warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Update cart
    const updatedCart = await cartService.updateUserCart(userId, cart_data);
    
    return NextResponse.json({
      success: true,
      data: updatedCart,
      validation_warnings: validation.warnings,
    });

  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart - Clear user's cart
 */
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cartService = new CartService();
    await cartService.clearUserCart(userId);
    
    return NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear cart',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}



