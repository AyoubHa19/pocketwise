"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { cardClass } from "@/components/formStyles";
import { api } from "../../convex/_generated/api";

/**
 * Settings: who's signed in, as confirmed by Pocketwise's server (Convex),
 * not just by the browser. If Convex can't confirm the sign-in, it says so
 * rather than pretending everything is connected.
 */
export function AccountCard() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Skipped until Convex has the sign-in, so it's never asked too early.
  const viewer = useQuery(api.viewer.get, isAuthenticated ? {} : "skip");
  // Convex's token may not carry the email (Clerk's Convex integration
  // doesn't add it by default), so the name to show comes from Clerk;
  // Convex's answer is what proves the connection.
  const { user } = useUser();
  const who = user?.primaryEmailAddress?.emailAddress ?? viewer?.email ?? viewer?.name ?? "you";

  let status;
  if (isLoading || (isAuthenticated && viewer === undefined)) {
    status = <p className="mt-1 text-sm text-muted">Checking your account…</p>;
  } else if (!isAuthenticated || viewer === null || viewer === undefined) {
    status = (
      <p role="alert" className="mt-1 text-sm text-danger">
        Pocketwise&apos;s server couldn&apos;t confirm your sign-in. Try
        signing out and back in.
      </p>
    );
  } else {
    status = (
      <>
        <p className="mt-1 text-sm text-muted">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {who}
          </span>
          , and connected to Pocketwise&apos;s server.
        </p>
        <p className="mt-3 text-sm text-muted">
          Your transactions and settings are saved in your account, so you
          see them wherever you sign in.
        </p>
      </>
    );
  }

  return (
    <section
      aria-labelledby="account-heading"
      className={`${cardClass} max-w-lg p-4 sm:p-6 lg:max-w-none`}
    >
      <h2 id="account-heading" className="text-lg font-semibold">
        Account
      </h2>
      {status}
    </section>
  );
}
