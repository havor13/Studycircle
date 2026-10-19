"use client";

import { useEffect } from "react";

/**
 * Shown instead of a raw crash when something fails on the server, for example when the database
 * cannot be reached for a moment. It never shows the technical message to visitors.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong on our side</h1>
      <p className="mt-3 text-muted">
        This is usually a short connection problem and fixes itself within a minute. Your work is not lost.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
      >
        Try again
      </button>
      {error.digest && <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p>}
    </main>
  );
}
