"use client";

import { useState, useTransition } from "react";
import { saveEmailPreference, sendTestEmail } from "@/app/actions/account";

type Message = { ok: boolean; text: string } | null;

export function EmailSettings({
  email,
  enabled,
  configured,
}: {
  email: string;
  enabled: boolean;
  configured: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    setMessage(null);
    startTransition(async () => {
      const result = await saveEmailPreference(next);
      if (!result.ok) setOn(!next); // put the switch back if it did not save
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestEmail();
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand"
        />
        <span>
          <span className="font-semibold">Email me about circle activity</span>
          <span className="block text-muted">
            New posts, planned study sessions, new members (for admins) and role changes. Sent to {email}.
          </span>
        </span>
      </label>

      {configured ? (
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand disabled:opacity-60"
        >
          {pending ? "Working…" : "Send me a test email"}
        </button>
      ) : (
        <p className="text-sm text-muted">Email is not set up on this server yet, so nothing is sent.</p>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
