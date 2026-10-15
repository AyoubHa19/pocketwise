import {
  CalendarDays,
  ChartColumn,
  Coins,
  Download,
  FlaskConical,
  Gauge,
  Landmark,
  Lock,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardClass, primaryButtonClass } from "@/components/formStyles";

/**
 * The home page for visitors who aren't signed in: what Pocketwise does,
 * how to start, and how their data is treated, in the app's own look (the
 * photo, glass, cards that rise in as they're scrolled to). Everything it
 * claims is something the app really does; the dashboard picture uses
 * made-up numbers and says so.
 */
export function Landing() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* The opening: what it is, and the two ways in. */}
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-10 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-16">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Your money, calmly in view.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Pocketwise keeps your accounts, budgets, bills and goals in one place, and tells you what&apos;s safe to spend
            until payday, so the end of the month holds no surprises.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={`${primaryButtonClass} px-6`}>
              Create your free account
            </Link>
            <Link
              href="/sign-in"
              className="glass-strong inline-flex min-h-11 w-full items-center justify-center rounded-control px-6 font-medium sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
        <DashboardPreview />
      </section>

      {/* What it does. */}
      <section aria-labelledby="features-heading" className="py-16">
        <h2 id="features-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything your money needs, nothing it doesn&apos;t
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Each number shows how it was worked out, and nothing is counted twice: moving money between your own accounts is
          never spending.
        </p>
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <Feature icon={Gauge} title="Safe to spend">
            What&apos;s left until payday after your bills, savings and a reserve, and how much that is a day.
          </Feature>
          <Feature icon={PiggyBank} title="Budgets">
            Monthly limits for everything or for one category, that warn you when you&apos;re close.
          </Feature>
          <Feature icon={Repeat} title="Bills and recurring">
            Rent, subscriptions, your salary: see what&apos;s coming, and record each one with a tap.
          </Feature>
          <Feature icon={Target} title="Savings goals">
            Put money aside for a trip or a rainy day, and see how much a month gets you there on time.
          </Feature>
          <Feature icon={ChartColumn} title="Reports and insights">
            Compare any period with the one before, with insights that explain their own sums.
          </Feature>
          <Feature icon={Coins} title="Many currencies">
            Keep each amount in its own currency, and convert only at the rates you enter, shown as such.
          </Feature>
          <Feature icon={Landmark} title="Debts and installments">
            What you still owe, and roughly when it&apos;s paid off, with the interest on the way.
          </Feature>
          <Feature icon={FlaskConical} title="What if…">
            Try a change before you make it: save more, spend less, pay a debt faster.
          </Feature>
          <Feature icon={CalendarDays} title="Calendar">
            A month at a glance: what happened, and what&apos;s still expected.
          </Feature>
        </ul>
      </section>

      {/* How to start. */}
      <section aria-labelledby="steps-heading" className="py-16">
        <h2 id="steps-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Up and running in minutes
        </h2>
        <ol className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3 lg:gap-5">
          <Step number={1} title="Create your account">
            With your email or Google. It&apos;s free.
          </Step>
          <Step number={2} title="Add your accounts">
            Cash, bank, wallet: each with what&apos;s in it today, in its own currency.
          </Step>
          <Step number={3} title="Record as you go">
            Add what comes in and goes out, and Pocketwise keeps every total up to date.
          </Step>
        </ol>
      </section>

      {/* Their data. */}
      <section aria-labelledby="privacy-heading" className="py-16">
        <h2 id="privacy-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your data stays yours
        </h2>
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3 lg:gap-5">
          <Feature icon={Lock} title="Only you see it">
            Your account&apos;s data is shown to you alone: the server checks who&apos;s asking on every request.
          </Feature>
          <Feature icon={Download} title="Take it with you">
            Download all your transactions as a spreadsheet file whenever you like.
          </Feature>
          <Feature icon={ShieldCheck} title="Leave any time">
            Delete your account, and everything in it is deleted with it.
          </Feature>
        </ul>
      </section>

      {/* One last way in. */}
      <section aria-labelledby="start-heading" className="py-20 text-center">
        <h2 id="start-heading" className="mx-auto text-3xl font-semibold tracking-tight sm:text-5xl">
          Start seeing where your money goes.
        </h2>
        <div className="mt-8 flex justify-center">
          <Link href="/sign-up" className={`${primaryButtonClass} px-8`}>
            Create your free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-sm">
        <p className="mx-auto">© 2026 Pocketwise</p>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className={`${cardClass} p-5 sm:p-6`}>
      <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </li>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className={`${cardClass} p-5 sm:p-6`}>
      <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-semibold text-ink-foreground">
        {number}
      </span>
      <h3 className="mt-4 font-semibold">
        <span className="sr-only">Step {number}: </span>
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </li>
  );
}

/**
 * A small picture of the dashboard, with made-up numbers (said so in its
 * caption): three tiles, "Safe to spend" with its glowing rim, and a line
 * of the last months. Decorative, so screen readers get the caption only.
 */
function DashboardPreview() {
  return (
    <figure className="relative">
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4">
        <PreviewTile label="Spending" amount="€1,284.30" note="−8% vs last month" />
        <PreviewTile label="Income" amount="€2,450.00" note="Paid on the 1st" positive />
        <div className="glow-card col-span-2 flex flex-col p-5">
          <span className="glow-card-halo" />
          <span className="glow-card-fill" />
          <span className="glow-card-rim" />
          <span className="relative text-sm font-medium">Safe to spend</span>
          <span className="relative mt-1 text-3xl font-semibold tracking-tight tabular-nums">€642.18</span>
          <span className="relative mt-1 text-xs">Until payday, in 12 days · about €53.51 a day</span>
        </div>
        <div className={`${cardClass} col-span-2 p-5`}>
          <span className="text-sm font-medium text-muted">Cash flow</span>
          <svg viewBox="0 0 300 80" className="mt-3 block h-20 w-full" preserveAspectRatio="none">
            <path d="M0 62 C40 58 60 40 100 44 C140 48 160 24 200 28 C240 32 260 14 300 10 L300 80 L0 80 Z" className="fill-accent/15" />
            <path d="M0 62 C40 58 60 40 100 44 C140 48 160 24 200 28 C240 32 260 14 300 10" className="fill-none stroke-accent" strokeWidth={3} vectorEffect="non-scaling-stroke" />
            <path d="M0 70 C40 66 60 60 100 62 C140 64 160 50 200 54 C240 58 260 46 300 48" className="fill-none stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">An example dashboard, with made-up numbers.</figcaption>
    </figure>
  );
}

function PreviewTile({ label, amount, note, positive = false }: { label: string; amount: string; note: string; positive?: boolean }) {
  return (
    <div className={`${cardClass} p-4 sm:p-5`}>
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className={`mt-1 block text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${positive ? "text-positive" : ""}`}>
        {amount}
      </span>
      <span className="mt-2 block text-xs text-muted">{note}</span>
    </div>
  );
}
