"use client";

import { useActionState } from "react";
import { addResource } from "@/app/actions/resources";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand";

export function ResourceForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(addResource.bind(null, groupId), {});

  return (
    <form action={action} className="mt-3 space-y-3" noValidate>
      <div>
        <label htmlFor="res-title" className="block text-xs font-semibold">Title</label>
        <input id="res-title" name="title" placeholder="e.g. Khan Academy: limits" className={inputClass} />
        {state.fieldErrors?.title && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="res-url" className="block text-xs font-semibold">Link</label>
        <input id="res-url" name="url" placeholder="https://…" className={inputClass} />
        {state.fieldErrors?.url && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.url[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="res-tags" className="block text-xs font-semibold">Tags (optional, comma separated)</label>
        <input id="res-tags" name="tags" placeholder="video, week 3" className={inputClass} />
      </div>
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add resource"}
      </button>
    </form>
  );
}
