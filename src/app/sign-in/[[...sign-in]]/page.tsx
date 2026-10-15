import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AuthLayout, authAppearance } from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Sign in",
};

// [[...sign-in]] catches every path under /sign-in, so Clerk's own steps
// (like entering the emailed code) live at addresses like /sign-in/factor-one.
export default function SignInPage() {
  return (
    <AuthLayout
      title="Your money, calmly in view."
      intro="Accounts, budgets, bills and goals in one place, and what's safe to spend until payday."
    >
      <SignIn appearance={authAppearance} />
    </AuthLayout>
  );
}
