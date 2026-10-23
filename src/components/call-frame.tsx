"use client";

import { useActionState } from "react";
import type { AnnounceState } from "@/app/actions/calls";

/** The call itself (Daily's ready-made call screen). Asks the browser for camera and microphone. */
export function CallFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className="h-[70vh] w-full rounded-2xl border border-line bg-surface"
    />
  );
}

/** Jitsi mode: the call opens in its own tab. */
export function CallLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
      >
        {label}
      </a>
      <p className="mt-4 text-sm text-muted">
        The call opens in a new tab on Jitsi. The first person to open it may be asked to sign in with Google or GitHub to
        start the room (a Jitsi rule); everyone else just joins. Allow the camera and microphone when your browser asks.
        Anyone who is given this link can join, so share it only with the people you want.
      </p>
    </div>
  );
}

/** "Tell them" button: posts a message in the chat saying a call has started. */
export function AnnounceCallButton({ action, label }: { action: () => Promise<AnnounceState>; label: string }) {
  const [state, formAction, pending] = useActionState<AnnounceState, FormData>(() => action(), {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 text-sm">
      <button
        disabled={pending || state.done}
        className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-brand disabled:opacity-60"
      >
        {pending ? "Sending…" : label}
      </button>
      {state.done && (
        <span role="status" className="text-muted">
          Sent. They will see it in the chat.
        </span>
      )}
      {state.error && (
        <span role="alert" className="text-red-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
