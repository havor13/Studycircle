"use client";

import { useActionState } from "react";
import { joinByCode } from "@/app/actions/groups";

export function JoinByCodeForm() {
  const [state, action, pending] = useActionState(joinByCode, {});

  return (
    <form
      action={action}
      className="mb-8 rounded-2xl border border-line bg-surface p-5"
      noValidate
    >
      <label htmlFor="invite-code" className="block font-display text-lg font-bold">
        Join with an invite link
      </label>
      <p className="mt-1 text-sm text-muted">
        Paste the whole link or just the code someone sent you.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id="invite-code"
          name="code"
          autoComplete="off"
          placeholder="http://localhost:3000/join/…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-brand"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Checking…" : "Continue"}
        </button>
      </div>
      {state.fieldErrors?.code && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.fieldErrors.code[0]}
        </p>
      )}
    </form>
  );
}
