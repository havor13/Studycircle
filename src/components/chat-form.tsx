"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/actions/messages";
import { FILE_ACCEPT, MAX_FILE_BYTES, formatBytes } from "@/lib/files";

export function ChatForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setError("");

    if (file && file.size > MAX_FILE_BYTES) {
      setError(`That file is too large (${formatBytes(file.size)}). The limit is 4 MB.`);
      return;
    }

    setPending(true);
    try {
      if (file) {
        const res = await fetch(`/api/groups/${groupId}/chat-files`, { method: "POST", body: data });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "The file could not be sent.");
          return;
        }
      } else {
        const result = await sendMessage(groupId, {}, data);
        if (result.fieldErrors?.body) {
          setError(result.fieldErrors.body[0]);
          return;
        }
      }
      form.reset();
      clearFile();
      router.refresh();
    } catch {
      setError("Could not send. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-3">
      <label htmlFor="chat-body" className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="chat-body"
          name="body"
          rows={2}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
        />
        <label
          htmlFor="chat-file"
          title="Attach an image or document"
          className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 hover:border-brand"
        >
          <span aria-hidden>📎</span>
          <span className="sr-only">Attach an image or document</span>
        </label>
        <input
          id="chat-file"
          ref={fileRef}
          name="file"
          type="file"
          accept={FILE_ACCEPT}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {file && (
        <p className="mt-1 text-sm text-muted">
          Attached: {file.name} ({formatBytes(file.size)}){" "}
          <button type="button" onClick={clearFile} className="font-semibold underline">
            Remove
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
