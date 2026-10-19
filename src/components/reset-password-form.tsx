"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, token), {});

  if (state.done) {
    return (
      <div role="status" className="space-y-3">
        <p className="rounded-lg border border-line bg-surface p-4 text-sm">Your password was changed.</p>
        <Link href="/login" className="inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
          Log in
        </Link>
      </div>
    );
  }

  const fields = [
    { name: "newPassword", label: "New password" },
    { name: "confirmPassword", label: "Type it again" },
  ] as const;

  return (
    <form action={action} className="space-y-4" noValidate>
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-sm font-semibold">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
          />
          {state.fieldErrors?.[f.name] && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors[f.name]![0]}</p>
          )}
        </div>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}{" "}
          <Link href="/forgot-password" className="underline">
            Get a new link
          </Link>
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
