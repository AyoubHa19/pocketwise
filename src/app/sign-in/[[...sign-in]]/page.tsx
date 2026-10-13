import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

// [[...sign-in]] catches every path under /sign-in, so Clerk's own steps
// (like entering the emailed code) live at addresses like /sign-in/factor-one.
export default function SignInPage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl justify-center px-4 py-8 sm:px-6 sm:py-12">
      <SignIn />
    </section>
  );
}
