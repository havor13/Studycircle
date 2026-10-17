"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FILE_ACCEPT, MAX_FILE_BYTES } from "@/lib/files";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand";

export function FileUploadForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is too large. The limit is 4 MB.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/files`, { method: "POST", body: data });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The upload failed. Please try again.");
        return;
      }
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
      <div>
        <label htmlFor="file-input" className="block text-xs font-semibold">
          File (PDF, image, text, Word, PowerPoint or Excel, up to 4 MB)
        </label>
        <input
          id="file-input"
          name="file"
          type="file"
          accept={FILE_ACCEPT}
          className="mt-1 block w-full text-sm"
        />
      </div>
      <div>
        <label htmlFor="file-title" className="block text-xs font-semibold">
          Title (optional, defaults to the file name)
        </label>
        <input id="file-title" name="title" placeholder="e.g. Week 3 notes" className={inputClass} />
      </div>
      <div>
        <label htmlFor="file-tags" className="block text-xs font-semibold">
          Tags (optional, comma separated)
        </label>
        <input id="file-tags" name="tags" placeholder="notes, week 3" className={inputClass} />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload file"}
      </button>
    </form>
  );
}
