import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for user management operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface UserSyncData {
  userId: string; // Clerk user ID
  userEmail: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Sync Clerk user data with Supabase users table
 * This function creates or updates user records in Supabase
 */
export async function syncUserWithSupabase({
  userId,
  userEmail,
  firstName,
  lastName,
}: UserSyncData): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine for new users
      throw fetchError;
    }

    const userData = {
      clerk_id: userId,
      email: userEmail,
      first_name: firstName || null,
      last_name: lastName || null,
      updated_at: new Date().toISOString(),
    };

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update(userData)
        .eq('clerk_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        user: updatedUser,
      };
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        success: true,
        user: newUser,
      };
    }
  } catch (error) {
    console.error('Error syncing user with Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get user data from Supabase using Clerk ID
 */
export async function getSupabaseUser(clerkId: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'User not found' };
      }
      throw error;
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Error fetching Supabase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update user metadata in Supabase
 */
export async function updateUserMetadata(
  clerkId: string,
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_id', clerkId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}