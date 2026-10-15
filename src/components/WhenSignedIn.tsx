"use client";

import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * Shows its children only when someone is (or isn't, with `out`) signed
 * in, following the sign-in live in the browser. Clerk's server-side
 * <Show> in the root layout is worked out once: after signing in, the app
 * moves to the dashboard without drawing the layout again, so the
 * navigation stayed hidden until a reload. The first paint still comes
 * from the server's answer, which ClerkProvider passes along.
 */
export function WhenSignedIn({ children, out = false }: { children: ReactNode; out?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn === !out ? children : null;
}
