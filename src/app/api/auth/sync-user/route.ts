import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { syncUserWithSupabase, UserSyncData } from '@/lib/auth/user-sync';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userEmail, firstName, lastName }: Partial<UserSyncData> = body;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 400 }
      );
    }

    // Sync user with Supabase
    const result = await syncUserWithSupabase({
      userId,
      userEmail,
      firstName,
      lastName,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'User synchronized successfully',
    });

  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync user',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}