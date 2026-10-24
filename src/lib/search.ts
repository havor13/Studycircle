export const MIN_QUERY = 2;
export const MAX_QUERY = 100;

/** Cleans what was typed in the search box. */
export function cleanQuery(raw: unknown) {
  return (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
}

/** A short piece of text around the first match, so a result shows why it matched. */
export function excerpt(text: string, query: string, radius = 70) {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + query.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

/** Splits an excerpt into plain and matching parts, for highlighting. */
export function splitMatch(text: string, query: string) {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return { before: text, match: "", after: "" };
  return { before: text.slice(0, at), match: text.slice(at, at + query.length), after: text.slice(at + query.length) };
}
