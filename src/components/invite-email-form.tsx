"use client";

import { useActionState } from "react";
import { sendInvites, type InviteState } from "@/app/actions/invites";

export function InviteEmailForm({ groupId, configured }: { groupId: string; configured: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvites.bind(null, groupId), {});

  if (!configured) {
    return <p className="mt-3 text-xs text-muted">Email is not set up on this server yet, so invitations cannot be sent.</p>;
  }

  return (
    <form action={action} className="mt-3 space-y-2" noValidate>
      <label htmlFor="invite-emails" className="block text-xs font-semibold">
        Email addresses (up to 5, separated by commas or new lines)
      </label>
      <textarea
        id="invite-emails"
        name="emails"
        rows={3}
        maxLength={2000}
        placeholder="friend@example.com, classmate@school.edu"
        className="w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand"
      />
      <p className="text-xs text-muted">
        Each person gets one email with the invite link. You can send 20 invitations a day.
      </p>

      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      <div aria-live="polite">
        {state.sent !== undefined && state.sent > 0 && (
          <p role="status" className="text-xs text-green-700">
            {state.sent === 1 ? "1 invitation sent." : `${state.sent} invitations sent.`}
          </p>
        )}
        {state.notes && state.notes.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
            {state.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invitations"}
      </button>
    </form>
  );
}
