// src/app/api/bundles/[slug]/route.ts - Single bundle with course details
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BundleDataService } from '@/lib/services/bundle-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    // Options
    const includeUserData = searchParams.get('include_user_data') !== 'false'; // Default true
    const includeRelated = searchParams.get('include_related') !== 'false'; // Default true
    const includeCourseDetails = searchParams.get('include_course_details') !== 'false'; // Default true

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Bundle slug is required' },
        { status: 400 }
      );
    }

    // Get bundle data with courses
    const bundleService = new BundleDataService();
    const bundle = await bundleService.getBundleWithCoursesBySlug(slug);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    // Calculate savings
    const savings = bundleService.calculateBundleSavings(bundle);

    // Build response data
    const responseData: any = {
      bundle: {
        ...bundle,
        calculated_savings: {
          total_individual_price: savings.totalIndividualPrice,
          bundle_price: savings.bundlePrice,
          savings_amount: savings.savings,
          savings_percentage: savings.savingsPercentage,
        },
      },
    };

    // Include user-specific data if authenticated
    if (includeUserData && userId) {
      const purchaseService = new PurchaseTrackingService();
      
      try {
        // Check bundle ownership
        const enrollments = await purchaseService.getUserActiveEnrollments(userId);
        const bundleEnrollment = enrollments.find(enrollment => 
          enrollment.enrollment_type === 'bundle' && enrollment.item_id === bundle.id
        );

        // Check ownership of individual courses in bundle
        const courseIds = bundle.courses.map(course => course.id);
        const courseAccessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
        
        const ownedCourses = Object.entries(courseAccessMap)
          .filter(([_, access]) => access.has_access)
          .map(([courseId, access]) => ({
            course_id: courseId,
            access_type: access.access_type,
            expires_at: access.expires_at,
            bundle_id: access.bundle_id,
          }));

        responseData.user_access = {
          owns_bundle: !!bundleEnrollment,
          bundle_expires_at: bundleEnrollment?.expires_at || null,
          days_until_expiry: bundleEnrollment ? 
            Math.ceil((new Date(bundleEnrollment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
            null,
          owned_courses: ownedCourses,
          owned_course_count: ownedCourses.length,
          total_course_count: bundle.courses.length,
          access_url: bundleEnrollment ? 
            `${process.env.LEARNWORLDS_SCHOOL_URL}/bundle/${bundle.learnworlds_data?.bundle_id}` : 
            null,
        };
        
      } catch (error) {
        console.error('Error fetching user access data:', error);
        responseData.user_access = {
          owns_bundle: false,
          bundle_expires_at: null,
          days_until_expiry: null,
          owned_courses: [],
          owned_course_count: 0,
          total_course_count: bundle.courses.length,
          access_url: null,
        };
      }
    }

    // Include related bundles
    if (includeRelated) {
      try {
        // Get bundles of same type
        const relatedBundles = await bundleService.getBundlesByType(bundle.bundle_type);
        
        // Remove current bundle and limit to 3
        responseData.related_bundles = relatedBundles
          .filter(b => b.id !== bundle.id)
          .slice(0, 3);
          
      } catch (error) {
        console.error('Error fetching related bundles:', error);
        responseData.related_bundles = [];
      }
    }

    // Include detailed course access if user authenticated
    if (includeCourseDetails && userId) {
      try {
        const purchaseService = new PurchaseTrackingService();
        const courseIds = bundle.courses.map(course => course.id);
        const courseAccessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
        
        // Enrich courses with access info
        responseData.bundle.courses = bundle.courses.map(course => ({
          ...course,
          user_access: courseAccessMap[course.id] || {
            has_access: false,
            access_type: 'none',
            expires_at: null,
            days_until_expiry: null,
            bundle_id: null,
            purchase_id: null,
          },
        }));
        
      } catch (error) {
        console.error('Error enriching courses with access info:', error);
        // Keep courses as-is without access info
      }
    }

    const response = {
      success: true,
      data: responseData,
      meta: {
        slug,
        bundle_type: bundle.bundle_type,
        course_count: bundle.courses.length,
        includes_user_data: includeUserData && !!userId,
        includes_related: includeRelated,
        includes_course_details: includeCourseDetails,
        user_authenticated: !!userId,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching bundle:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch bundle',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}