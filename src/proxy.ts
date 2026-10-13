import { clerkMiddleware } from "@clerk/nextjs/server";

// Runs before every page request, so Clerk can read who's signed in and
// `auth()` works in pages. It doesn't decide who may see what: each page
// checks that itself (`auth.protect()`), and Convex checks every request to
// the data, which is where protection really has to happen. Next.js 16
// calls this file proxy.ts; it used to be middleware.ts.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes, and for Clerk's own requests.
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
