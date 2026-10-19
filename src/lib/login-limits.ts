/** Settings for slowing down password guessing. No database here, so it is easy to read and test. */

export const LOGIN_WINDOW_MINUTES = 15;
export const MAX_FAILED_PER_EMAIL = 5; // wrong passwords for one account inside the window
export const MAX_FAILED_PER_IP = 20; // wrong passwords from one network inside the window

export function windowStart(now = Date.now()) {
  return new Date(now - LOGIN_WINDOW_MINUTES * 60_000);
}

/** The first address in x-forwarded-for is the visitor (Vercel sets this header itself). */
export function clientIp(forwardedFor: string | null | undefined) {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first.slice(0, 64) : null;
}
