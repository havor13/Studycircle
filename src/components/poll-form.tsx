"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPoll, type PollFormState } from "@/app/actions/polls";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand";

export function PollForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<PollFormState, FormData>(createPoll.bind(null, groupId), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3" noValidate>
      <div>
        <label htmlFor="poll-question" className="block text-xs font-semibold">Question</label>
        <input id="poll-question" name="question" maxLength={150} placeholder="e.g. Which day for the review?" className={inputClass} />
        {state.fieldErrors?.question && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.question[0]}</p>}
      </div>

      <fieldset>
        <legend className="block text-xs font-semibold">Choices (2 to 6)</legend>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n}>
            <label htmlFor={`poll-option-${n}`} className="sr-only">Choice {n}</label>
            <input
              id={`poll-option-${n}`}
              name="option"
              maxLength={80}
              placeholder={n <= 2 ? `Choice ${n}` : `Choice ${n} (optional)`}
              className={inputClass}
            />
          </div>
        ))}
        {state.fieldErrors?.options && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.options[0]}</p>}
      </fieldset>

      {state.error && <p role="alert" className="text-xs text-red-600">{state.error}</p>}
      {state.done && <p role="status" className="text-xs text-green-700">Poll started.</p>}

      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start poll"}
      </button>
    </form>
  );
}
