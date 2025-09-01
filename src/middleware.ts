import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/my-purchases(.*)',
  '/checkout(.*)',
  '/api/cart(.*)',
  '/api/purchases(.*)',
]);

// Define admin routes (future use)
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // Handle protected routes
  if (isProtectedRoute(req)) {
    // If user is not authenticated, redirect to sign-in
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // User is authenticated, continue with user sync
    if (userId) {
      // Sync user data with Supabase (we'll implement this next)
      // This is handled in the user-sync service
      try {
        // Get token for API authorization
        const { getToken } = await auth();
        const token = await getToken();
        
        const response = await fetch(`${req.nextUrl.origin}/api/auth/sync-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            userEmail: sessionClaims?.email,
            firstName: sessionClaims?.given_name || sessionClaims?.first_name,
            lastName: sessionClaims?.family_name || sessionClaims?.last_name,
          }),
        });

        if (!response.ok) {
          console.warn('User sync failed:', response.statusText);
        }
      } catch (error) {
        console.warn('User sync error:', error);
        // Don't block the request if sync fails
      }
    }
  }

  // Handle admin routes (future implementation)
  if (isAdminRoute(req)) {
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // Add admin role check here when needed
    // const hasAdminRole = sessionClaims?.metadata?.role === 'admin';
    // if (!hasAdminRole) {
    //   return NextResponse.redirect(new URL('/', req.url));
    // }
  }

  // For public routes, continue without authentication
  return NextResponse.next();
});

export const config = {
  // Protect all routes except public ones
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};