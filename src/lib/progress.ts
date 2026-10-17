import type { FormState } from "@/lib/validations";

/** Result of logging a study session. `saved` changes each time one is stored. */
export type LogState = FormState & { saved?: number };

/** Monday 00:00 UTC of the week that contains `now`. */
export function startOfWeekUTC(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  return day;
}

/** "2026-10-16" style key for grouping sessions by day (UTC). */
export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** 135 -> "2h 15m", 45 -> "45m", 0 -> "0m" */
export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
