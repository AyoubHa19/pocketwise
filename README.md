# Pocketwise

A simple personal finance tracker for the web, made for people anywhere in
the world. Record what you earn and spend, and see each month's income,
spending, and balance at a glance. It works on phones and computers.

Everything stays in your browser: there is no account, no server, and your
data never leaves your device.

## What it does

- Add, edit, and delete transactions (income or expense, with a category,
  date, and optional note).
- Pick your currency once, from every currency your browser knows, and
  change it later in Settings.
- See one month at a time: income, spending, and balance, with ‹ and › to
  move between months.
- Keep your data after you close the page, and stay in sync between tabs.

## Running it

You need [Node.js](https://nodejs.org) 22.12 or later, 24, or 26 and up
(it's built with 24). The test tool, Vitest, doesn't support 23 or 25.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The page updates as you edit the code.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app for development |
| `npm test` | Runs the automated tests once |
| `npm run test:watch` | Re-runs the tests every time you save a file |
| `npm run lint` | Checks the code for mistakes and bad patterns |
| `npm run build` | Builds the app for production, checking all the types |
| `npm start` | Runs the production build (after `npm run build`) |

## Where things are

```
src/
├── app/            Pages: each folder is a URL (settings/ is /settings)
│   ├── layout.tsx  The frame around every page: header, fonts, title
│   ├── page.tsx    The home page (/)
│   ├── icon.svg    The app icon; apple-icon.tsx turns it into a PNG
│   └── settings/
├── components/     The pieces of the screens (forms, lists, header)
└── lib/            Everything that isn't a screen: money, dates,
                    totals, saving. Tests sit beside the code they
                    check, as *.test.ts.
```

Built with [Next.js](https://nextjs.org) (App Router), TypeScript,
[Tailwind CSS](https://tailwindcss.com), and [Vitest](https://vitest.dev)
for tests.

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

**Data lives in `localStorage`, with a version number.** Saved data is
checked before use (`isTransaction`). If it's damaged or in an unknown
format, a copy is kept under a `.backup-` key before anything is
replaced, so nothing is silently lost.

**Browser-only values are read with `useSyncExternalStore`.** The server
can't see your storage, your clock, or your browser's currency list, so
it renders a "Loading…" state, and the browser fills in the real values.
This keeps the server's HTML and the browser's first render the same.

**Every control is at least 44px tall**, the size Apple and Google
recommend for fingers.

## Limits of this first version

- Data is saved only in this browser on this device. Clearing your browser
  data deletes it, and there's no sync between devices yet.
- One currency at a time, with no exchange rates.
- English only, and the categories are a fixed list.
- The tests cover money, dates, monthly totals, transactions, and
  recovering damaged saved data. The parts that need a browser (the
  screens and the stores that connect React to `localStorage`) were
  checked by hand.
