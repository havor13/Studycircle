"use client";

import { useActionState } from "react";
import { resetInviteCode, updateGroup, type GroupSettingsState } from "@/app/actions/group-settings";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand";

export function GroupSettingsForm({
  groupId,
  name,
  subject,
  description,
}: {
  groupId: string;
  name: string;
  subject: string;
  description: string;
}) {
  const [state, action, pending] = useActionState<GroupSettingsState, FormData>(updateGroup.bind(null, groupId), {});
  const err = (field: string) => state.fieldErrors?.[field]?.[0];
  const describe = (field: string) => ({
    "aria-invalid": err(field) ? (true as const) : undefined,
    "aria-describedby": err(field) ? `${field}-error` : undefined,
  });

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold">
          Circle name
        </label>
        <input id="name" name="name" defaultValue={name} maxLength={60} className={inputClass} {...describe("name")} />
        {err("name") && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            {err("name")}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold">
          Subject (optional)
        </label>
        <input id="subject" name="subject" defaultValue={subject} maxLength={60} className={inputClass} {...describe("subject")} />
        {err("subject") && (
          <p id="subject-error" role="alert" className="mt-1 text-sm text-red-600">
            {err("subject")}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-semibold">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={description}
          rows={4}
          maxLength={500}
          className={inputClass}
          {...describe("description")}
        />
        {err("description") && (
          <p id="description-error" role="alert" className="mt-1 text-sm text-red-600">
            {err("description")}
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function ResetInviteForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<GroupSettingsState, FormData>(
    () => resetInviteCode(groupId),
    {},
  );
  return (
    <form action={action} className="mt-3 space-y-2 text-sm">
      <p>
        This makes a new invite link. The old link and code stop working for everyone straight away. Members stay in
        the circle.
      </p>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="font-semibold text-brand">
          Done. The circle page now shows the new link.
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg border border-red-600 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-60"
      >
        {pending ? "Working…" : "Make a new invite link"}
      </button>
    </form>
  );
}
