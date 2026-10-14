import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fitOneLine } from "@/components/fitOneLine";
import { cardClass, colorTransition } from "@/components/formStyles";
import { DEFAULT_PREFERENCES, formatDay, type DateOrder } from "@/lib/preferences";
import { formatMoney } from "@/lib/money";
import {
  accountBalance,
  currenciesLeftOut,
  type OpeningBalance,
} from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
  openingBalance: OpeningBalance | null;
  today: string;
  /** Writes the start date in the user's date format (13 Oct, Oct 13, 13/10/2026). */
  dateOrder?: DateOrder;
};

const linkClass = `inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline ${colorTransition}`;

/**
 * The money in the account now, for every month together. It needs a
 * starting point from the user, so until there is one it invites them to
 * add it. Both versions are the same height, so the page doesn't shift and
 * the loading skeleton matches either.
 */
export function AccountBalanceCard({
  transactions,
  openingBalance,
  today,
  dateOrder = DEFAULT_PREFERENCES.dateOrder,
}: Props) {
  return (
    <section
      aria-labelledby="account-balance-heading"
      className={`${cardClass} min-h-[9.125rem] px-5 pt-2 pb-5 sm:px-6`}
    >
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id="account-balance-heading" className="text-sm font-medium text-muted">
          Account balance
        </h2>
        <Link
          href="/settings#starting-balance"
          aria-label={openingBalance ? "Change starting balance" : "Set up starting balance"}
          className={linkClass}
        >
          {openingBalance ? "Change" : "Set up"}
        </Link>
      </div>

      {openingBalance ? (
        <BalanceAmount
          balanceMinor={accountBalance(transactions, openingBalance, today)}
          leftOut={currenciesLeftOut(transactions, openingBalance, today)}
          openingBalance={openingBalance}
          today={today}
          dateOrder={dateOrder}
        />
      ) : (
        <p className="mt-1 text-sm text-muted">
          Add how much money you have, and Pocketwise keeps your total here as
          you add transactions.
        </p>
      )}
    </section>
  );
}

function BalanceAmount({
  balanceMinor,
  leftOut,
  openingBalance,
  today,
  dateOrder,
}: {
  balanceMinor: number;
  /** Currencies of transactions the balance can't include. */
  leftOut: string[];
  openingBalance: OpeningBalance;
  today: string;
  dateOrder: DateOrder;
}) {
  const currency = openingBalance.currency;
  const balance = formatMoney({ amountMinor: balanceMinor, currency });
  const start = formatMoney({ amountMinor: openingBalance.amountMinor, currency });
  return (
    // @container: the box the amount's font size is fitted to.
    <div className="@container">
      <p
        className={`mt-1 leading-8 font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] ${
          balanceMinor < 0 ? "text-danger" : ""
        }`}
        style={fitOneLine(balance, "1.125rem", "1.5rem")}
      >
        <AnimatedNumber text={balance} value={balanceMinor} />
      </p>
      <p className="mt-1 truncate text-sm text-muted">
        Started with {start} · {formatDay(openingBalance.date, today, dateOrder)}
      </p>
      {/* Said out loud, so a missing amount never looks like a wrong total.
          Only shown when it happens, so the card is usually its fixed
          height; this line makes it one line taller. */}
      {leftOut.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          Doesn&apos;t include {leftOut.join(", ")} transactions: there&apos;s
          no exchange rate to convert them.
        </p>
      )}
    </div>
  );
}
