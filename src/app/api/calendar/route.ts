import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildCalendar } from "@/lib/ics";
import { appUrl } from "@/lib/mailer";

export const runtime = "nodejs";

/** Upcoming study sessions from every circle you are in, as one calendar file. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });

  const events = await db.studyEvent.findMany({
    where: {
      startsAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      group: { memberships: { some: { userId: session.user.id } } },
    },
    select: {
      id: true, title: true, startsAt: true, durationMinutes: true, location: true, notes: true,
      group: { select: { name: true, slug: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  const base = appUrl();
  const body = buildCalendar(
    events.map((e) => ({ ...e, circle: e.group.name, url: `${base}/groups/${e.group.slug}` })),
    "StudyCircle study sessions",
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="studycircle-sessions.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
