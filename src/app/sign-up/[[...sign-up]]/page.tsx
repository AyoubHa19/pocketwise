import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
};

// [[...sign-up]] catches every path under /sign-up, for Clerk's own steps
// (like verifying the email address).
export default function SignUpPage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl justify-center px-4 py-8 sm:px-6 sm:py-12">
      <SignUp />
    </section>
  );
}
