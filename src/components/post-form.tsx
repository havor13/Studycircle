"use client";

import { useActionState } from "react";
import { createPost } from "@/app/actions/posts";

export function PostForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(createPost.bind(null, groupId), {});

  return (
    <form action={action} className="rounded-2xl border border-line bg-surface p-4">
      <label htmlFor="body" className="sr-only">
        Share something with the circle
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        placeholder="Share a question, a tip, or what you're studying…"
        className="w-full resize-y rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-brand"
      />
      {state.fieldErrors?.body && (
        <p className="mt-1 text-sm text-red-600">{state.fieldErrors.body[0]}</p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
