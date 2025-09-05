import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import {
  CartData,
  CartItem,
  ProcessingStatus,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PurchaseItemsData,
} from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// NOTE: We rely on the imported types (CheckoutSessionRequest, CheckoutSessionResponse, PurchaseItemsData).

export class CheckoutService {
  private supabaseAdmin;

  constructor() {
    this.supabaseAdmin = createServiceClient();
  }

  /**
   * Create Stripe checkout session with proper metadata
   */
  async createCheckoutSession({
    clerkId,
    userEmail,
    userName,
    cartData,
    singleItem,
    successUrl,
    cancelUrl,
  }: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      // Support both Buy Now (singleItem) and Cart checkout (cartData)
      let effectiveCart: CartData | undefined = cartData;

      if (!effectiveCart && singleItem) {
        // Hydrate a minimal cart from the single item
        const hydratedItem: CartItem = {
          id: singleItem.id,
          type: singleItem.type,
          title: singleItem.title,
          thumbnail_url: singleItem.thumbnailUrl ?? null,
          original_price: singleItem.price,
          price: singleItem.price,
          enrollment_id: singleItem.enrollmentId,
          validity_months: singleItem.type === 'course' ? 3 : singleItem.validityMonths,
        };

        effectiveCart = {
          items: [hydratedItem],
          summary: {
            subtotal: hydratedItem.original_price,
            discount_amount: 0,
            total: hydratedItem.price,
            byob_tier: null,
          },
        };
      }

      // Validate cart data (handle possibly-undefined)
      if (!effectiveCart || !effectiveCart.items || effectiveCart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      if (!effectiveCart.summary) {
        throw new Error('Cart summary is missing');
      }

      // Resolve final enrollment IDs and validity for course items
      const resolvedCart = await this.resolveFinalCartData(effectiveCart);

      // Pre-create purchase record to get ID for tracking
      const purchaseType = this.determinePurchaseType(resolvedCart.items);
      const purchaseId = await this.createPendingPurchase(clerkId, resolvedCart, purchaseType);

      // Prepare line items for Stripe
      const lineItems = this.createStripeLineItems(resolvedCart.items);

      // Prepare metadata for the session
      const metadata = this.attachMetadata({
        clerkId,
        purchaseId,
        cartData: resolvedCart,
      });

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&purchase_id=${purchaseId}`,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        metadata,
        // Additional session configuration
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['US'], // Adjust as needed
        },
        payment_intent_data: {
          metadata, // Also add to payment intent
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session URL');
      }

      // Update purchase record with session ID
      await this.updatePurchaseWithSessionId(purchaseId, session.id);

      return {
        sessionId: session.id,
        url: session.url,
        purchaseId,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Resolve final validity and enrollment IDs for course items using BYOB rules
   */
  private async resolveFinalCartData(cartData: CartData): Promise<CartData> {
    const items = cartData.items;

    const courseItems = items.filter((i) => i.type === 'course');
    const bundleItems = items.filter((i) => i.type === 'bundle');

    const courseCount = courseItems.length;
    const validityMonths = courseCount >= 10 ? 9 : courseCount >= 5 ? 6 : 3;

    if (courseItems.length === 0) {
      // No courses, return as-is
      return cartData;
    }

    // Fetch enrollment_ids for all course IDs
    const courseIds = courseItems.map((i) => i.id);
    const { data: courses, error } = await this.supabaseAdmin
      .from('courses')
      .select('id, enrollment_ids')
      .in('id', courseIds);

    if (error) {
      throw error;
    }

    const enrollmentMap = new Map<string, { three_month: string; six_month: string; nine_month: string }>();
    (courses || []).forEach((c: any) => {
      if (c?.id && c?.enrollment_ids) {
        enrollmentMap.set(c.id, c.enrollment_ids);
      }
    });

    const updatedCourseItems: CartItem[] = courseItems.map((item) => {
      const ids = enrollmentMap.get(item.id);
      let newEnrollmentId = item.enrollment_id;
      if (ids) {
        newEnrollmentId = validityMonths === 9 ? ids.nine_month : validityMonths === 6 ? ids.six_month : ids.three_month;
      }

      return {
        ...item,
        validity_months: validityMonths,
        enrollment_id: newEnrollmentId,
      };
    });

    return {
      ...cartData,
      items: [...updatedCourseItems, ...bundleItems],
    };
  }

  /**
   * Attach metadata to Stripe session for processing
   */
  private attachMetadata({
    clerkId,
    purchaseId,
    cartData,
  }: {
    clerkId: string;
    purchaseId: string;
    cartData: CartData;
  }): Record<string, string> {
    // Stripe metadata has a 500 character limit per key and 40 keys max
    // We'll store minimal data and use the purchaseId to lookup full details

    return {
      clerk_id: clerkId,
      purchase_id: purchaseId,
      item_count: cartData.items.length.toString(),
      total_amount: (cartData.summary?.total || 0).toString(),
      byob_tier: cartData.summary?.byob_tier || 'none',
      purchase_type: this.determinePurchaseType(cartData.items),
      // Add any other minimal tracking data needed
    };
  }

  /**
   * Handle successful payment (called by webhook)
   */
  async handleSuccessfulPayment(sessionId: string): Promise<{
    success: boolean;
    purchaseId?: string;
    error?: string;
  }> {
    try {
      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'customer'],
      });

      if (session.payment_status !== 'paid') {
        throw new Error('Payment not completed');
      }

      const purchaseId = session.metadata?.purchase_id;
      if (!purchaseId) {
        throw new Error('Purchase ID not found in session metadata');
      }

      // Update purchase record with payment completion
      await this.completePurchasePayment(purchaseId, session);

      return {
        success: true,
        purchaseId,
      };
    } catch (error) {
      console.error('Error handling successful payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create pending purchase record (before payment)
   */
  private async createPendingPurchase(
    clerkId: string,
    cartData: CartData,
    purchaseType: string
  ): Promise<string> {
    try {
      const itemsPurchased = this.transformCartToItemsData(cartData);

      const { data, error } = await this.supabaseAdmin
        .from('user_purchases')
        .insert({
          clerk_id: clerkId,
          purchase_type: purchaseType,
          amount_paid: cartData.summary?.total || 0,
          currency: 'USD',
          items_purchased: itemsPurchased,
          processing_status: 'pending',
          queue_metadata: {
            created_from: 'checkout_session',
            checkout_type: purchaseType,
            cart_item_count: cartData.items.length,
          },
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating pending purchase:', error);
      throw error;
    }
  }

  /**
   * Update purchase with Stripe session ID after session creation
   */
  private async updatePurchaseWithSessionId(purchaseId: string, sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabaseAdmin
        .from('user_purchases')
        .update({
          stripe_session_id: sessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating purchase with session ID:', error);
      throw error;
    }
  }

  /**
   * Complete purchase after successful payment
   */
  private async completePurchasePayment(
    purchaseId: string,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

      const { error } = await this.supabaseAdmin
        .from('user_purchases')
        .update({
          stripe_payment_intent_id: paymentIntent?.id,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          processing_status: 'pending', // Ready for queue processing
          purchased_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          queue_metadata: {
            payment_completed_at: new Date().toISOString(),
            session_mode: session.mode,
            payment_status: session.payment_status,
          },
        })
        .eq('id', purchaseId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error completing purchase payment:', error);
      throw error;
    }
  }

  /**
   * Transform cart data to purchase items format
   */
  private transformCartToItemsData(cartData: CartData): PurchaseItemsData {
    const courses = cartData.items
      .filter((item) => item.type === 'course')
      .map((item) => ({
        course_id: item.id,
        title: item.title,
        price_paid: item.price,
        enrollment_id_to_use: item.enrollment_id,
        validity_months: item.validity_months,
      }));

    const bundles = cartData.items
      .filter((item) => item.type === 'bundle')
      .map((item) => ({
        bundle_id: item.id,
        title: item.title,
        price_paid: item.price,
        enrollment_id: item.enrollment_id,
        validity_months: item.validity_months,
        course_ids: [], // Will be populated from bundle data
      }));

    return {
      courses,
      bundles,
      byob_applied: cartData.summary?.byob_tier
        ? {
            tier: cartData.summary.byob_tier,
            discount_rate: this.getBYOBDiscountRate(cartData.summary.byob_tier),
            original_validity: 3, // Default
            upgraded_validity: this.getBYOBValidityUpgrade(cartData.summary.byob_tier),
          }
        : undefined,
      discount_details: {
        subtotal: cartData.summary?.subtotal || 0,
        discount_amount: cartData.summary?.discount_amount || 0,
        total: cartData.summary?.total || 0,
      },
    };
  }

  /**
   * Create Stripe line items from cart items
   */
  private createStripeLineItems(items: CartItem[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
    return items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: `${item.type === 'course' ? 'Course' : 'Bundle'} - ${item.validity_months} months access`,
          images: item.thumbnail_url ? [item.thumbnail_url] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: 1,
    }));
  }

  /**
   * Determine purchase type from cart items
   */
  private determinePurchaseType(items: CartItem[]): string {
    const courseCount = items.filter((item) => item.type === 'course').length;
    const bundleCount = items.filter((item) => item.type === 'bundle').length;

    if (bundleCount > 0 && courseCount > 0) {
      return 'mixed'; // Both courses and bundles
    } else if (bundleCount > 0) {
      return bundleCount === 1 ? 'bundle' : 'bundles';
    } else if (courseCount > 0) {
      return courseCount >= 5 ? 'byob' : courseCount === 1 ? 'course' : 'courses';
    }

    return 'unknown';
    }

  /**
   * Get BYOB discount rate
   */
  private getBYOBDiscountRate(tier: '5plus' | '10plus' | null): number {
    switch (tier) {
      case '10plus':
        return 0.18;
      case '5plus':
        return 0.13;
      default:
        return 0;
    }
  }

  /**
   * Get BYOB validity upgrade
   */
  private getBYOBValidityUpgrade(tier: '5plus' | '10plus' | null): number {
    switch (tier) {
      case '10plus':
        return 9;
      case '5plus':
        return 6;
      default:
        return 3;
    }
  }

  /**
   * Get purchase by ID (for status checking)
   */
  async getPurchaseById(purchaseId: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('user_purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching purchase:', error);
      throw error;
    }
  }

  /**
   * Update purchase processing status (used by webhook and queue system)
   */
  async updatePurchaseStatus(
    purchaseId: string,
    status: ProcessingStatus,
    queueMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status,
        updated_at: new Date().toISOString(),
      };

      if (queueMetadata) {
        updateData.queue_metadata = queueMetadata;
      }

      if (status === 'processing') {
        updateData.processing_started_at = new Date().toISOString();
      } else if (['completed', 'failed', 'partial'].includes(status)) {
        updateData.processing_completed_at = new Date().toISOString();
      }

      const { error } = await this.supabaseAdmin.from('user_purchases').update(updateData).eq('id', purchaseId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
      throw error;
    }
  }

  /**
   * Get pending purchases for queue processing
   */
  async getPendingPurchases(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('user_purchases')
        .select('*')
        .eq('processing_status', 'pending')
        .order('purchased_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending purchases:', error);
      throw error;
    }
  }
}
