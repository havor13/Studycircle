"use client";

import { useActionState } from "react";
import { reportComment, reportMessage, reportPost, type ReportState } from "@/app/actions/reports";

/** "Report" for someone else's post or chat message. Opens a small box asking what is wrong. */
export function ReportButton({ kind, id }: { kind: "post" | "message" | "comment"; id: string }) {
  const action = kind === "post" ? reportPost : kind === "comment" ? reportComment : reportMessage;
  const [state, formAction, pending] = useActionState<ReportState, FormData>(action.bind(null, id), {});
  const errorId = `report-${id}-error`;

  if (state.done) {
    return (
      <span role="status" className="text-xs text-muted">
        Reported. Thank you.
      </span>
    );
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted hover:text-red-600">Report</summary>
      <form action={formAction} className="mt-2 w-64 max-w-full space-y-2 rounded-lg border border-line bg-surface p-3 text-foreground">
        <label htmlFor={`report-${id}`} className="block font-semibold">
          What is wrong with this {kind}?
        </label>
        <textarea
          id={`report-${id}`}
          name="reason"
          rows={3}
          maxLength={500}
          aria-invalid={state.fieldErrors?.reason ? true : undefined}
          aria-describedby={state.fieldErrors?.reason || state.error ? errorId : undefined}
          className="w-full resize-none rounded-lg border border-line bg-transparent px-2 py-1.5 outline-none focus:border-brand"
        />
        {(state.fieldErrors?.reason || state.error) && (
          <p id={errorId} role="alert" className="text-red-600">
            {state.fieldErrors?.reason?.[0] ?? state.error}
          </p>
        )}
        <p className="text-muted">Only the circle&rsquo;s owner, admins and moderators see this.</p>
        <button disabled={pending} className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
