"use client";

import { useActionState, useEffect, useState } from "react";
import { logSession } from "@/app/actions/sessions";

function clock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-brand";

export function SessionLogger({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(logSession.bind(null, groupId), {});

  const storageKey = `studycircle-timer-${groupId}`;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [minutes, setMinutes] = useState("");

  // Pick the timer back up if the page was refreshed while it was running.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved > 0) {
        setStartedAt(saved);
        setNow(Date.now());
      }
    } catch {
      /* storage unavailable: the timer simply won't survive a refresh */
    }
  }, [storageKey]);

  // Tick once a second while the timer runs.
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Clear the minutes box after a session is saved.
  useEffect(() => {
    if (state.saved) setMinutes("");
  }, [state.saved]);

  function start() {
    const t = Date.now();
    try {
      localStorage.setItem(storageKey, String(t));
    } catch {
      /* ignore */
    }
    setStartedAt(t);
    setNow(t);
  }

  function stop() {
    if (startedAt === null) return;
    const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    setMinutes(String(mins));
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setStartedAt(null);
  }

  const running = startedAt !== null;
  const elapsed = running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-xl font-bold">Log study time</h2>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-line px-4 py-3">
        <span className="font-display text-3xl font-bold tabular-nums" aria-live="off">
          {clock(elapsed)}
        </span>
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-brand"
          >
            Stop timer
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Start timer
          </button>
        )}
        <p className="text-sm text-muted">
          {running ? "Stop it, then save the session below." : "Or just type your minutes below."}
        </p>
      </div>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end" noValidate>
        <div>
          <label htmlFor="topic" className="block text-sm font-semibold">Topic (optional)</label>
          <input id="topic" name="topic" placeholder="e.g. Chapter 4 practice problems" className={inputClass} />
        </div>
        <div>
          <label htmlFor="minutes" className="block text-sm font-semibold">Minutes</label>
          <input
            id="minutes"
            name="minutes"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save session"}
        </button>
        {state.fieldErrors?.minutes && (
          <p className="text-sm text-red-600 sm:col-span-3">{state.fieldErrors.minutes[0]}</p>
        )}
      </form>
    </div>
  );
}
