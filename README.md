# Pocketwise

A simple personal finance tracker for the web, made for people anywhere in
the world. Record what you earn and spend, and see each month's income,
spending, and balance at a glance. It works on phones and computers.

You sign in (with [Clerk](https://clerk.com)), and your data is saved in
your account on Pocketwise's server ([Convex](https://convex.dev)), so you
see it wherever you sign in.

## What it does

- Add, edit, and delete transactions (income or expense, with a category,
  date, and optional description, note and tags), grouped by day with
  each day's total. The description ("Supermarket", "Phone bill") becomes the
  row's title; tags are free words typed with commas ("trip, family"),
  tidied up the same way in the app and on the server (`src/lib/tags.ts`).
- Use your own categories, for spending and for income: everyone starts
  with a default list (`src/lib/categories.ts`), and can add, rename or
  archive categories in Settings. A transaction refers to its category by
  id, so a rename shows everywhere at once; an archived category is no
  longer offered, and past transactions keep it.
- Pick your currency once, from every currency your browser knows, and
  change it later in Settings.
- Keep several accounts (cash, bank, savings, wallet, other), each in its
  own currency with an optional starting balance; archive one to hide it
  without losing its history, or delete one that was never used. The
  dashboard shows your total balance and each account's. A balance is the
  starting balance plus income, minus spending, plus transfers in, minus
  transfers out (`accountBalances` in `src/lib/summary.ts`); transfers are
  never counted as income or spending.
- Search and filter every transaction on the Transactions page: words
  in the description, note, category, tags or amount (ignoring case and
  accents); type, account, category, tag and dates; newest, oldest,
  largest or smallest first; with the count, income and spending of what
  matches, 50 at a time. The filters live in the address bar, so a reload
  keeps them (`src/lib/transactionFilters.ts`).
- Set monthly budgets, for all spending or one category, on the Budgets
  page: what's spent, what's left (or over, in full), and a warning from a
  level you choose (80% to start with); the most urgent show on the
  dashboard too. Only expenses in the budget's currency count: income,
  refunds included, never lowers what a budget has used, and transfers
  never count (the rules are in `src/lib/budgets.ts`).
- Save toward goals on the Goals page: a target, an optional date, and
  what's saved, counted either from the goal's own entries (money noted
  as put aside or taken out, with a history) or from an account's
  balance. It shows what's left and how much to put aside each month to
  reach it on time, or says why it can't (no date, or the date passed).
  Neither way is income or spending, so nothing counts twice
  (`src/lib/goals.ts`).
- Keep recurring items (rent, bills, subscriptions, salary) on the Bills
  page: weekly to yearly, with an optional end date and a reminder some
  days ahead. Each time one is due it's listed (and on the dashboard)
  to record, which opens the transaction form filled in, or to skip;
  it's never counted as paid until then, and can't be recorded twice
  (`src/lib/recurring.ts`). Pausing, editing or deleting one never
  changes what's already recorded.
- See a month as a calendar, weeks starting on the day you choose
  (Monday, Sunday or Saturday, in Settings): each day's income and
  spending, kept apart from what's only expected (recurring items not
  recorded yet, goal dates); a day opens its transactions to edit and
  its expected items to record or skip (`src/lib/calendar.ts`).
- See reports for 1 to 12 months beside the period before: income,
  spending, what's left over and the share spent, month by month, by
  category, recurring costs per month, budgets and goals. Insights (a
  category that moved a lot, a budget gone over, a bill coming up, a goal
  falling behind, spending far from the recent average) each say how
  they're worked out, and appear only when the data allows it
  (`src/lib/reports.ts`).
- See totals across currencies at your own exchange rates (Settings →
  Exchange rates, each with its date and source): a converted total of
  all your accounts, and reports that include other currencies,
  converted. Converted amounts are always labelled with the rate they
  used; originals never change; a currency without a rate is left out
  and named, never guessed. The arithmetic is exact (`src/lib/rates.ts`).
- Scan a receipt: take or choose a photo, and Claude reads the shop,
  date, total, currency, category and items. Nothing is saved until you
  check it: doubtful fields come with warnings, a possible duplicate is
  pointed out, and "Check and save" opens the usual form, filled in. The
  photo is shrunk in the browser, read on the server only, and deleted
  straight after; each user can scan 30 a day. Needs an Anthropic API key
  set in Convex (`ANTHROPIC_API_KEY`); without one the button says so.
- Plan to payday: how much is safe to spend until your next payday, and
  per day. It's your chosen balances, minus the bills still to pay
  before payday, minus spending you've recorded ahead, minus what you
  mean to save and the reserve you keep aside; every part of the sum is
  shown. Expected income (your salary included) isn't counted until it
  arrives; a bill is never subtracted twice; an account without a
  starting balance is named, not guessed. Payday follows a recurring
  income of any frequency, or a date you choose; the pay period shows
  what you've spent so far against what's safe per day, and what's
  coming before payday (`src/lib/plan.ts`).
- Debts and installments: what you still owe (the balance you entered,
  minus the payments recorded since, said to be an estimate since
  interest isn't added), the installment, the rate if you know it, and
  roughly when it'll be paid off and the interest on the way. A payment is
  recorded as a "Debt Payments" expense, so it counts once as spending
  and brings the debt down; a debt can be linked to its recurring item
  (`src/lib/debts.ts`).
- What if…: try saving a fixed amount each month, a recurring bill
  changing, spending less in a category, a change in income, or paying
  more on a debt. Each result is marked as a simulation, says what it
  assumes, and is never saved (`src/lib/whatif.ts`).
- See one month at a time on the dashboard, with ‹ and › to move between
  months: income, spending, what's left, and how much of the income went.
- See the month's spending by category, and the last 6 months of income
  and spending side by side.
- Keep your data in your account, in sync between tabs and devices.
- Move data saved in the browser before accounts existed into your
  account, checked after moving, with the browser's copy kept as a backup.
- Download all your transactions as CSV (format described in
  `src/lib/csv.ts`), delete the browser's old copy, or delete your account
  and all its data, from Settings.
- Choose the theme (same as the device, light or dark) and the date order
  (Oct 13 or 13 Oct) in Settings; both are saved in your account. The theme
  is also kept in a cookie, so the server draws the first paint in the
  right colours. Gentle animations switch off when your device asks for
  reduced motion.

The full plan for the product, including what isn't built yet, is in
[POCKETWISE_PRD.md](POCKETWISE_PRD.md).

## Running it

You need [Node.js](https://nodejs.org) 22.12 or later, 24, or 26 and up
(it's built with 24). The test tool, Vitest, doesn't support 23 or 25.

```bash
npm install
npm run dev
```

In a second terminal, keep the backend running (it sends the code in
`convex/` to your Convex development deployment as you save):

```bash
npx convex dev
```

Then open http://localhost:3000. The page updates as you edit the code.

`.env.local` (never committed) needs the Clerk keys
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`); `npx convex dev`
adds the Convex ones. The Convex deployment itself needs
`CLERK_FRONTEND_API_URL`, the Frontend API URL from Clerk's Convex
integration (`npx convex env set CLERK_FRONTEND_API_URL <url>`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app for development |
| `npm test` | Runs the automated tests once |
| `npm run test:watch` | Re-runs the tests every time you save a file |
| `npm run lint` | Checks the code for mistakes and bad patterns |
| `npm run build` | Builds the app for production, checking all the types |
| `npm start` | Runs the production build (after `npm run build`) |

## Deployment (preview)

Live preview: https://pocketwise-rho-sable.vercel.app

Hosted on [Vercel](https://vercel.com), connected to the GitHub repository:
every push to `main` deploys both the backend and the site. The build
command is `npx convex deploy --cmd 'npm run build'`, which first sends
`convex/` to the Convex **production** deployment, then builds the site
pointed at it.

Vercel environment variables (Production):

| Variable | Type | Value |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Secret | A production deploy key from the Convex dashboard |
| `CLERK_SECRET_KEY` | Secret | From Clerk's API keys page |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Config | From Clerk's API keys page |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Config | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Config | `/sign-up` |
| `NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED` | Config | `1` |
| `NEXT_PUBLIC_POCKETWISE_PREVIEW` | Config | `1` (shows the "don't enter real data" strip) |

The site's backend is the `production-eu` deployment, in Europe (Ireland).
It isn't the project's *default* production deployment (an earlier one in
US East is), so commands for it name it: for example, it needs
`CLERK_FRONTEND_API_URL`, set with
`npx convex env set --deployment production-eu CLERK_FRONTEND_API_URL <url>`.
Vercel's `CONVEX_DEPLOY_KEY` is a deploy key for `production-eu`, which is
what makes the build deploy there.

It's a **preview**: sign-in still uses Clerk's development instance, which
isn't meant for real data, hence the strip across the top. Moving to
production needs a domain of our own, Clerk's production instance and its
keys, and then removing `NEXT_PUBLIC_POCKETWISE_PREVIEW`.

Vercel's Standard Protection stays on: preview deployments are only
visible to the Vercel team; the production domain is public.

## Where things are

```
src/
├── app/            Pages: each folder is a URL (settings/ is /settings)
│   ├── layout.tsx  The frame around every page: header, fonts, title
│   ├── page.tsx    The home page (/)
│   ├── icon.svg    The app icon; apple-icon.tsx turns it into a PNG
│   └── settings/
├── components/     The pieces of the screens (forms, lists, charts,
│                   header) and the shared styles in formStyles.ts
└── lib/            Everything that isn't a screen: money, dates,
                    totals, saving, animation timing. Tests sit beside
                    the code they check, as *.test.ts.
```

Built with [Next.js](https://nextjs.org) (App Router), TypeScript,
[Tailwind CSS](https://tailwindcss.com), [Motion](https://motion.dev) for
animations, [Lucide](https://lucide.dev) for icons, and
[Vitest](https://vitest.dev) for tests.

## Decisions worth knowing

These are the choices that shape the code. Please keep them in mind when
changing it.

**Money is stored as whole numbers of the smallest unit.** 19.99 USD is
saved as `1999` cents, and 2,000 JPY as `2000`, since yen has no decimals.
Decimals in JavaScript have rounding errors (`0.1 + 0.2` is
`0.30000000000000004`), and that isn't acceptable for money. Typed amounts
are converted by working on the digits as text (`parseAmount`), never by
multiplying.

**Every amount carries its currency code.** Currencies have different
numbers of decimals (KWD has 3), and amounts in different currencies are
never added together, because that would need an exchange rate. Changing
your currency in Settings doesn't convert past transactions: they keep
their own currency and are shown apart in the monthly totals.

**Dates are plain `"YYYY-MM-DD"` text, with no time or time zone.** The day
you picked stays that day, even if you travel. "Today" is read from your
own clock, not UTC, which is already tomorrow or still yesterday for much
of the world at some point each day.

**Data lives in the user's account, and the server decides who owns it.**
Every Convex function starts with `requireOwner` (`convex/ownership.ts`),
which takes the user from the sign-in token Convex checked itself, never
from what the browser sends. The server checks every value again with the
same rules as the app (shared from `src/lib`), and refuses anything wrong
without saving part of it. `convex/backend.test.ts` tests this, including
that one user can't read, change, or delete another's data.

**Data saved in the browser before accounts is moved, never lost.** The
old `localStorage` data is offered for moving (`LocalDataImport.tsx`), in
batches that can be retried without copies. Afterwards every transaction
is looked up in the account before the move counts as done, and the
browser keeps its copy.

**Deleting an account deletes the data first, on the server.** The server
action in `src/app/settings/actions.ts` deletes the user's Convex data with
their own sign-in token, reads it back to check nothing is left, and only
then deletes their Clerk account (which needs the secret key, so it never
happens in the browser). If a step fails it stops there, so there's never
data left behind that no one can sign in to.

**Exported notes can't run as spreadsheet formulas.** Text the user typed
that starts with `=`, `+`, `-` or `@` gets a leading apostrophe in the CSV
(`src/lib/csv.ts`), which blocks "CSV injection".

**Browser-only values are read with `useSyncExternalStore`.** The server
can't see your storage, your clock, or your browser's currency list, so
it renders a loading skeleton, and the browser fills in the real values.
This keeps the server's HTML and the browser's first render the same. The
skeleton has the same layout as the real dashboard, so nothing jumps.

**Animations never stand in for information.** Numbers swap to their new
value without counting through ones that aren't real, every change is also
said in words (like "Transaction added"), and with reduced motion things
change instantly or just fade. The timing lives in `src/lib/motion.ts`.

**Every control is at least 44px tall**, the size Apple and Google
recommend for fingers.

## Current limits

- Only a preview so far: sign-in uses Clerk's development instance, so
  the live site isn't for real data (see Deployment).
- Exchange rates are entered by hand: Pocketwise doesn't fetch live
  rates, and uses each pair's one rate for every date.
- Transfers only between accounts in the same currency: one between
  currencies needs an exchange rate, which comes with currency support.
- English only. Categories have no custom icon or colour yet: the default
  ones have their own icon, others share a tag icon.
- The tests cover money, dates, monthly totals, the account balance,
  transactions, the server's functions and their permissions, and moving
  browser data. The screens were checked by hand.
