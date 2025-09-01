// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CourseDataService } from '@/lib/services/course-data.service';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const series = searchParams.get('series');

    const courseService = new CourseDataService();
    const courses = await courseService.getAllCourses({
      category: category || undefined,
      series: series || undefined,
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}