import type { AuthConfig } from "convex/server";

// Tells Convex which sign-ins to trust: tokens issued by our Clerk app, for
// the "convex" audience. CLERK_FRONTEND_API_URL is the Frontend API URL the
// Clerk dashboard shows (under that same name) when the Convex integration
// is activated. It's set on the Convex deployment, not in .env.local, so
// development and production can each point at their own Clerk instance.
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
