"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type PasswordState } from "@/app/actions/account";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand";

function Field({
  id,
  label,
  autoComplete,
  errors,
}: {
  id: string;
  label: string;
  autoComplete: string;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={id} type="password" autoComplete={autoComplete} className={inputClass} />
      {errors?.[0] && <p className="mt-1 text-sm text-red-600">{errors[0]}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the boxes after a successful change.
  useEffect(() => {
    if (state.done) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Password changed.
        </p>
      )}
      <Field
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        errors={state.fieldErrors?.currentPassword}
      />
      <Field
        id="newPassword"
        label="New password (at least 8 characters)"
        autoComplete="new-password"
        errors={state.fieldErrors?.newPassword}
      />
      <Field
        id="confirmPassword"
        label="New password again"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
