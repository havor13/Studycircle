import { createHash, randomBytes } from "node:crypto";

/** Pure helpers for "forgot password". No database, no mail. */

export const RESET_LINK_MINUTES = 15;
export const MAX_RESET_REQUESTS_PER_HOUR = 3; // per account, so nobody can flood an inbox

/** A long random secret for the link. Only its hash is ever stored. */
export function newResetToken() {
  return randomBytes(32).toString("hex"); // 64 hex characters
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeResetToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}