// src/app/api/courses/[slug]/route.ts - Single course with user data
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CourseDataService } from '@/lib/services/course-data.service';
import { BundleDataService } from '@/lib/services/bundle-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import { CourseFilters } from '@/lib/types';

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
    const includeRelated = searchParams.get('include_related') !== 'false'; // Default true
    const includeUserData = searchParams.get('include_user_data') !== 'false'; // Default true
    const includeBundles = searchParams.get('include_bundles') !== 'false'; // Default true

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Course slug is required' },
        { status: 400 }
      );
    }

    // Get course data
    const courseService = new CourseDataService(!!userId);
    const course = await courseService.getCourseBySlug(slug);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Build response data
    const responseData: any = {
      course,
    };

    // Include user-specific data if authenticated
    if (includeUserData && userId) {
      const purchaseService = new PurchaseTrackingService();
      
      // Get access info for this course
      const accessInfo = await purchaseService.checkCourseAccess(userId, course.id);
      
      responseData.user_access = {
        has_access: accessInfo.has_access,
        access_type: accessInfo.access_type,
        expires_at: accessInfo.expires_at,
        days_until_expiry: accessInfo.days_until_expiry,
        bundle_id: accessInfo.bundle_id,
        purchase_id: accessInfo.purchase_id,
        access_url: accessInfo.has_access ? 
          `${process.env.LEARNWORLDS_SCHOOL_URL}/course/${course.learnworlds_data?.course_id}` : 
          null,
      };
    }

    // Include related courses
    if (includeRelated) {
      try {
        // Get courses from same series
        const seriesFilters: CourseFilters = {
          category: course.category,
          series: course.series || undefined,
        };
        
        const relatedCourses = await courseService.getAllCourses(seriesFilters);
        
        // Remove current course and limit to 4
        responseData.related_courses = relatedCourses
          .filter(c => c.id !== course.id)
          .slice(0, 4);

      } catch (error) {
        console.error('Error fetching related courses:', error);
        responseData.related_courses = [];
      }
    }

    // Include bundles containing this course
    if (includeBundles) {
      try {
        const bundleService = new BundleDataService();
        const bundlesContaining = await bundleService.getBundlesContainingCourse(course.id);
        
        responseData.containing_bundles = bundlesContaining.slice(0, 3);
        
      } catch (error) {
        console.error('Error fetching containing bundles:', error);
        responseData.containing_bundles = [];
      }
    }

    const response = {
      success: true,
      data: responseData,
      meta: {
        slug,
        includes_user_data: includeUserData && !!userId,
        includes_related: includeRelated,
        includes_bundles: includeBundles,
        user_authenticated: !!userId,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}