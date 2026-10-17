/** Shared rules for uploaded files. Used by the upload route, the download route and the form. */

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel's server upload limit is about 4.5 MB

// Allowed by extension. The content type we store and serve comes from THIS list,
// never from what the browser claims, so nobody can upload a page that runs scripts.
export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Shown in the browser's file picker. */
export const FILE_ACCEPT = Object.keys(FILE_TYPES).map((ext) => `.${ext}`).join(",");

/** These open inside the browser; everything else downloads. */
export const INLINE_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "gif", "txt"]);

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Keeps letters, numbers, dots, dashes and underscores so the stored path is always safe. */
export function safeFileName(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "file").slice(-80);
}

export function parseTags(raw: string | null | undefined) {
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase().slice(0, 20))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 5);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
