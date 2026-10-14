import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { DataSync } from "@/components/DataSync";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { MotionProvider } from "@/components/MotionProvider";
import { PreviewBanner } from "@/components/PreviewBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeSync } from "@/components/ThemeSync";
import { isTheme, THEME_COOKIE } from "@/lib/preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages that set their own title, like "Settings", become
  // "Settings · Pocketwise". Pages that don't just show "Pocketwise".
  title: { default: "Pocketwise", template: "%s · Pocketwise" },
  description: "Track your income and spending, month by month.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The theme chosen in Settings, remembered in a cookie so the very first
  // paint is in the right colours. "system" (or none) leaves it to the
  // device. ThemeSync keeps the cookie in step with the account.
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(saved) && saved !== "system" ? saved : undefined;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Clerk knows who's signed in; Convex, inside it, sends that
            sign-in along with every request for data. */}
        <ClerkProvider>
          <ConvexClientProvider>
            <ThemeSync />
            <DataSync />
            <MotionProvider>
              <PreviewBanner />
              <SiteHeader />
              <main className="flex-1">{children}</main>
            </MotionProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
