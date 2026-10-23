"use client";

import { useActionState } from "react";
import { createComment, type CommentState } from "@/app/actions/comments";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(createComment.bind(null, postId), {});
  const errorId = `comment-${postId}-error`;
  const message = state.fieldErrors?.body?.[0] ?? state.error;

  return (
    <form action={action} className="mt-3" noValidate>
      <label htmlFor={`comment-${postId}`} className="sr-only">
        Write a comment
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={`comment-${postId}`}
          name="body"
          rows={1}
          maxLength={500}
          placeholder="Write a comment…"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
        <button
          disabled={pending}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand disabled:opacity-60"
        >
          {pending ? "Sending…" : "Comment"}
        </button>
      </div>
      {message && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}
