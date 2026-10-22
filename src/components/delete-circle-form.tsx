"use client";

import { useActionState } from "react";
import { deleteGroup, type DeleteState } from "@/app/actions/deletion";

export function DeleteCircleForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteGroup.bind(null, groupId), {});

  return (
    <form action={action} className="mt-3 space-y-3 text-sm" noValidate>
      <p>
        This permanently deletes <span className="font-semibold">{groupName}</span> for everyone: all posts, chat,
        study sessions, resources and uploaded files. It cannot be undone.
      </p>
      <div>
        <label htmlFor="dc-confirm" className="block text-xs font-semibold">
          Type the circle name to confirm
        </label>
        <input
          id="dc-confirm"
          name="confirm"
          autoComplete="off"
          aria-invalid={state.fieldErrors?.confirm ? true : undefined}
          aria-describedby={state.fieldErrors?.confirm ? "dc-confirm-error" : undefined}
          placeholder={groupName}
          className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 outline-none focus:border-red-600"
        />
        {state.fieldErrors?.confirm && <p id="dc-confirm-error" role="alert" className="mt-1 text-xs text-red-600">{state.fieldErrors.confirm[0]}</p>}
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
        {pending ? "Deleting…" : "Delete this circle forever"}
      </button>
    </form>
  );
}
