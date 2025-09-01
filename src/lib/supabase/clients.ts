import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create Supabase client for client components
 * This is the basic client without authentication
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Hook to create authenticated Supabase client in React components
 * Automatically includes Clerk JWT tokens in requests
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(() => {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get Clerk token for Supabase integration
          const clerkToken = await getToken({ template: 'supabase' });

          // Create headers with authorization
          const headers = new Headers(options.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }

          // Make authenticated request
          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    });
  }, [getToken]);
}