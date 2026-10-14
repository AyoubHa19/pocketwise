import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fitOneLine } from "@/components/fitOneLine";
import { cardClass, colorTransition } from "@/components/formStyles";
import type { Account } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay, type DateOrder } from "@/lib/preferences";
import { convertedTotal, rateText, type ExchangeRate } from "@/lib/rates";
import { accountBalances, totalBalanceByCurrency } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

type Props = {
  accounts: Account[];
  transactions: Transaction[];
  today: string;
  /** The user's currency, whose total is shown first and largest. */
  mainCurrency: string;
  /** The user's exchange rates, for a converted total across currencies. */
  rates?: ExchangeRate[];
  dateOrder?: DateOrder;
};

const linkClass = `inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline ${colorTransition}`;

/**
 * All the user's money now: the total of their accounts in their main
 * currency (other currencies listed apart, never added in), then each open
 * account with its own balance. An account without a starting balance has
 * no balance yet, and says so instead of showing a made-up number.
 */
export function TotalBalanceCard({
  accounts,
  transactions,
  today,
  mainCurrency,
  rates = [],
  dateOrder = DEFAULT_PREFERENCES.dateOrder,
}: Props) {
  const open = accounts.filter((account) => !account.archived);
  const balances = accountBalances(open, transactions, today);
  const totals = totalBalanceByCurrency(open, balances);
  const main = totals.find((t) => t.currency === mainCurrency) ?? totals[0];
  const others = totals.filter((t) => t !== main);
  // Everything in the main currency, converted at the user's own rates
  // (PRD 11): shown as converted, beside the rates and their dates, and
  // leaving out any currency without a rate rather than guessing.
  const converted = others.length > 0 ? convertedTotal(totals, mainCurrency, rates) : null;

  return (
    <section
      aria-labelledby="total-balance-heading"
      className={`${cardClass} min-h-[9.125rem] px-5 pt-2 pb-5 sm:px-6`}
    >
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id="total-balance-heading" className="text-sm font-medium text-muted">
          Total balance
        </h2>
        <Link href="/accounts" className={linkClass}>
          Accounts
        </Link>
      </div>

      {open.length === 0 ? (
        <p className="mt-1 text-sm text-muted">
          Add your accounts (cash, bank, wallet…) with what&apos;s in them, and
          Pocketwise keeps their total here as you add transactions.
        </p>
      ) : (
        <>
          {main ? (
            <Total amountMinor={main.amountMinor} currency={main.currency} />
          ) : (
            <p className="mt-1 text-sm text-muted">
              Give your accounts a starting balance to see your total.
            </p>
          )}
          {others.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              Also, in their own currencies: {others.map((t) => formatMoney(t)).join(" · ")}
            </p>
          )}
          {converted && converted.used.length > 0 && (
            <div className="mt-2 rounded-control bg-surface-muted px-3 py-2 text-sm">
              <p>
                All together, converted to {mainCurrency}:{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney({ amountMinor: converted.amountMinor, currency: mainCurrency })}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                At your rates:{" "}
                {converted.used.map((r) => `${rateText(r)} (${formatDay(r.date, today, dateOrder)})`).join(", ")}
                {converted.missing.length > 0 && `. No rate for ${converted.missing.join(", ")}, so not included.`}
              </p>
            </div>
          )}
          {converted && converted.used.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              To see them all together in {mainCurrency}, add exchange rates in{" "}
              <Link href="/settings" className="font-medium text-foreground underline underline-offset-2">
                Settings
              </Link>
              .
            </p>
          )}
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {open.map((account) => {
              const balance = balances.get(account.id);
              return (
                <li key={account.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-muted">{account.name}</span>
                  {balance === null || balance === undefined ? (
                    <span className="shrink-0 text-muted">No starting balance yet</span>
                  ) : (
                    <span className={`shrink-0 font-medium tabular-nums ${balance < 0 ? "text-danger" : ""}`}>
                      {formatMoney({ amountMinor: balance, currency: account.currency })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function Total({ amountMinor, currency }: { amountMinor: number; currency: string }) {
  const text = formatMoney({ amountMinor, currency });
  return (
    // @container: the box the amount's font size is fitted to.
    <div className="@container">
      <p
        className={`mt-1 leading-8 font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] ${
          amountMinor < 0 ? "text-danger" : ""
        }`}
        style={fitOneLine(text, "1.125rem", "1.5rem")}
      >
        <AnimatedNumber text={text} value={amountMinor} />
      </p>
    </div>
  );
}
