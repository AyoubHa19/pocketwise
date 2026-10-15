import { Lock, PiggyBank, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Clerk's sign-in and sign-up forms in Pocketwise's look: the form on a
 * glass card, and beside it (above it on phones) what Pocketwise does, in
 * white on the photo like the rest of the app's loose text.
 */
export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-8 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
      <div>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-md text-lg text-muted">{intro}</p>
        <ul className="mt-8 hidden space-y-4 sm:block">
          <Point icon={<ShieldCheck size={18} />}>See what&apos;s safe to spend until payday.</Point>
          <Point icon={<PiggyBank size={18} />}>Budgets, bills and goals that tell you in time.</Point>
          <Point icon={<Lock size={18} />}>Your data stays yours: download it or delete it whenever you like.</Point>
        </ul>
      </div>
      <div className="flex justify-center lg:justify-end">{children}</div>
    </section>
  );
}

function Point({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden="true" className="glass-strong flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-accent">
        {icon}
      </span>
      {children}
    </li>
  );
}

/**
 * Clerk's form drawn on Pocketwise's glass, in its colours and font. The
 * colours point at the app's own tokens, so the form follows light and
 * dark mode with everything else.
 */
export const authAppearance = {
  variables: {
    colorPrimary: "#36543f",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "transparent",
    colorForeground: "var(--foreground)",
    colorMutedForeground: "var(--muted)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--foreground)",
    colorDanger: "var(--danger)",
    colorNeutral: "var(--foreground)",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full max-w-md",
    cardBox: "glass reveal rounded-card w-full max-w-full shadow-none",
    card: "w-full bg-transparent shadow-none border-0",
    // Clerk paints the footer from the card colour, which is see-through
    // here: without this it comes out black.
    footer: "!bg-transparent !bg-none",
    // Links in the app's sage, which is light in dark mode (Clerk would
    // use the dark green of its buttons, unreadable there).
    footerActionLink: "!text-(--accent)",
    formFieldAction: "!text-(--accent)",
    identityPreviewEditButton: "!text-(--accent)",
  },
};
