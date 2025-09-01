// src/app/api/enrollments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * GET /api/enrollments - Get user's active enrollments
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
    
    const enrollments = includeExpired 
      ? await purchaseService.getUserAllEnrollments(userId)
      : await purchaseService.getUserActiveEnrollments(userId);

    // Calculate days until expiry for active enrollments
    const enrichedEnrollments = enrollments.map(enrollment => ({
      ...enrollment,
      days_until_expiry: new Date(enrollment.expires_at) > new Date() 
        ? Math.ceil((new Date(enrollment.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return NextResponse.json({
      success: true,
      data: enrichedEnrollments,
    });

  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch enrollments',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

