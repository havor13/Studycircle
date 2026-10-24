"use client";

import { useActionState } from "react";
import { saveEmailKinds, type KindsState } from "@/app/actions/account";
import { EMAIL_KIND_OPTIONS } from "@/lib/email-kinds";

export function EmailKindsForm({
  off,
  directMessages,
  masterOn,
}: {
  off: string[];
  directMessages: boolean;
  masterOn: boolean;
}) {
  const [state, action, pending] = useActionState<KindsState, FormData>(saveEmailKinds, {});

  return (
    <form action={action} className="space-y-3">
      {!masterOn && (
        <p className="rounded-lg border border-line p-3 text-sm text-muted">
          Notification emails are switched off above, so none are sent. These choices apply when you switch them on.
        </p>
      )}
      <fieldset className="space-y-3">
        <legend className="sr-only">Which emails you want</legend>
        {EMAIL_KIND_OPTIONS.map((o) => (
          <div key={o.kind} className="flex items-start gap-3">
            <input
              id={`kind-${o.kind}`}
              name="kinds"
              value={o.kind}
              type="checkbox"
              defaultChecked={!off.includes(o.kind)}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={`kind-${o.kind}`} className="text-sm">
              <span className="font-semibold">{o.label}</span>
              <span className="block text-muted">{o.hint}</span>
            </label>
          </div>
        ))}
        <div className="flex items-start gap-3">
          <input id="kind-dm" name="dm" type="checkbox" defaultChecked={directMessages} className="mt-1 h-4 w-4" />
          <label htmlFor="kind-dm" className="text-sm">
            <span className="font-semibold">Private messages</span>
            <span className="block text-muted">Someone sends you a private message (one email per unread chat).</span>
          </label>
        </div>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="text-sm font-semibold text-brand">
          Saved.
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save choices"}
      </button>
    </form>
  );
}
