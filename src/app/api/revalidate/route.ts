import { NextRequest, NextResponse } from 'next/server';
import { ContentRevalidationService } from '@/lib/revalidation/content-revalidation';
import { RevalidationRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: RevalidationRequest = await request.json();
    const type = body.type;

    if (!type) {
      return NextResponse.json({ success: false, error: 'Missing type' }, { status: 400 });
    }

    let result: any;
    switch (type) {
      case 'all':
        result = await ContentRevalidationService.revalidateEverything();
        break;
      case 'courses':
        result = await ContentRevalidationService.revalidateAllCourses();
        break;
      case 'bundles':
        result = await ContentRevalidationService.revalidateAllBundles();
        break;
      case 'course':
        if (!body.slug) return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });
        result = await ContentRevalidationService.revalidateCoursePage(body.slug);
        break;
      case 'bundle':
        if (!body.slug) return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });
        result = await ContentRevalidationService.revalidateBundlePage(body.slug);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to revalidate', message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
