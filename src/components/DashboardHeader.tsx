"use client";

import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * The top of the dashboard: a hello with the user's first name (from their
 * Clerk account, or just "Hello!" without one) as the page's heading, and
 * on the right whatever's passed in, the month picker.
 */
export function DashboardHeader({ children }: { children?: ReactNode }) {
  const { user } = useUser();
  const name = user?.firstName?.trim();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{name ? `Hello, ${name}!` : "Hello!"}</h1>
        <p className="mt-1 text-muted">Here&apos;s where your money stands.</p>
      </div>
      {children}
    </div>
  );
}
