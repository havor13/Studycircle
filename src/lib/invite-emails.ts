/** Pure helpers for the "email an invite" form. No database, no mail: easy to test. */

export const MAX_INVITES_PER_SEND = 5;
export const MAX_INVITES_PER_DAY = 20; // per circle and per person, across 24 hours
export const REINVITE_DAYS = 7;

const EMAIL = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']{2,}$/;

export type ParsedEmails = {
  valid: string[];
  invalid: string[];
  tooMany: boolean;
};

/** Accepts addresses separated by commas, semicolons, spaces or new lines. */
export function parseEmailList(raw: string): ParsedEmails {
  const parts = raw
    .slice(0, 2000)
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(parts)];
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of unique) {
    if (part.length <= 254 && EMAIL.test(part)) valid.push(part);
    else invalid.push(part.slice(0, 60));
  }
  return { valid: valid.slice(0, MAX_INVITES_PER_SEND), invalid, tooMany: valid.length > MAX_INVITES_PER_SEND };
}
