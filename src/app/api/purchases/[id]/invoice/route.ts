// src/app/api/purchases/[id]/invoice/route.ts - Generate Stripe invoice URL
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: purchaseId } = params;

    if (!purchaseId) {
      return NextResponse.json(
        { success: false, error: 'Purchase ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this purchase
    const purchaseService = new PurchaseTrackingService();
    const purchase = await purchaseService.getPurchaseById(userId, purchaseId);

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Only allow invoice access for completed purchases
    if (purchase.processing_status !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invoice not available',
          message: 'Invoice is only available for completed purchases'
        },
        { status: 400 }
      );
    }

    try {
      // Get Stripe session to find payment intent
      const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id, {
        expand: ['payment_intent'],
      });

      if (!session.payment_intent) {
        throw new Error('Payment intent not found');
      }

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
      
      // Check if payment intent has an invoice
      if (paymentIntent.invoice && typeof paymentIntent.invoice === 'string') {
        // Get invoice URL
        const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);
        
        return NextResponse.json({
          success: true,
          data: {
            invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            invoice_number: invoice.number,
            status: invoice.status,
            amount_paid: invoice.amount_paid,
            created: invoice.created,
          },
        });
      } else {
        // For one-time payments, create a receipt URL from payment intent
        const charges = paymentIntent.charges?.data;
        const charge = charges && charges.length > 0 ? charges[0] : null;
        
        if (charge?.receipt_url) {
          return NextResponse.json({
            success: true,
            data: {
              receipt_url: charge.receipt_url,
              payment_intent_id: paymentIntent.id,
              amount_paid: paymentIntent.amount_received,
              created: paymentIntent.created,
              status: paymentIntent.status,
            },
          });
        } else {
          throw new Error('No receipt or invoice available');
        }
      }

    } catch (stripeError) {
      console.error('Error fetching Stripe invoice:', stripeError);
      
      return NextResponse.json({
        success: false,
        error: 'Invoice not available',
        message: 'Unable to retrieve invoice from payment processor',
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error generating invoice URL:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate invoice URL',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}