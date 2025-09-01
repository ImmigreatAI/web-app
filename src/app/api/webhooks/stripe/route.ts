// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { CheckoutService } from '@/lib/services/checkout-service';
import { CartService } from '@/lib/services/cart.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Log the event type
    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session completion
 * This is the main event we care about for course purchases
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`Processing checkout session: ${session.id}`);

    // Ensure payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`Checkout session ${session.id} payment not completed: ${session.payment_status}`);
      return;
    }

    // Process the successful payment
    const checkoutService = new CheckoutService();
    const result = await checkoutService.handleSuccessfulPayment(session.id);

    if (!result.success) {
      console.error(`Failed to handle successful payment for session ${session.id}:`, result.error);
      return;
    }

    console.log(`Successfully processed payment for purchase ${result.purchaseId}`);

    // Clear the user's cart after successful payment
    if (session.metadata?.clerk_id) {
      try {
        const cartService = new CartService();
        await cartService.clearUserCart(session.metadata.clerk_id);
        console.log(`Cleared cart for user ${session.metadata.clerk_id}`);
      } catch (cartError) {
        // Don't fail the webhook if cart clearing fails
        console.error('Error clearing cart:', cartError);
      }
    }

    // TODO: Add to queue for enrollment processing
    // This would trigger the queue system to process enrollments
    console.log(`Purchase ${result.purchaseId} ready for enrollment processing`);

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 * Additional confirmation that payment was successful
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    
    // You might want to update purchase records with additional payment details
    // For now, just log for monitoring
    console.log(`Payment amount: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
    
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle failed payment intent
 * Update purchase status if payment fails
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent failed: ${paymentIntent.id}`);
    console.log('Failure reason:', paymentIntent.last_payment_error?.message);

    // TODO: Update purchase status to failed
    // You might want to mark the associated purchase as failed
    
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

/**
 * Handle invoice payment succeeded
 * For future subscription or installment features
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    
    // Handle recurring payments or installments if implemented
    
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

/**
 * Utility function to safely get metadata
 */
function getMetadata(object: any, key: string): string | undefined {
  return object.metadata?.[key] || undefined;
}

/**
 * Utility function to log webhook events for debugging
 */
function logWebhookEvent(event: Stripe.Event) {
  console.log(`Stripe Webhook Event: ${event.type}`, {
    id: event.id,
    created: event.created,
    livemode: event.livemode,
  });
}