import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * GET /api/enrollments/with-purchase - Get enrollments with purchase context
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
    const includeExpired = searchParams.get('include_expired') === 'true';

    const purchaseService = new PurchaseTrackingService();
    const enrollments = await purchaseService.getUserEnrollmentsWithPurchase(userId);

    // Filter expired if requested
    const filteredEnrollments = includeExpired 
      ? enrollments 
      : enrollments.filter(enrollment => 
          enrollment.is_active && new Date(enrollment.expires_at) > new Date()
        );

    return NextResponse.json({
      success: true,
      data: filteredEnrollments,
      meta: {
        total_count: enrollments.length,
        returned_count: filteredEnrollments.length,
        includes_expired: includeExpired,
      },
    });

  } catch (error) {
    console.error('Error fetching enrollments with purchase:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch enrollments with purchase',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}