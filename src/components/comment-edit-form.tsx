"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateComment, type CommentState } from "@/app/actions/comments";

/** "Edit" for your own comment: a small box that closes itself when saved. */
export function CommentEditForm({ commentId, body }: { commentId: string; body: string }) {
  const [state, action, pending] = useActionState<CommentState & { done?: boolean }, FormData>(
    updateComment.bind(null, commentId),
    {},
  );
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const errorId = `comment-edit-${commentId}-error`;
  const message = state.fieldErrors?.body?.[0] ?? state.error;

  useEffect(() => {
    if (state.done && detailsRef.current) detailsRef.current.open = false;
  }, [state]);

  return (
    <details ref={detailsRef} className="text-xs">
      <summary className="cursor-pointer text-muted hover:text-brand">Edit</summary>
      <form action={action} className="mt-2 flex items-end gap-2" noValidate>
        <label htmlFor={`comment-edit-${commentId}`} className="sr-only">
          Edit your comment
        </label>
        <textarea
          id={`comment-edit-${commentId}`}
          name="body"
          defaultValue={body}
          rows={2}
          maxLength={500}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <button
          disabled={pending}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {message && (
        <p id={errorId} role="alert" className="mt-1 text-red-600">
          {message}
        </p>
      )}
    </details>
  );
}
