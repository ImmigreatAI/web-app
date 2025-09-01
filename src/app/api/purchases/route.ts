
// src/app/api/purchases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * GET /api/purchases - Get user's purchase history with enrollments
 */
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
    const includeEnrollments = searchParams.get('include_enrollments') === 'true';

    const purchaseService = new PurchaseTrackingService();
    
    const purchases = includeEnrollments
      ? await purchaseService.getUserPurchasesWithEnrollments(userId)
      : await purchaseService.getUserPurchases(userId);

    return NextResponse.json({
      success: true,
      data: purchases,
    });

  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchases',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

