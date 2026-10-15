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
  21: financial calendar (`/calendar`, in "More"): what happened apart
  from what's expected (unrecorded recurring items, goal dates), and a
  "Weeks start on" preference (Monday, Sunday or Saturday).
  22: reports and insights (`/reports`, in "More"): a 1–12 month period
  beside the one before it; insights each carry "how" (their calculation)
  and appear only when the data allows (`src/lib/reports.ts`).
  23: currency conversion: exchange rates entered by the user (Settings
  → Exchange rates; date and source; one per pair either way round),
  exact BigInt arithmetic (`src/lib/rates.ts`). A converted total on the
  balance card, and reports can include other currencies, converted;
  budgets never use converted amounts. No live rates are fetched.
  24: receipt scanning ("Scan a receipt" on the dashboard): the photo is
  shrunk in the browser, read by Claude (`claude-opus-5-5`, effort low,
  structured JSON, server-side fallback) in `convex/receiptsNode.ts`,
  deleted straight after, checked (`src/lib/receipts.ts`), shown for
  review, then opened in the filled-in form. 30 scans per user per day.
  **Needs `ANTHROPIC_API_KEY`** as a Convex environment variable (see
  below); without it the button says scanning isn't set up yet. The review
  card has only been tested by its unit tests until a key is added: test
  it with a real receipt then.
  25: plan to payday (`/plan`, in "More"; "Safe to spend" card on the
  dashboard): safe-to-spend = chosen balances − unrecorded bills before
  payday − spending recorded with a later date − planned savings −
  reserve; expected income is listed, never counted. Payday is a
  recurring income (any frequency) or a chosen date (`src/lib/plan.ts`).
  26: debts (`/debts`, in "More"; `src/lib/debts.ts`) and the what-if
  simulator (`/what-if`, in "More"; `src/lib/whatif.ts`). A debt keeps the
  balance the user entered and its date; what's left = that balance −
  payments recorded on or after it (an estimate, said so: interest since
  isn't added). "Record payment" opens the form as a "Debt Payments"
  expense with id `debt-<debtId>-<uuid>`; a linked recurring item's
  occurrences count too. Payoff: each period, interest = balance × rate ÷
  periods a year (rounded), then the installment; "never" if it doesn't
  cover the interest. What-if results are never saved and sit in a dashed
  "Simulation, not your real data" box with their assumptions.

Next, in order (PRD 29):

- **When the user adds the API key**: test a real receipt end to end on
  localhost (review card, warnings, duplicates, saving), then production.
- 27: final review: done (2026-10-14). Every Convex function checks the
  owner; no secrets in client code; `npm audit` clean; security headers
  in `next.config.ts`; axe-core clean on all 12 pages, light and dark,
  plus the dialog and the More menu; keyboard focus visible and returned
  after dialogs. axe can't run in an iframe any more (X-Frame-Options):
  run it page by page. Known limits are in the README. Speed on the live
  site: dashboard ready in ~1.9 s on a first visit, ~0.4 s after; about
  280 KB of app JavaScript (compressed) plus 240 KB for Clerk's dev
  script; layout shift 0.007.
- **Design (in progress, 2026-10-15)**: a new look inspired by a picture
  the user sent (a "bento" finance dashboard): warm light grey page, white
  cards (20px corners, soft shadows), black for what's selected, sage
  green as the brand colour, DM Sans. Colours are tokens in
  `globals.css` (contrast measured in its comment), so the user can ask
  to change them later. Done so far: the frame (`AppNav.tsx`: a side bar
  of round icons from lg, a bottom bar with "More" below lg; the top bar
  `SiteHeader.tsx` only below lg or signed out), and the dashboard (a
  greeting, four tiles with the green "Safe to spend", a cash flow line
  chart, a "% of income spent" gauge, the transactions in one card).
  Then, from two more pictures: glass cards (`glass` / `glass-strong`
  utilities in `globals.css`), a moving backdrop rebuilt in CSS from the
  user's picture of blue/teal under a dot grid (`.app-backdrop`; pastel
  in light mode so text on it stays readable, deep navy in dark mode),
  and "Safe to spend" as dark glass with a turning, glowing rim
  (`.glow-card`). The backdrop and rim stay still with reduced motion.
  Then (third round): the backdrop is now a photo of misty green hills
  (`public/backdrop.webp`, the user's picture with its search bar filled
  in), drifting slowly (32s each way). The user didn't want a panel hiding
  the photo, so there's none: the photo shows between the cards. Text
  outside a card sits plain on the photo (the "Loose text" rule in
  `globals.css`, in the components layer so a component's own classes
  win; `on-photo` for anything else, like the top bar): no boxes or glow
  (the user didn't want them). Light mode: a pale veil on the photo and
  near-black text (5.6:1); dark mode: a dark veil and white text (6.0:1).
  The user wanted light to look clearly light, with the photo still a
  little visible (veil 45% → 70%, top to bottom). Glass opacity (60% light /
  50% dark) is the least that keeps every text colour on cards AA over
  that photo, measured with a script over the photo itself. Glass puts the normal text colours back (`--base-*`), so
  a card that is itself an `li` (or glass inside loose text) isn't turned
  white. `--canvas` is the photo's darkened average, so white text reads
  before it loads and axe measures against something realistic.
  Sign in / Sign up (`AuthLayout.tsx`): a headline and three points in
  white on the photo, Clerk's form on glass (`authAppearance`). They can
  only be seen signed out: check them with headless Chrome and a fresh
  profile, never by signing out. At phone widths use the DevTools
  protocol (device metrics), not `--window-size` (Chrome won't go under
  ~500px and the screenshot looks too wide).
  Scroll animations (`view()` timelines) follow the nearest scroll box:
  use `overflow-clip`, never `overflow-hidden`, on anything around an
  animated card or row, or it never animates.
  Avatars: 8 drawn pictures (`public/avatars/a1–a8.webp`, cut from the
  user's sheet `Desktop/Avatar.png.jfif`), chosen in Settings and saved
  as the `avatar` preference (Convex settings row); or the user's own
  photo, uploaded to their Clerk account (`setProfileImage`, JPEG/PNG/WebP
  up to 5 MB, `src/lib/photo.ts`). A real upload hasn't been tested: it
  would change the user's Clerk photo, so ask first. Cards have a sheen, a deeper shadow and a light spot
  that follows the mouse (data-lit, --spot-x/--spot-y);
  "Safe to spend" has a light version in light
  mode; a soft light follows the mouse (`CursorLight.tsx`); cards fade
  and rise in as they're scrolled to and page titles come into focus
  (CSS scroll-driven animations, `.reveal`), as in a video the user sent.
  Long lists start short with "Show all N" / "Show N more"
  (`ShowMore.tsx`: `useShowMore` and `ShortList`): dashboard
  transactions (6), Transactions page (25 at a time), spending by
  category (5), Settings categories (8), Reports categories (8), goal
  history and debt payments (5).
  Landing page for visitors (`Landing.tsx`): `/` shows it when signed
  out (`page.tsx` checks `auth()`), the dashboard when signed in. A
  hero with a dashboard preview (made-up numbers, said so), 9 features,
  3 steps, privacy, and a last call; only claims the app really makes
  (receipt scanning left out until the API key is set). The signed-out
  top bar has "Sign in" and "Get started".
  Logo: the user's own logo (a green wallet with a light leaf), cut out
  of their picture as is (`public/logo-mark.png`, 255 × 276; the metal
  background removed by colour). Don't redraw it: the user wants it
  exactly as made. It makes the tab icon (`src/app/icon.png`, 64px) and
  the iPhone icon (`apple-icon.tsx`, on off-white).
- Optional later: automatic exchange rates from a provider (PRD 11.4),
  once one is chosen and its limits documented.
- Later: a domain of our own, Clerk's production instance (then remove
  the preview strip), and the mobile app (Expo).

Navigation (`src/components/AppNav.tsx`): the side bar shows the daily
pages and the often-used ones (DAILY, OFTEN), the rest are under "More"
(SOMETIMES), so it fits a laptop's height; the phone's bottom bar has
only the four DAILY pages and "More". Put a new page in SOMETIMES unless
it's used often. Show signed-in-only parts with `WhenSignedIn`, not
Clerk's server `<Show>`: the root layout isn't drawn again after signing
in, so `<Show>` there stays "signed out" until a reload.

## Running it locally

- Backend: `npx convex dev` in its own terminal (it pushes `convex/` to
  the dev deployment `chatty-spoonbill-246` as you save).
- Site: `npm run dev` in a terminal tab (not preview_start: its health
  check sees the 307 redirect on "/" and the server gets stopped).
- `.env.local` holds the Clerk and Convex keys; it's never committed. On
  another computer it has to be copied over privately (not in a chat).
- Checks before every commit: `npm test`, `npx tsc --noEmit`,
  `npx tsc -p convex --noEmit`, `npm run lint`.

## The Anthropic API key (receipt scanning)

It lives only in Convex, never in the code, `.env.local` or a chat. The
user sets it themselves in a terminal (it's typed there, not pasted to
Claude):

```bash
npx convex env set ANTHROPIC_API_KEY
npx convex env set --deployment production-eu ANTHROPIC_API_KEY
```

(Each asks for the value. The first is the dev deployment, the second the
live site's.) Costs a few US cents per scan; the daily cap is
`DAILY_SCAN_LIMIT` in `src/lib/receipts.ts`.

## Deployments

- Live site: https://pocketwise-rho-sable.vercel.app (Vercel, from the
  private GitHub repo `AyoubHa19/pocketwise`, branch `main`).
- Convex production is **`production-eu`** (`chatty-cuttlefish-99`,
  Ireland). Target it with `--deployment production-eu`.
  **Never use `--prod`**: that's an old, unused US deployment.
- Clerk is still its development instance (hence the preview strip).

## Test data kept on the dev deployment

Everything named "(sample)": transactions (Coffee, ATM withdrawal,
Supermarket, Bus ticket, Rent, Croissant in EUR), the "Euro wallet"
account, budgets (All spending, Food, Pet food), goals (Trip, Emergency
fund), recurring items (Rent, Internet, Salary), the rate
1 EUR = 4.2815 AED ("My bank (sample)"), and the plan (payday = Salary
(sample), savings 888.89, reserve 1,000), and the debt "Car loan
(sample)" (10,000 AED on 2026-10-14, 1,000 a month at 12%, 20,000
borrowed) with one 1,000 payment recorded the same day.
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
