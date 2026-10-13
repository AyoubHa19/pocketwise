import {
  BusFront,
  Ellipsis,
  HeartPulse,
  House,
  Receipt,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CATEGORIES } from "@/lib/transactions";

// Typed against CATEGORIES, so TypeScript complains if a category is added
// there without an icon here.
const icons: Record<(typeof CATEGORIES)[number], LucideIcon> = {
  Salary: Wallet,
  Food: UtensilsCrossed,
  Rent: House,
  Transport: BusFront,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Health: HeartPulse,
  Other: Ellipsis,
};

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
  // Saved data could hold a category this version doesn't know.
  const Icon = icons[category as keyof typeof icons] ?? Tag;
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
