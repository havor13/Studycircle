"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_ACCEPT, MAX_AVATAR_BYTES } from "@/lib/avatar";

export function AvatarForm({ hasPicture }: { hasPicture: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(request: () => Promise<Response>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await request();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Something went wrong. Try again." });
      } else {
        setMessage({ ok: true, text: success });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Could not reach the server. Check your connection." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setMessage({ ok: false, text: "That picture is too large. The limit is 2 MB." });
      e.target.value = "";
      return;
    }
    const body = new FormData();
    body.append("file", file);
    void send(() => fetch("/api/account/avatar", { method: "POST", body }), "Picture updated.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy ? "Working…" : hasPicture ? "Change picture" : "Upload picture"}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={onPick}
            disabled={busy}
            className="sr-only"
          />
        </label>
        {hasPicture && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(() => fetch("/api/account/avatar", { method: "DELETE" }), "Picture removed.")}
            className="text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">PNG, JPG or WebP, up to 2 MB. Square pictures look best.</p>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-2 text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
