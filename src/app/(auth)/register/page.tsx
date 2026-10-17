import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Start a circle</h1>
      <p className="mb-7 text-muted">Create your account to study with your classmates.</p>
      <AuthForm mode="register" redirectTo={redirectTo} />
    </>
  );
}
