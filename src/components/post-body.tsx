"use client";

import { useActionState, useEffect, useState } from "react";
import { updatePost, type PostEditState } from "@/app/actions/posts";

export function PostBody({
  postId,
  body,
  canEdit,
  edited,
}: {
  postId: string;
  body: string;
  canEdit: boolean;
  edited: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<PostEditState, FormData>(updatePost.bind(null, postId), {});

  useEffect(() => {
    if (state.done) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <form action={action} className="mt-3 space-y-2" noValidate>
        <label htmlFor={`edit-${postId}`} className="sr-only">
          Edit your post
        </label>
        <textarea
          id={`edit-${postId}`}
          name="body"
          defaultValue={body}
          rows={4}
          className="w-full rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-brand"
        />
        {state.fieldErrors?.body && <p className="text-sm text-red-600">{state.fieldErrors.body[0]}</p>}
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <div className="flex gap-3 text-sm font-semibold">
          <button disabled={pending} className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-muted hover:text-brand">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <p className="mt-3 whitespace-pre-wrap">{body}</p>
      <p className="mt-1 flex items-center gap-3 text-xs text-muted">
        {edited && <span>(edited)</span>}
        {canEdit && (
          <button onClick={() => setEditing(true)} className="font-semibold hover:text-brand">
            Edit
          </button>
        )}
      </p>
    </>
  );
}
