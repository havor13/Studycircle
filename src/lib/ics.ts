/** Builds calendar files (.ics) that Google Calendar, Apple Calendar and Outlook can open. Pure functions: no database. */

export type IcsEvent = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  notes?: string | null;
  circle: string;
  url: string;
};

/** Text values: backslash, semicolon, comma and line breaks must be escaped. */
export function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes are split; continuation lines start with one space. */
export function fold(line: string) {
  const bytes = (s: string) => Buffer.byteLength(s, "utf8");
  if (bytes(line) <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines lose one byte to the leading space
    if (bytes(current + ch) > limit) {
      out.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildCalendar(events: IcsEvent[], name: string) {
  const now = stamp(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyCircle//Study sessions//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(name)}`];

  for (const e of events) {
    const end = new Date(e.startsAt.getTime() + e.durationMinutes * 60_000);
    const description = [e.notes?.trim(), `Circle: ${e.circle}`, `Open it: ${e.url}`].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@studycircle`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      ...(e.location?.trim() ? [`LOCATION:${icsEscape(e.location.trim())}`] : []),
      `DESCRIPTION:${icsEscape(description)}`,
      `URL:${e.url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(e.title)}`,
      "TRIGGER:-PT30M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A file name that is safe in a download header. */
export function icsFileName(title: string) {
  const base = title.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
  return `${base || "study-session"}.ics`;
}
