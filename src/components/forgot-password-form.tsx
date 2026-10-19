"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset } from "@/app/actions/password-reset";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  const [email, setEmail] = useState("");

  if (state.done) {
    // The same words for every address, so this page cannot be used to find out who has an account.
    return (
      <div role="status" className="space-y-2 rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="font-semibold">Check your email</p>
        <p>
          If <span className="font-semibold">{email.trim()}</span> belongs to a StudyCircle account, we have sent a
          link to that address. It works once and for 15 minutes.
        </p>
        <p className="text-muted">
          It usually arrives within a minute. Look in your spam folder too, and check that you typed the address
          you signed up with.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Your account email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
        />
        {state.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email[0]}</p>}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
