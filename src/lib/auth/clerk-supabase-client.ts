import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Extend Window interface for Clerk
declare global {
  interface Window {
    Clerk?: {
      getToken?: (options?: { template?: string }) => Promise<string | null>;
    };
  }
}

/**
 * Create a Supabase client for use in client components with Clerk authentication
 * This client automatically includes the Clerk session token in requests
 */
export function createClerkSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // Custom fetch function that adds Clerk JWT to requests
      fetch: async (url, options = {}) => {
        let clerkToken: string | null = null;
        
        // Try to get token from window.Clerk if available
        try {
          clerkToken = await window.Clerk?.getToken?.({
            template: 'supabase',
          }) || null;
        } catch (error) {
          console.warn('Could not get Clerk token:', error);
        }

        // Add Authorization header with Clerk token
        const headers = new Headers(options?.headers);
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`);
        }

        // Make the request with the updated headers
        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
}

/**
 * Hook to get authenticated Supabase client in React components
 * This automatically handles Clerk authentication
 */
export function useSupabase() {
  const { getToken } = useAuth();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        // Get Clerk token for Supabase template
        const clerkToken = await getToken({
          template: 'supabase',
        });

        // Add Authorization header
        const headers = new Headers(options?.headers);
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });

  return supabase;
}

/**
 * Create Supabase client for server-side usage with Clerk
 * Use this in API routes and server components
 */
export function createServerSupabaseClient(clerkToken: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options?.headers);
        
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
}