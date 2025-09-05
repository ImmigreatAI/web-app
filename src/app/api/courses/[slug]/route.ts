// src/app/api/courses/[slug]/route.ts - REFINED FOR USER ACCESS DATA ONLY
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CourseDataService } from '@/lib/services/course-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * REFINED API: Returns ONLY user-specific access data for a course
 * Basic course data now comes from SSG - this API provides user context only
 * 
 * GET /api/courses/[slug] - Get user access information for specific course
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Course slug is required' },
        { status: 400 }
      );
    }

    // Get basic course info to validate course exists and get course ID
    const courseService = new CourseDataService(); // Public client for basic lookup
    const course = await courseService.getCourseBySlug(slug);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // If user is not authenticated, return no access
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          course_id: course.id,
          course_slug: slug,
          has_access: false,
          access_type: 'none',
          expires_at: null,
          days_until_expiry: null,
          bundle_id: null,
          purchase_id: null,
          access_url: null,
          requires_authentication: true,
        },
        meta: {
          user_authenticated: false,
        },
      });
    }

    const purchaseService = new PurchaseTrackingService();
    
    // Get user access information for this specific course
    const accessInfo = await purchaseService.checkCourseAccess(userId, course.id);
    
    // Generate access URL if user has access
    let accessUrl = null;
    if (accessInfo.has_access && process.env.LEARNWORLDS_SCHOOL_URL) {
      // Use LearnWorlds course ID if available from course data
      const lwCourseId = course.learnworlds_data?.course_id || course.id;
      accessUrl = `${process.env.LEARNWORLDS_SCHOOL_URL}/course/${lwCourseId}`;
    }

    // Get additional context if user owns course through bundle
    let bundleInfo: any = null;
    if (accessInfo.has_access && accessInfo.access_type === 'bundle' && accessInfo.bundle_id) {
      try {
        // Get bundle enrollment details
        const enrollments = await purchaseService.getUserActiveEnrollments(userId);
        const bundleEnrollment = enrollments.find((e) => 
          e.enrollment_type === 'bundle' && e.item_id === accessInfo.bundle_id
        );
        
        if (bundleEnrollment) {
          bundleInfo = {
            bundle_id: bundleEnrollment.item_id,
            bundle_title: bundleEnrollment.item_title,
            enrolled_at: bundleEnrollment.enrolled_at,
            total_courses_in_bundle: bundleEnrollment.bundle_courses?.included_courses?.length || 0,
          };
        }
      } catch (error) {
        console.warn('Error fetching bundle info:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        course_id: course.id,
        course_slug: slug,
        has_access: accessInfo.has_access,
        access_type: accessInfo.access_type,
        expires_at: accessInfo.expires_at,
        days_until_expiry: accessInfo.days_until_expiry,
        bundle_id: accessInfo.bundle_id,
        purchase_id: accessInfo.purchase_id,
        access_url: accessUrl,
        bundle_info: bundleInfo,
      },
      meta: {
        user_authenticated: true,
        user_id: userId,
        slug,
      },
    });

  } catch (error) {
    console.error('Error fetching course access data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course access data',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[slug] - Advanced access checking with cart integration
 * Body: { check_cart_conflicts?: boolean, intended_action?: 'add_to_cart' | 'buy_now' }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { slug } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Course slug is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { check_cart_conflicts = false, intended_action } = body;

    // Get course info
    const courseService = new CourseDataService();
    const course = await courseService.getCourseBySlug(slug);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const purchaseService = new PurchaseTrackingService();
    
    // Get access information
    const accessInfo = await purchaseService.checkCourseAccess(userId, course.id);
    
    let cartConflict = null;
    let recommendation = null;

    // Check cart conflicts if requested
    if (check_cart_conflicts) {
      // Import cart service to check current cart state
      const { CartService } = await import('@/lib/services/cart.service');
      const cartService = new CartService();
      const userCart = await cartService.getUserCart(userId);
      
      const itemInCart = userCart?.cart_data?.items?.some(
        item => item.id === course.id && item.type === 'course'
      ) || false;

      if (itemInCart) {
        cartConflict = {
          type: 'already_in_cart',
          message: 'This course is already in your cart',
        };
      }
    }

    // Generate recommendations based on access status and intended action
    if (!accessInfo.has_access) {
      if (intended_action === 'add_to_cart') {
        recommendation = {
          action: 'add_to_cart',
          message: 'You can add this course to your cart',
          can_proceed: !cartConflict,
        };
      } else if (intended_action === 'buy_now') {
        recommendation = {
          action: 'buy_now',
          message: 'You can purchase this course directly',
          can_proceed: true,
        };
      }
    } else {
      recommendation = {
        action: 'access_course',
        message: 'You already have access to this course',
        can_proceed: true,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        course_id: course.id,
        course_slug: slug,
        access_info: accessInfo,
        cart_conflict: cartConflict,
        recommendation,
        can_add_to_cart: !accessInfo.has_access && !cartConflict,
        can_buy_now: !accessInfo.has_access,
        should_show_access: accessInfo.has_access,
      },
      meta: {
        user_id: userId,
        slug,
        checked_cart_conflicts: check_cart_conflicts,
        intended_action,
      },
    });

  } catch (error) {
    console.error('Error in advanced course access check:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform advanced access check',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
