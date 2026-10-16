import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Welcome back</h1>
      <p className="mb-7 text-muted">Log in to pick up where your circle left off.</p>
      <AuthForm mode="login" />
    </>
  );
}
