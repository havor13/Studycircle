import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { hashResetToken, looksLikeResetToken } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let valid = false;
  if (looksLikeResetToken(token)) {
    const row = await db.passwordReset.findUnique({ where: { tokenHash: hashResetToken(token) } });
    valid = Boolean(row && !row.usedAt && row.expiresAt.getTime() > Date.now());
  }

  if (!valid) {
    return (
      <>
        <h1 className="mb-1 font-display text-3xl font-bold">This link no longer works</h1>
        <p className="mb-7 text-muted">It may have expired (links last one hour) or already been used.</p>
        <Link href="/forgot-password" className="inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
          Get a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Choose a new password</h1>
      <p className="mb-7 text-muted">Use at least 8 characters.</p>
      <ResetPasswordForm token={token} />
    </>
  );
}
