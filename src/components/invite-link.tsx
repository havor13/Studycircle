"use client";

import { useRef, useState } from "react";

/** The full invite link in one selectable box, with a Copy button. */
export function InviteLink({ url }: { url: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // Clipboard blocked: select the link so Ctrl+C works.
      inputRef.current?.select();
      setStatus("manual");
    }
  }

  return (
    <div className="mt-2">
      <label htmlFor="invite-url" className="sr-only">
        Invite link
      </label>
      <div className="flex gap-2">
        <input
          id="invite-url"
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          {status === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      <p aria-live="polite" className="mt-1 text-xs text-muted">
        {status === "manual" ? "Could not copy automatically. The link is selected: press Ctrl+C." : ""}
      </p>
    </div>
  );
}
