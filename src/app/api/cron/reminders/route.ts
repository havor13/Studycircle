import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";

// Vercel calls this once a day (see vercel.json). It must never be public,
// so it only answers a request that carries the CRON_SECRET.
export const dynamic = "force-dynamic";

const WINDOW_HOURS = 30; // a little over a day, so no session slips between two runs

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_HOURS * 3_600_000);

  const events = await db.studyEvent.findMany({
    where: { reminderSentAt: null, startsAt: { gt: now, lte: until } },
    select: {
      id: true,
      title: true,
      groupId: true,
      startsAt: true,
      location: true,
      group: { select: { slug: true, name: true } },
      rsvps: { select: { userId: true } },
    },
    take: 200,
  });

  let reminded = 0;
  for (const event of events) {
    // Claim the event first: if Vercel delivers the same run twice, only one wins.
    const claimed = await db.studyEvent.updateMany({
      where: { id: event.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;
    if (event.rsvps.length === 0) continue;

    const when = event.startsAt.toLocaleString("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    await notify(
      event.rsvps.map((rsvp) => ({
        userId: rsvp.userId,
        groupId: event.groupId,
        kind: "EVENT_REMINDER" as const,
        message: `Reminder: "${event.title}" in ${event.group.name} starts ${when} UTC${event.location ? ` at ${event.location}` : ""}`,
        link: `/groups/${event.group.slug}`,
      })),
    );
    reminded += event.rsvps.length;
  }

  return Response.json({ events: events.length, reminded });
}
