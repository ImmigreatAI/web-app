import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create authenticated Supabase client for server-side usage
 * Automatically includes Clerk session token for RLS
 */
export async function createClient() {
  const { getToken } = await auth();
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        // Get Clerk token for Supabase template
        const clerkToken = await getToken({ template: 'supabase' });

        // Add authorization header
        const headers = new Headers(options.headers);
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

/**
 * Create Supabase client with service role key
 * Use for admin operations that bypass RLS
 */
export function createServiceClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create public Supabase client (no authentication)
 * Use for public data like courses and bundles
 */
export function createPublicClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}