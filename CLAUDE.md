@AGENTS.md

# Pocketwise: notes for Claude

Read this first. It's the hand-over between Claude sessions, so a new chat
(even from another Claude account) can carry on exactly where the last
one stopped. Keep it up to date at the end of every stage.

## The user and how to work with them

- A beginner building Pocketwise as a portfolio project. Explain each
  stage simply, in small verifiable steps.
- **Reply in Moroccan Darija written in Arabic script.** The user writes
  Darija in Latin letters. Only if they write a whole message in English,
  answer in simple English.
- **Test everything yourself**, in the in-app browser, like a real user:
  never hand the user manual test steps. Check sums by hand, phones from
  320px to 1920px, light and dark, keyboard, and screen-reader labels.
- **Keep test data**: it's named "(sample)"; don't delete it afterwards.
- **Every finished stage goes to production too**: run the tests, type
  checks and lint, commit, push to `main` (Vercel deploys the site and
  the Convex `production-eu` backend), then check the live site.
- Ask before anything destructive in production (deleting data or
  deployments). Never print or commit secrets.
- Before starting a stage, say in a few lines what it will do; the user
  then says "bda" (start).

## Source of truth

- `POCKETWISE_PRD.md`: the full product plan. Its section 28 holds the
  workflow rules; section 29 the roadmap.
- `README.md`: features, how to run, deployment, and the decisions that
  shape the code (money in minor units, dates as "YYYY-MM-DD", server-side
  ownership checks, and so on). Follow them.

## Where things stand (2026-10-14)

Done and live (see `git log` for the details of each):

- Stages 1–8: UI, dashboard, charts, motion. 9–10: Clerk sign-in and
  Convex backend. 11–14: moving browser data, settings, deploy, CSV export
  and account deletion. Preferences (theme, date order).
- 15: accounts and transfers. 16a: the user's own categories. 16b:
  descriptions and tags. 17: Transactions page (search, filters, sort).
  18: monthly budgets. 19: savings goals, and the header's "More" menu.
  20: recurring transactions and bills (`/bills`, in "More"; a "Bills"
  card on the dashboard). A rule never adds anything itself: each
  occurrence is recorded with "Mark paid" (the transaction form, filled
  in, via `openPrefilled`) or skipped. The recorded transaction's id is
  `recurring-<ruleId>-<date>`, so it can't be recorded twice.

Next, in order (PRD 29):

- **21: financial calendar** (with a week-start setting): show
  transactions and upcoming recurring items (`src/lib/recurring.ts`,
  `occurrences`) day by day.
- 22: reports and insights. 23: currency conversion.
- 24: AI receipt scanning. 25: safe-to-spend and salary day planner.
- 26: what-if simulator and debt tracking. 27: final review.
- Later: a domain of our own, Clerk's production instance (then remove
  the preview strip), and the mobile app (Expo).

New sections go in the header's "More" menu (`SiteHeader.tsx`) unless
they're used daily; the header only fits five items on a 320px phone.

## Running it locally

- Backend: `npx convex dev` in its own terminal (it pushes `convex/` to
  the dev deployment `chatty-spoonbill-246` as you save).
- Site: `npm run dev` in a terminal tab (not preview_start: its health
  check sees the 307 redirect on "/" and the server gets stopped).
- `.env.local` holds the Clerk and Convex keys; it's never committed. On
  another computer it has to be copied over privately (not in a chat).
- Checks before every commit: `npm test`, `npx tsc --noEmit`,
  `npx tsc -p convex --noEmit`, `npm run lint`.

## Deployments

- Live site: https://pocketwise-rho-sable.vercel.app (Vercel, from the
  private GitHub repo `AyoubHa19/pocketwise`, branch `main`).
- Convex production is **`production-eu`** (`chatty-cuttlefish-99`,
  Ireland). Target it with `--deployment production-eu`.
  **Never use `--prod`**: that's an old, unused US deployment.
- Clerk is still its development instance (hence the preview strip).

## Test data kept on the dev deployment

Everything named "(sample)": transactions (Coffee, ATM withdrawal,
Supermarket, Bus ticket, Rent), budgets (All spending, Food, Pet food),
goals (Trip, Emergency fund), recurring items (Rent, Internet, Salary).
The live site's data is separate (production-eu).

## Gotchas

- Many files have CRLF line endings: multi-line replacements in scripts
  can silently fail; the Edit tool works.
- Card lists and grids need `grid-cols-[minmax(0,1fr)]` on phones, or long
  text pushes them wider than the screen.
- Functions that need the user's own date take a `today` argument,
  checked on the server to be within a day of its clock (time zones).
- Convex refuses arguments it doesn't declare: hooks in
  `src/lib/accountData.ts` pass named fields only.
- Rules shared by the app and the server live in `src/lib` and are
  checked again on the server; tests: `src/lib/*.test.ts` and
  `convex/backend.test.ts`.
