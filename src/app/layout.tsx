import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { MotionProvider } from "@/components/MotionProvider";
import { SiteHeader } from "@/components/SiteHeader";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Clerk knows who's signed in; Convex, inside it, sends that
            sign-in along with every request for data. */}
        <ClerkProvider>
          <ConvexClientProvider>
            <MotionProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
            </MotionProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
