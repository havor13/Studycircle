"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEvent, type EventFormState } from "@/app/actions/events";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand";

export function EventForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    createEvent.bind(null, groupId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [local, setLocal] = useState("");
  const [weeks, setWeeks] = useState("1");

  // The picker gives a time in the viewer's own zone. Convert it to UTC before sending.
  const date = local ? new Date(local) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";

  // Same clock time each week in the viewer's zone, even across a daylight saving change.
  const repeatStarts: string[] = [];
  if (date && !Number.isNaN(date.getTime())) {
    for (let i = 1; i < Number(weeks); i++) {
      const next = new Date(date);
      next.setDate(next.getDate() + 7 * i);
      repeatStarts.push(next.toISOString());
    }
  }

  useEffect(() => {
    if (state.done) {
      formRef.current?.reset();
      setLocal("");
      setWeeks("1");
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3" noValidate>
      <input type="hidden" name="startsAt" value={iso} />
      <input type="hidden" name="repeatStarts" value={repeatStarts.join(",")} />

      <div>
        <label htmlFor="ev-title" className="block text-xs font-semibold">Title</label>
        <input id="ev-title" name="title" placeholder="e.g. Midterm review" className={inputClass} />
        {state.fieldErrors?.title && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title[0]}</p>}
      </div>

      <div>
        <label htmlFor="ev-when" className="block text-xs font-semibold">When (your time)</label>
        <input
          id="ev-when"
          type="datetime-local"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className={inputClass}
        />
        {state.fieldErrors?.startsAt && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startsAt[0]}</p>}
      </div>

      <div>
        <label htmlFor="ev-length" className="block text-xs font-semibold">Length</label>
        <select id="ev-length" name="durationMinutes" defaultValue="60" className={inputClass}>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
        </select>
      </div>

      <div>
        <label htmlFor="ev-repeat" className="block text-xs font-semibold">Repeat</label>
        <select id="ev-repeat" value={weeks} onChange={(e) => setWeeks(e.target.value)} className={inputClass}>
          <option value="1">Does not repeat</option>
          <option value="4">Weekly for 4 weeks</option>
          <option value="8">Weekly for 8 weeks</option>
          <option value="12">Weekly for 12 weeks</option>
        </select>
      </div>

      <div>
        <label htmlFor="ev-where" className="block text-xs font-semibold">Where (optional)</label>
        <input id="ev-where" name="location" placeholder="Library room 2, or a meeting link" className={inputClass} />
        {state.fieldErrors?.location && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.location[0]}</p>}
      </div>

      <div>
        <label htmlFor="ev-notes" className="block text-xs font-semibold">Notes (optional)</label>
        <textarea id="ev-notes" name="notes" rows={2} placeholder="What will you cover?" className={inputClass} />
        {state.fieldErrors?.notes && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.notes[0]}</p>}
      </div>

      {state.error && <p role="alert" className="text-xs text-red-600">{state.error}</p>}
      {state.done && <p role="status" className="text-xs text-green-700">Done. Everyone has been told.</p>}

      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Planning…" : "Plan session"}
      </button>
    </form>
  );
}
