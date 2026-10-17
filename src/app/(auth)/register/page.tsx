import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
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
      <h1 className="mb-1 font-display text-3xl font-bold">Start a circle</h1>
      <p className="mb-7 text-muted">Create your account to study with your classmates.</p>
      <AuthForm mode="register" redirectTo={redirectTo} />
    </>
  );
}
