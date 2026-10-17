"use client";

import { useActionState, useRef } from "react";
import { sendMessage } from "@/app/actions/messages";

export function ChatForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(sendMessage.bind(null, groupId), {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="mt-3">
      <label htmlFor="chat-body" className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="chat-body"
          name="body"
          rows={2}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.fieldErrors?.body && (
        <p className="mt-1 text-sm text-red-600">{state.fieldErrors.body[0]}</p>
      )}
    </form>
  );
}
