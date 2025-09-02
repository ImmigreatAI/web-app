// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CourseDataService } from '@/lib/services/course-data.service';
import { PurchaseTrackingService } from '@/lib/services/purchase-tracking-service';
import { CourseFilters, CourseWithEnrollment } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: CourseFilters = {
      category: searchParams.get('category') as any || undefined,
      series: searchParams.get('series') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    };

    // Additional query parameters
    const searchTerm = searchParams.get('search') || undefined;
    const includeEnrollmentStatus = searchParams.get('include_enrollment_status') === 'true';

    // Create course service (authenticated if user is signed in)
    const courseService = new CourseDataService(!!userId);
    
    // Get courses based on filters
    let courses;
    if (searchTerm) {
      courses = await courseService.searchCourses(searchTerm);
    } else {
      courses = await courseService.getAllCourses(filters);
    }

    // Always create CourseWithEnrollment array, with or without enrollment data
    let coursesWithEnrollment: CourseWithEnrollment[];
    
    if (includeEnrollmentStatus && userId) {
      const purchaseService = new PurchaseTrackingService();
      const courseIds = courses.map(course => course.id);
      
      // Get access info for all courses
      const accessMap = await purchaseService.checkMultipleCourseAccess(userId, courseIds);
      
      coursesWithEnrollment = courses.map(course => {
        const accessInfo = accessMap[course.id];
        return {
          ...course,
          user_owns: accessInfo?.has_access || false,
          ownership_type: accessInfo?.access_type || 'none',
          expires_at: accessInfo?.expires_at || null,
          bundle_id: accessInfo?.bundle_id || null,
        };
      });
    } else {
      // Map courses to CourseWithEnrollment format with default values
      coursesWithEnrollment = courses.map(course => ({
        ...course,
        user_owns: false,
        ownership_type: 'none' as const,
        expires_at: null,
        bundle_id: null,
      }));
    }

    // Prepare response
    const response = {
      success: true,
      data: coursesWithEnrollment,
      meta: {
        total: courses.length,
        filters_applied: Object.keys(filters).filter(key => filters[key as keyof CourseFilters] !== undefined),
        search_term: searchTerm || null,
        includes_enrollment_status: includeEnrollmentStatus && !!userId,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch courses',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}