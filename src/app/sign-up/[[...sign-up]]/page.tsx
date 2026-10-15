import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AuthLayout, authAppearance } from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Create your account",
};

// [[...sign-up]] catches every path under /sign-up, for Clerk's own steps
// (like verifying the email address).
export default function SignUpPage() {
  return (
    <AuthLayout
      title="See where your money goes."
      intro="Create your free account: add what comes in and goes out, and Pocketwise keeps the picture clear."
    >
      <SignUp appearance={authAppearance} />
    </AuthLayout>
  );
}
