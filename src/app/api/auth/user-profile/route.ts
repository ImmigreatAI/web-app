// src/app/api/auth/user-profile/route.ts - User profile management
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { UserProfileUpdate } from '@/lib/types';

/**
 * GET /api/auth/user-profile - Get current user profile
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'User profile not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user profile',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/user-profile - Update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: UserProfileUpdate = body;

    // Validate updates
    const allowedFields = ['first_name', 'last_name', 'metadata'];
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 1) { // Only updated_at
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('clerk_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update user profile',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
