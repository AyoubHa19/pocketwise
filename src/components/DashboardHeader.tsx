"use client";

import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AvatarPicture } from "@/components/AvatarPicture";
import { useAccountPreferences } from "@/lib/accountData";

/**
 * The top of the dashboard: the user's picture (from Settings, if they
 * chose one) and a hello with their first name (from their Clerk account,
 * or just "Hello!" without one) as the page's heading, and on the right
 * whatever's passed in, the month picker.
 */
export function DashboardHeader({ children }: { children?: ReactNode }) {
  const { user } = useUser();
  const name = user?.firstName?.trim();
  // The picture chosen in Settings, or the user's own uploaded photo, if
  // any; decorative beside the hello.
  const avatar = useAccountPreferences()?.avatar ?? null;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 items-center gap-4">
        {avatar ? (
          <AvatarPicture avatar={avatar} size={56} />
        ) : (
          user?.hasImage && (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk's own image address.
            <img src={user.imageUrl} width={56} height={56} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          )
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{name ? `Hello, ${name}!` : "Hello!"}</h1>
          <p className="mt-1 text-muted">Here&apos;s where your money stands.</p>
        </div>
      </div>
      {children}
    </div>
  );
}
