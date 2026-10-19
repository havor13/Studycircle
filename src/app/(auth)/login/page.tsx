import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  // Already logged in (and the account still exists)? Skip the form.
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Welcome back</h1>
      <p className="mb-7 text-muted">Log in to pick up where your circle left off.</p>
      <AuthForm mode="login" redirectTo={redirectTo} />
      <p className="mt-4 text-sm text-muted">
        <Link href="/forgot-password" className="underline">
          Forgot your password?
        </Link>
      </p>
    </>
  );
}
