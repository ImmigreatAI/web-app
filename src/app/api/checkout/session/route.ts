// src/app/api/checkout/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CheckoutService } from '@/lib/services/checkout-service';
import { CartService } from '@/lib/services/cart.service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      userEmail, 
      userName, 
      successUrl, 
      cancelUrl,
      checkoutType, // 'cart' or 'buy_now'
      singleItem, // For buy now
    } = body;

    // Validate required fields
    if (!userEmail || !userName || !successUrl || !cancelUrl || !checkoutType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const checkoutService = new CheckoutService();
    let session;

    if (checkoutType === 'buy_now') {
      // Buy Now - Single item purchase
      if (!singleItem) {
        return NextResponse.json(
          { error: 'Single item data required for buy now checkout' },
          { status: 400 }
        );
      }

      session = await checkoutService.createCheckoutSession({
        clerkId: userId,
        userEmail,
        userName,
        singleItem,
        successUrl,
        cancelUrl,
      });

    } else if (checkoutType === 'cart') {
      // Cart checkout - Multiple items
      const cartService = new CartService();
      const cart = await cartService.getUserCart(userId);

      if (!cart || !cart.cart_data.items || cart.cart_data.items.length === 0) {
        return NextResponse.json(
          { error: 'Cart is empty' },
          { status: 400 }
        );
      }

      // Validate cart items (check ownership, conflicts, etc.)
      const validation = await cartService.validateCartItems(userId, cart.cart_data.items);
      if (!validation.valid) {
        return NextResponse.json(
          { 
            error: 'Cart validation failed',
            details: validation.errors,
            warnings: validation.warnings 
          },
          { status: 400 }
        );
      }

      session = await checkoutService.createCheckoutSession({
        clerkId: userId,
        userEmail,
        userName,
        cartData: cart.cart_data,
        successUrl,
        cancelUrl,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid checkout type' },
        { status: 400 }
      );
    }

    // Return session details
    return NextResponse.json({
      success: true,
      data: session,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle GET request for session status (unchanged)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchase_id');

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      );
    }

    // Get purchase status
    const checkoutService = new CheckoutService();
    const purchase = await checkoutService.getPurchaseById(purchaseId);

    if (!purchase || purchase.clerk_id !== userId) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Return purchase status
    return NextResponse.json({
      success: true,
      data: {
        purchase_id: purchase.id,
        status: purchase.processing_status,
        items_count: (purchase.items_purchased?.courses?.length || 0) + (purchase.items_purchased?.bundles?.length || 0),
        amount_paid: purchase.amount_paid,
        purchased_at: purchase.purchased_at,
        processing_started_at: purchase.processing_started_at,
        processing_completed_at: purchase.processing_completed_at,
        queue_metadata: purchase.queue_metadata,
      },
    });

  } catch (error) {
    console.error('Error fetching purchase status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase status',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}