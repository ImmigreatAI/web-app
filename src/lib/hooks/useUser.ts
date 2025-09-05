import { useUser as useClerkUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useUser() {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setIsInitialized(true);
    }
  }, [isLoaded]);

  return {
    user: clerkUser,
    isLoaded: isInitialized,
    isSignedIn: !!isSignedIn,
    userId: clerkUser?.id || null,
    email: clerkUser?.primaryEmailAddress?.emailAddress || null,
    fullName: clerkUser ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() : null,
  };
}