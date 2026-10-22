"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/account";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand";

export function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const err = (field: "name" | "bio") => state.fieldErrors?.[field]?.[0];

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="profile-name" className="block text-sm font-semibold">
          Name
        </label>
        <input
          id="profile-name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          maxLength={60}
          aria-invalid={err("name") ? true : undefined}
          aria-describedby={err("name") ? "profile-name-error" : undefined}
          className={inputClass}
        />
        {err("name") && (
          <p id="profile-name-error" role="alert" className="mt-1 text-sm text-red-600">
            {err("name")}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="profile-bio" className="block text-sm font-semibold">
          Short bio (optional)
        </label>
        <textarea
          id="profile-bio"
          name="bio"
          defaultValue={bio}
          rows={3}
          maxLength={200}
          aria-invalid={err("bio") ? true : undefined}
          aria-describedby={err("bio") ? "profile-bio-error" : undefined}
          className={inputClass}
        />
        {err("bio") && (
          <p id="profile-bio-error" role="alert" className="mt-1 text-sm text-red-600">
            {err("bio")}
          </p>
        )}
      </div>
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
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
