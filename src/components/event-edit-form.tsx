"use client";

import { useActionState, useEffect, useState } from "react";
import { updateEvent, type EventFormState } from "@/app/actions/events";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand";

/** An ISO time (UTC) as the value a datetime-local picker wants, in the viewer's own time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditForm({
  eventId,
  title,
  startsAtIso,
  durationMinutes,
  location,
  notes,
}: {
  eventId: string;
  title: string;
  startsAtIso: string;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(updateEvent.bind(null, eventId), {});
  // Filled in after the page loads, because the server does not know the viewer's time zone.
  const [local, setLocal] = useState("");
  useEffect(() => setLocal(toLocalInput(startsAtIso)), [startsAtIso]);

  const date = local ? new Date(local) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";

  return (
    <form action={action} className="mt-2 space-y-2" noValidate>
      <input type="hidden" name="startsAt" value={iso} />
      <div>
        <label htmlFor={`et-${eventId}`} className="block text-xs font-semibold">Title</label>
        <input id={`et-${eventId}`} name="title" defaultValue={title} className={inputClass} />
        {state.fieldErrors?.title && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title[0]}</p>}
      </div>
      <div>
        <label htmlFor={`ew-${eventId}`} className="block text-xs font-semibold">When (your time)</label>
        <input
          id={`ew-${eventId}`}
          type="datetime-local"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className={inputClass}
        />
        {state.fieldErrors?.startsAt && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startsAt[0]}</p>}
      </div>
      <div>
        <label htmlFor={`el-${eventId}`} className="block text-xs font-semibold">Length</label>
        <select id={`el-${eventId}`} name="durationMinutes" defaultValue={String(durationMinutes)} className={inputClass}>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
        </select>
      </div>
      <div>
        <label htmlFor={`ep-${eventId}`} className="block text-xs font-semibold">Where (optional)</label>
        <input id={`ep-${eventId}`} name="location" defaultValue={location ?? ""} className={inputClass} />
        {state.fieldErrors?.location && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.location[0]}</p>}
      </div>
      <div>
        <label htmlFor={`en-${eventId}`} className="block text-xs font-semibold">Notes (optional)</label>
        <textarea id={`en-${eventId}`} name="notes" rows={2} defaultValue={notes ?? ""} className={inputClass} />
        {state.fieldErrors?.notes && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.notes[0]}</p>}
      </div>
      {state.error && <p role="alert" className="text-xs text-red-600">{state.error}</p>}
      {state.done && <p role="status" className="text-xs text-green-700">Saved. People who are going were told.</p>}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
