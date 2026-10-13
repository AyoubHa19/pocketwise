import { useSyncExternalStore } from "react";
import { todayISODate } from "@/lib/dates";

/**
 * Today's date as "YYYY-MM-DD", read only in the browser. The server can't
 * know the user's time zone, so it gets "" and React fills in the real date
 * right after the page opens.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribeToNothing, todayISODate, () => "");
}

function subscribeToNothing() {
  return () => {};
}
