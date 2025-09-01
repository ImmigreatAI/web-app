// src/app/api/purchases/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * GET /api/purchases/stats - Get user's purchase statistics
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

    const purchaseService = new PurchaseTrackingService();
    const stats = await purchaseService.getUserPurchaseStats(userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error fetching purchase stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase stats',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}