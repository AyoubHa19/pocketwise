"use client";

import { UserButton } from "@clerk/nextjs";
import { useAccountPreferences } from "@/lib/accountData";
import { AVATAR_LABELS, type Avatar } from "@/lib/preferences";

/** One of the drawn pictures (public/avatars), round, on its warm background. */
export function AvatarPicture({ avatar, size, label = false }: { avatar: Avatar; size: number; label?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small fixed images from public/, no resizing needed.
    <img
      src={`/avatars/${avatar}.webp`}
      width={size}
      height={size}
      alt={label ? AVATAR_LABELS[avatar] : ""}
      className="shrink-0 rounded-full bg-[#f6e9df] object-cover"
    />
  );
}

/**
 * Clerk's account button (Manage account, Sign out), showing the picture
 * the user chose in Settings instead of Clerk's own, when there is one.
 */
export function AccountButton() {
  const avatar = useAccountPreferences()?.avatar ?? null;
  return (
    <UserButton
      appearance={
        avatar
          ? {
              elements: {
                userButtonAvatarBox: {
                  backgroundColor: "#f6e9df",
                  backgroundImage: `url(/avatars/${avatar}.webp)`,
                  backgroundSize: "cover",
                },
                userButtonAvatarImage: { opacity: 0 },
              },
            }
          : undefined
      }
    />
  );
}

