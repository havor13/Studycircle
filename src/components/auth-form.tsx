"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions/auth";
import type { FormState } from "@/lib/validations";

type Props = { mode: "login" | "register" };

const copy = {
  login: {
    action: login,
    submit: "Log in",
    pending: "Logging in…",
    switchText: "New to StudyCircle?",
    switchLink: { href: "/register", label: "Create an account" },
  },
  register: {
    action: register,
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: { href: "/login", label: "Log in" },
  },
} as const;

export function AuthForm({ mode }: Props) {
  const c = copy[mode];
  const [state, formAction, pending] = useActionState<FormState, FormData>(c.action, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      {mode === "register" && (
        <Field label="Name" name="name" autoComplete="name" errors={state.fieldErrors?.name} />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" errors={state.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "register" ? "At least 8 characters." : undefined}
        errors={state.fieldErrors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? c.pending : c.submit}
      </button>

      <p className="text-center text-sm text-muted">
        {c.switchText}{" "}
        <Link href={c.switchLink.href} className="font-semibold text-brand underline-offset-4 hover:underline">
          {c.switchLink.label}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  errors?: string[];
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 outline-none transition-colors focus:border-brand aria-[invalid=true]:border-danger"
      />
      {hint && !errors && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
      {errors && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
