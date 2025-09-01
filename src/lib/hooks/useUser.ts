import { useUser as useClerkUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/auth/clerk-supabase-client';

export interface SupabaseUser {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  stripe_customer_id: string | null;
  learnworlds_user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExtendedUser {
  // Clerk user data
  clerkUser: any;
  // Supabase user data
  supabaseUser: SupabaseUser | null;
  // Combined user info
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

/**
 * Custom hook that combines Clerk user data with Supabase user data
 * Handles loading states and automatically syncs user data
 */
export function useUser() {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useClerkUser();
  const { getToken } = useAuth();
  const supabase = useSupabase();
  
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoadingSupabaseUser, setIsLoadingSupabaseUser] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Fetch Supabase user data when Clerk user is loaded
  useEffect(() => {
    async function fetchSupabaseUser() {
      if (!clerkUser?.id || !isSignedIn) {
        setSupabaseUser(null);
        return;
      }

      setIsLoadingSupabaseUser(true);
      setSupabaseError(null);

      try {
        // First, ensure the user is synced
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Fetch user from Supabase
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // User doesn't exist in Supabase, sync them
            await syncUser();
            return;
          }
          throw error;
        }

        setSupabaseUser(user);
      } catch (error) {
        console.error('Error fetching Supabase user:', error);
        setSupabaseError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoadingSupabaseUser(false);
      }
    }

    if (clerkLoaded) {
      fetchSupabaseUser();
    }
  }, [clerkUser?.id, isSignedIn, clerkLoaded, getToken, supabase]);

  // Sync user with Supabase
  const syncUser = async (): Promise<void> => {
    if (!clerkUser) return;

    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          userId: clerkUser.id,
          userEmail: clerkUser.primaryEmailAddress?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync user');
      }

      const { user } = await response.json();
      setSupabaseUser(user);
    } catch (error) {
      console.error('Error syncing user:', error);
      setSupabaseError(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!clerkUser?.id) return;

    setIsLoadingSupabaseUser(true);
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .single();

      if (error) throw error;
      setSupabaseUser(user);
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsLoadingSupabaseUser(false);
    }
  };

  // Update user metadata
  const updateUserMetadata = async (metadata: Record<string, any>): Promise<void> => {
    if (!clerkUser?.id || !supabaseUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          metadata: { ...supabaseUser.metadata, ...metadata },
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_id', clerkUser.id);

      if (error) throw error;
      
      // Refresh user data to get updated values
      await refreshUser();
    } catch (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    }
  };

  // Combined user object
  const extendedUser: ExtendedUser = {
    clerkUser,
    supabaseUser,
    fullName: clerkUser
      ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null
      : null,
    firstName: clerkUser?.firstName || null,
    lastName: clerkUser?.lastName || null,
    email: clerkUser?.primaryEmailAddress?.emailAddress || null,
    isLoaded: clerkLoaded && !isLoadingSupabaseUser,
    isSignedIn: !!isSignedIn,
  };

  return {
    ...extendedUser,
    // Additional methods
    syncUser,
    refreshUser,
    updateUserMetadata,
    // Loading states
    isLoadingSupabaseUser,
    supabaseError,
  };
}