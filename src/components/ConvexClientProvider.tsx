"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  // Written to .env.local by `npx convex dev`. Without it the app can't
  // reach its server, so stop with a clear message instead of failing later.
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local. Run `npx convex dev`.");
}

// One client for the whole app: it keeps a single connection to Convex.
const convex = new ConvexReactClient(url);

/**
 * Connects the app to Convex, and passes along who's signed in (from Clerk),
 * so every Convex function knows the user from a token Convex checks itself.
 * Must sit inside ClerkProvider.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
