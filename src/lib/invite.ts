/**
 * Pulls the invite code out of whatever the person pasted: a full link,
 * just the code, or even a link followed by stray text.
 * Returns "" when nothing in it looks like an invite code.
 */
export function cleanInviteCode(input: string) {
  let value = input;
  try {
    value = decodeURIComponent(input);
  } catch {
    /* not percent-encoded: use it as typed */
  }
  value = value.trim();

  // "http://site/join/CODE" -> "CODE". lastIndexOf, because a copy that
  // included extra text may contain the link more than once.
  const marker = "/join/";
  const at = value.toLowerCase().lastIndexOf(marker);
  if (at !== -1) value = value.slice(at + marker.length);

  // Stop at the first space, slash, question mark or hash.
  const code = value.split(/[\s/?#]/)[0] ?? "";

  return /^[A-Za-z0-9_-]{8,64}$/.test(code) ? code : "";
}
