"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteState } from "@/app/actions/deletion";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 outline-none focus:border-red-600";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});

  return (
    <form action={action} className="mt-3 space-y-3 text-sm" noValidate>
      <p>
        This permanently deletes your account and everything you made: your posts, chat messages, study sessions,
        resources, uploaded files and profile picture disappear from every circle. Circles you own that are only you
        are deleted too. It cannot be undone.
      </p>
      <div>
        <label htmlFor="da-password" className="block text-xs font-semibold">
          Your password
        </label>
        <input id="da-password" name="password" type="password" autoComplete="current-password" className={inputClass} />
        {state.fieldErrors?.password && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>}
      </div>
      <div>
        <label htmlFor="da-confirm" className="block text-xs font-semibold">
          Type DELETE to confirm
        </label>
        <input id="da-confirm" name="confirm" autoComplete="off" className={inputClass} />
        {state.fieldErrors?.confirm && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.confirm[0]}</p>}
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete my account forever"}
      </button>
    </form>
  );
}
