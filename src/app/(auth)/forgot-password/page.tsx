import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Forgot your password?</h1>
      <p className="mb-7 text-muted">Enter your email and we will send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
