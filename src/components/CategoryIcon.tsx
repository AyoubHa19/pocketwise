import {
  ArrowLeftRight,
  BriefcaseBusiness,
  BusFront,
  ChartPie,
  Clapperboard,
  CreditCard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { sameName } from "@/lib/categories";
import { TRANSFER_CATEGORY } from "@/lib/transactions";

// The default categories (src/lib/categories.ts) by name, plus "Rent" from
// the first, fixed list, and "All spending" for budgets. A category the
// user made, or renamed, gets the general tag icon.
const icons: [string, LucideIcon][] = [
  ["Housing", House],
  ["Rent", House],
  ["Food", UtensilsCrossed],
  ["Transport", BusFront],
  ["Bills", Receipt],
  ["Health", HeartPulse],
  ["Shopping", ShoppingBag],
  ["Entertainment", Clapperboard],
  ["Education", GraduationCap],
  ["Travel", Plane],
  ["Personal Care", Sparkles],
  ["Subscriptions", Repeat],
  ["Debt Payments", CreditCard],
  ["Other", Ellipsis],
  ["Salary", Wallet],
  ["Freelance", Laptop],
  ["Business", BriefcaseBusiness],
  ["Investments", TrendingUp],
  ["Gifts", Gift],
  ["Other Income", Ellipsis],
  [TRANSFER_CATEGORY, ArrowLeftRight],
  // Not a category: the budget for all spending.
  ["All spending", ChartPie],
];

/**
 * The category's icon in a soft circle. It's decoration: the category's
 * name is always written next to it, so screen readers skip the icon.
 */
export function CategoryIcon({
  category,
  small = false,
}: {
  category: string;
  /** 32px instead of 40px, for the charts. */
  small?: boolean;
}) {
  const Icon = icons.find(([name]) => sameName(name, category))?.[1] ?? Tag;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground ${
        small ? "h-8 w-8" : "h-10 w-10"
      }`}
    >
      <Icon size={small ? 16 : 20} strokeWidth={1.75} />
    </span>
  );
}
