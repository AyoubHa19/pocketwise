import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fitOneLine } from "@/components/fitOneLine";
import { cardClass, colorTransition } from "@/components/formStyles";
import type { Account } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { accountBalances, totalBalanceByCurrency } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

type Props = {
  accounts: Account[];
  transactions: Transaction[];
  today: string;
  /** The user's currency, whose total is shown first and largest. */
  mainCurrency: string;
};

const linkClass = `inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline ${colorTransition}`;

/**
 * All the user's money now: the total of their accounts in their main
 * currency (other currencies listed apart, never added in), then each open
 * account with its own balance. An account without a starting balance has
 * no balance yet, and says so instead of showing a made-up number.
 */
export function TotalBalanceCard({ accounts, transactions, today, mainCurrency }: Props) {
  const open = accounts.filter((account) => !account.archived);
  const balances = accountBalances(open, transactions, today);
  const totals = totalBalanceByCurrency(open, balances);
  const main = totals.find((t) => t.currency === mainCurrency) ?? totals[0];
  const others = totals.filter((t) => t !== main);

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
              Also, kept apart (no exchange rates):{" "}
              {others.map((t) => formatMoney(t)).join(" · ")}
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
