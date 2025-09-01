// src/app/api/enrollments/check-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

/**
 * POST /api/enrollments/check-access - Check course access for user
 * Body: { courseIds: string[] } or { courseId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId, courseIds } = body;

    if (!courseId && !courseIds) {
      return NextResponse.json(
        { error: 'Either courseId or courseIds must be provided' },
        { status: 400 }
      );
    }

    const purchaseService = new PurchaseTrackingService();

    if (courseId) {
      // Single course access check
      const access = await purchaseService.checkCourseAccess(userId, courseId);
      return NextResponse.json({
        success: true,
        data: access,
      });
    } else {
      // Multiple courses access check
      const accessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
      return NextResponse.json({
        success: true,
        data: accessMap,
      });
    }

  } catch (error) {
    console.error('Error checking course access:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check course access',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

