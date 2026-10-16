import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Start a circle</h1>
      <p className="mb-7 text-muted">Create your account to study with your classmates.</p>
      <AuthForm mode="register" />
    </>
  );
}
