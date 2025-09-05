import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/my-purchases(.*)',
  '/checkout(.*)',
  '/api/cart(.*)',
  '/api/purchases(.*)',
  '/api/enrollments(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Only check if user is authenticated for protected routes
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      const { redirectToSignIn } = await auth();
      return redirectToSignIn({ returnBackUrl: req.url });
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};