// src/app/api/bundles/route.ts - REFINED FOR USER CONTEXT ONLY
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import { UserEnrollment } from '@/lib/types';

/**
 * REFINED API: Focus on USER-SPECIFIC bundle data only
 * Public bundle data now comes from SSG - this API provides user context
 * 
 * POST /api/bundles - Check user ownership status for multiple bundles
 * Body: { bundleIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // This API only works for authenticated users
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bundleIds } = body;

    if (!bundleIds || !Array.isArray(bundleIds) || bundleIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bundle IDs required',
          message: 'Provide an array of bundle IDs to check ownership status'
        },
        { status: 400 }
      );
    }

    if (bundleIds.length > 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many bundle IDs',
          message: 'Maximum 50 bundle IDs per request'
        },
        { status: 400 }
      );
    }

    const purchaseService = new PurchaseTrackingService();
    
    // Get user's active enrollments to check bundle ownership
    const enrollments: UserEnrollment[] = await purchaseService.getUserActiveEnrollments(userId);
    const bundleEnrollments = enrollments.filter((e: UserEnrollment) => e.enrollment_type === 'bundle');

    // Create ownership map
    const bundleOwnershipMap = new Map<string, any>();
    bundleEnrollments.forEach((enrollment: UserEnrollment) => {
      bundleOwnershipMap.set(enrollment.item_id, {
        owns_bundle: true,
        enrolled_at: enrollment.enrolled_at,
        expires_at: enrollment.expires_at,
        days_until_expiry: Math.ceil((new Date(enrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        purchase_id: enrollment.purchase_id,
        included_courses: enrollment.bundle_courses?.included_courses || [],
        access_url: process.env.LEARNWORLDS_SCHOOL_URL ? 
          `${process.env.LEARNWORLDS_SCHOOL_URL}/bundle/${enrollment.learnworlds_bundle_id}` : null,
      });
    });

    // Build response for requested bundle IDs
    const userBundleData = bundleIds.map((bundleId: string) => {
      const ownership = bundleOwnershipMap.get(bundleId);
      return {
        bundle_id: bundleId,
        owns_bundle: !!ownership,
        enrolled_at: ownership?.enrolled_at || null,
        expires_at: ownership?.expires_at || null,
        days_until_expiry: ownership?.days_until_expiry || null,
        purchase_id: ownership?.purchase_id || null,
        included_courses: ownership?.included_courses || [],
        access_url: ownership?.access_url || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: userBundleData,
      meta: {
        user_id: userId,
        bundles_checked: bundleIds.length,
        owned_count: userBundleData.filter(item => item.owns_bundle).length,
      },
    });

  } catch (error) {
    console.error('Error checking bundle ownership:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check bundle ownership',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bundles - Get user's owned bundles summary  
 * Query params: ?active_only=true&expiring_days=30&include_courses=true
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';
    const expiringDays = parseInt(searchParams.get('expiring_days') || '30');
    const includeCourses = searchParams.get('include_courses') === 'true';

    const purchaseService = new PurchaseTrackingService();
    
    // Get user's bundle enrollments
    const allEnrollments: UserEnrollment[] = activeOnly ? 
      await purchaseService.getUserActiveEnrollments(userId) :
      await purchaseService.getUserAllEnrollments(userId);

    const bundleEnrollments = allEnrollments.filter((e: UserEnrollment) => e.enrollment_type === 'bundle');

    // Get expiring bundle enrollments
    const expiringEnrollments: UserEnrollment[] = await purchaseService.getEnrollmentsExpiringSoon(userId, expiringDays);
    const expiringBundles = expiringEnrollments.filter((e: UserEnrollment) => e.enrollment_type === 'bundle');

    // If includeCourses is true, also check which individual courses user owns
    let ownedCourseIds: string[] = [];
    if (includeCourses) {
      const courseEnrollments = allEnrollments.filter((e: UserEnrollment) => e.enrollment_type === 'course');
      ownedCourseIds = courseEnrollments.map((e: UserEnrollment) => e.item_id);
      
      // Also add courses from bundles
      bundleEnrollments.forEach((enrollment: UserEnrollment) => {
        const bundleCourses = enrollment.bundle_courses?.included_courses || [];
        bundleCourses.forEach((course: { course_id: string }) => {
          if (!ownedCourseIds.includes(course.course_id)) {
            ownedCourseIds.push(course.course_id);
          }
        });
      });
    }

    const bundleData = bundleEnrollments.map((enrollment: UserEnrollment) => ({
      bundle_id: enrollment.item_id,
      bundle_title: enrollment.item_title,
      enrolled_at: enrollment.enrolled_at,
      expires_at: enrollment.expires_at,
      days_until_expiry: Math.ceil((new Date(enrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      is_active: enrollment.is_active,
      purchase_id: enrollment.purchase_id,
      included_courses: enrollment.bundle_courses?.included_courses || [],
      course_count: enrollment.bundle_courses?.included_courses?.length || 0,
      access_url: process.env.LEARNWORLDS_SCHOOL_URL ? 
        `${process.env.LEARNWORLDS_SCHOOL_URL}/bundle/${enrollment.learnworlds_bundle_id}` : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        owned_bundles: bundleData,
        expiring_bundles: expiringBundles.map((enrollment: UserEnrollment) => ({
          bundle_id: enrollment.item_id,
          bundle_title: enrollment.item_title,
          expires_at: enrollment.expires_at,
          days_until_expiry: Math.ceil((new Date(enrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        })),
        ...(includeCourses && {
          owned_course_ids: ownedCourseIds,
          total_owned_courses: ownedCourseIds.length,
        }),
      },
      meta: {
        user_id: userId,
        total_bundles: bundleEnrollments.length,
        active_bundles: bundleData.filter((b: any) => b.is_active).length,
        expiring_bundles: expiringBundles.length,
        expires_within_days: expiringDays,
        includes_course_data: includeCourses,
      },
    });

  } catch (error) {
    console.error('Error fetching user bundle data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch bundle data',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
