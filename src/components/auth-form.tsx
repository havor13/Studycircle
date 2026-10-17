"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions/auth";

type Props = {
  mode: "login" | "register";
  redirectTo?: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand";

export function AuthForm({ mode, redirectTo }: Props) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState(isRegister ? register : login, {});

  // Keep the destination when switching between the login and register pages.
  const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {isRegister && (
        <div>
          <label htmlFor="name" className="block text-sm font-semibold">Name</label>
          <input id="name" name="name" autoComplete="name" className={inputClass} />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
        {state.fieldErrors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          className={inputClass}
        />
        {state.fieldErrors?.password && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href={`/login${query}`} className="font-semibold text-brand hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/register${query}`} className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
