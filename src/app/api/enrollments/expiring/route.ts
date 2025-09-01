// src/app/api/enrollments/expiring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * GET /api/enrollments/expiring?days=30 - Get enrollments expiring soon
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
    const days = parseInt(searchParams.get('days') || '30');

    const purchaseService = new PurchaseTrackingService();
    const expiringEnrollments = await purchaseService.getEnrollmentsExpiringSoon(userId, days);

    return NextResponse.json({
      success: true,
      data: expiringEnrollments,
      meta: {
        days_ahead: days,
        count: expiringEnrollments.length,
      },
    });

  } catch (error) {
    console.error('Error fetching expiring enrollments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch expiring enrollments',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
