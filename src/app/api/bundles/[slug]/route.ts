// src/app/api/bundles/[slug]/route.ts - REFINED FOR USER ACCESS DATA ONLY  
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BundleDataService } from '@/lib/services/bundle-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

interface RouteParams {
  params: {
    slug: string;
  };
}

/**
 * REFINED API: Returns ONLY user-specific ownership/access data for a bundle
 * Basic bundle data now comes from SSG - this API provides user context only
 * 
 * GET /api/bundles/[slug] - Get user ownership information for specific bundle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Bundle slug is required' },
        { status: 400 }
      );
    }

    // Get basic bundle info to validate bundle exists and get bundle ID
    const bundleService = new BundleDataService();
    const bundle = await bundleService.getBundleBySlug(slug);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    // If user is not authenticated, return no access
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          bundle_id: bundle.id,
          bundle_slug: slug,
          owns_bundle: false,
          enrolled_at: null,
          expires_at: null,
          days_until_expiry: null,
          purchase_id: null,
          access_url: null,
          included_courses: [],
          owned_courses_in_bundle: [],
          requires_authentication: true,
        },
        meta: {
          user_authenticated: false,
        },
      });
    }

    const purchaseService = new PurchaseTrackingService();
    
    // Get user's bundle enrollments to check ownership
    const enrollments = await purchaseService.getUserActiveEnrollments(userId);
    const bundleEnrollment = enrollments.find(e => 
      e.enrollment_type === 'bundle' && e.item_id === bundle.id
    );

    let ownershipData = {
      bundle_id: bundle.id,
      bundle_slug: slug,
      owns_bundle: false,
      enrolled_at: null,
      expires_at: null,
      days_until_expiry: null,
      purchase_id: null,
      access_url: null,
      included_courses: [],
      owned_courses_in_bundle: [],
    };

    if (bundleEnrollment) {
      // User owns the bundle
      ownershipData = {
        bundle_id: bundle.id,
        bundle_slug: slug,
        owns_bundle: true,
        enrolled_at: bundleEnrollment.enrolled_at,
        expires_at: bundleEnrollment.expires_at,
        days_until_expiry: Math.ceil((new Date(bundleEnrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        purchase_id: bundleEnrollment.purchase_id,
        access_url: process.env.LEARNWORLDS_SCHOOL_URL ? 
          `${process.env.LEARNWORLDS_SCHOOL_URL}/bundle/${bundleEnrollment.learnworlds_bundle_id}` : null,
        included_courses: bundleEnrollment.bundle_courses?.included_courses || [],
        owned_courses_in_bundle: bundleEnrollment.bundle_courses?.included_courses || [],
      };
    } else {
      // User doesn't own bundle, check individual course ownership within bundle
      try {
        const courseIds = bundle.course_ids;
        if (courseIds.length > 0) {
          const courseAccessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
          
          const ownedCoursesInBundle = Object.entries(courseAccessMap)
            .filter(([_, access]) => access.has_access)
            .map(([courseId, access]) => ({
              course_id: courseId,
              access_type: access.access_type,
              expires_at: access.expires_at,
              bundle_id: access.bundle_id,
            }));

          ownershipData.owned_courses_in_bundle = ownedCoursesInBundle;
        }
      } catch (error) {
        console.warn('Error checking individual course ownership in bundle:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: ownershipData,
      meta: {
        user_authenticated: true,
        user_id: userId,
        slug,
      },
    });

  } catch (error) {
    console.error('Error fetching bundle ownership data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch bundle ownership data',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bundles/[slug] - Advanced ownership checking with cart integration
 * Body: { 
 *   check_cart_conflicts?: boolean, 
 *   intended_action?: 'add_to_cart' | 'buy_now',
 *   check_course_overlap?: boolean
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { slug } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Bundle slug is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      check_cart_conflicts = false, 
      intended_action,
      check_course_overlap = true 
    } = body;

    // Get bundle info
    const bundleService = new BundleDataService();
    const bundle = await bundleService.getBundleBySlug(slug);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    const purchaseService = new PurchaseTrackingService();
    
    // Check bundle ownership
    const enrollments = await purchaseService.getUserActiveEnrollments(userId);
    const bundleEnrollment = enrollments.find(e => 
      e.enrollment_type === 'bundle' && e.item_id === bundle.id
    );

    const ownsBundle = !!bundleEnrollment;

    let cartConflict = null;
    let courseOverlap = null;
    let recommendation = null;

    // Check cart conflicts if requested
    if (check_cart_conflicts) {
      const { CartService } = await import('@/lib/services/cart.service');
      const cartService = new CartService();
      const userCart = await cartService.getUserCart(userId);
      
      const bundleInCart = userCart?.cart_data?.items?.some(
        item => item.id === bundle.id && item.type === 'bundle'
      ) || false;

      if (bundleInCart) {
        cartConflict = {
          type: 'bundle_in_cart',
          message: 'This bundle is already in your cart',
        };
      }

      // Check if any individual courses from this bundle are in cart
      if (!bundleInCart && userCart?.cart_data?.items) {
        const coursesInCart = userCart.cart_data.items
          .filter(item => item.type === 'course' && bundle.course_ids.includes(item.id))
          .map(item => ({ course_id: item.id, course_title: item.title }));

        if (coursesInCart.length > 0) {
          cartConflict = {
            type: 'courses_in_cart',
            message: `${coursesInCart.length} course(s) from this bundle are already in your cart`,
            conflicting_courses: coursesInCart,
          };
        }
      }
    }

    // Check course overlap if requested
    if (check_course_overlap && bundle.course_ids.length > 0) {
      try {
        const courseAccessMap = await purchaseService.checkMultipleCourseAccess(userId, bundle.course_ids);
        
        const ownedCourses = Object.entries(courseAccessMap)
          .filter(([_, access]) => access.has_access)
          .map(([courseId, access]) => ({
            course_id: courseId,
            access_type: access.access_type,
            expires_at: access.expires_at,
            bundle_id: access.bundle_id,
          }));

        if (ownedCourses.length > 0) {
          courseOverlap = {
            owned_course_count: ownedCourses.length,
            total_course_count: bundle.course_ids.length,
            overlap_percentage: Math.round((ownedCourses.length / bundle.course_ids.length) * 100),
            owned_courses: ownedCourses,
            message: `You already own ${ownedCourses.length} of ${bundle.course_ids.length} courses in this bundle`,
          };
        }
      } catch (error) {
        console.warn('Error checking course overlap:', error);
      }
    }

    // Generate recommendations
    if (!ownsBundle) {
      if (courseOverlap && courseOverlap.overlap_percentage >= 50) {
        recommendation = {
          action: 'consider_individual_courses',
          message: 'You already own many courses in this bundle. Consider purchasing individual courses instead.',
          can_proceed: true,
          warning: true,
        };
      } else if (intended_action === 'add_to_cart') {
        recommendation = {
          action: 'add_to_cart',
          message: 'You can add this bundle to your cart',
          can_proceed: !cartConflict || cartConflict.type !== 'bundle_in_cart',
        };
      } else if (intended_action === 'buy_now') {
        recommendation = {
          action: 'buy_now',
          message: 'You can purchase this bundle directly',
          can_proceed: true,
        };
      }
    } else {
      recommendation = {
        action: 'access_bundle',
        message: 'You already have access to this bundle',
        can_proceed: true,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        bundle_id: bundle.id,
        bundle_slug: slug,
        owns_bundle: ownsBundle,
        cart_conflict: cartConflict,
        course_overlap: courseOverlap,
        recommendation,
        can_add_to_cart: !ownsBundle && (!cartConflict || cartConflict.type !== 'bundle_in_cart'),
        can_buy_now: !ownsBundle,
        should_show_access: ownsBundle,
      },
      meta: {
        user_id: userId,
        slug,
        checked_cart_conflicts: check_cart_conflicts,
        checked_course_overlap: check_course_overlap,
        intended_action,
      },
    });

  } catch (error) {
    console.error('Error in advanced bundle ownership check:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform advanced ownership check',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}