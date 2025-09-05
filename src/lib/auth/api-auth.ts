import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';

export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      userId: null,
    };
  }

  return { error: null, userId };
}

export async function getUserFromDb(clerkId: string) {
  const supabase = getServiceClient();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error || !user) {
    // Auto-create user if doesn't exist
    const clerkUser = await currentUser();
    if (clerkUser) {
      const { data: newUser } = await (supabase as any)
        .from('users')
        .insert({
          clerk_id: clerkId,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          first_name: clerkUser.firstName,
          last_name: clerkUser.lastName,
        })
        .select()
        .single();
      
      return newUser;
    }
    return null;
  }

  return user;
}
