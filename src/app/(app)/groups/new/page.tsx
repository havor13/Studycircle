"use client";

import { useActionState } from "react";
import { createGroup } from "@/app/actions/groups";

const fields = [
  { name: "name", label: "Circle name", placeholder: "e.g. Calculus Study Crew" },
  { name: "subject", label: "Subject (optional)", placeholder: "e.g. MATH 112" },
  { name: "description", label: "Description (optional)", placeholder: "What will you study together?" },
] as const;

export default function NewGroupPage() {
  const [state, action, pending] = useActionState(createGroup, {});

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl font-bold">Create a circle</h1>
      <form action={action} className="mt-6 space-y-4" noValidate>
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="block text-sm font-semibold">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              placeholder={f.placeholder}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
            />
            {state.fieldErrors?.[f.name] && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors[f.name]![0]}</p>
            )}
          </div>
        ))}

        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
          <input id="listed" name="listed" type="checkbox" className="mt-1 h-4 w-4" />
          <label htmlFor="listed" className="text-sm">
            <span className="font-semibold">Show this circle in Find circles</span>
            <span className="mt-0.5 block text-muted">
              Anyone logged in can find it and join. Leave this off to keep the circle invite-only.
              You can change it later on the circle page.
            </span>
          </label>
        </div>

        <button
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create circle"}
        </button>
      </form>
    </div>
  );
}
