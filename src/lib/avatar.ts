/** Shared rules for profile pictures. Safe to import from server and client code. */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

// Allowed by extension; the type we store and serve comes from here, never from the browser.
export const AVATAR_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const AVATAR_ACCEPT = ".png,.jpg,.jpeg,.webp";

/** Checks the first bytes of the file really are the image type the extension claims. */
export function matchesImageSignature(ext: string, b: Uint8Array) {
  if (ext === "png") {
    return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  }
  if (ext === "jpg" || ext === "jpeg") {
    return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  }
  if (ext === "webp") {
    // "RIFF" .... "WEBP"
    return (
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    );
  }
  return false;
}

/** URL of a user's picture. The ?v= part changes when the picture changes, so browsers refetch it. */
export function avatarSrc(userId: string, image: string) {
  return `/api/avatars/${userId}?v=${encodeURIComponent(image.slice(-12))}`;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
