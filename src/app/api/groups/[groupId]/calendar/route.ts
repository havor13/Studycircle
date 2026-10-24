import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildCalendar } from "@/lib/ics";
import { appUrl } from "@/lib/mailer";

export const runtime = "nodejs";

/** All upcoming study sessions of a circle as one calendar file. Members only. */
export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
    select: { group: { select: { name: true, slug: true } } },
  });
  if (!membership) return new NextResponse("Not found", { status: 404 });

  const events = await db.studyEvent.findMany({
    where: { groupId, startsAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    select: { id: true, title: true, startsAt: true, durationMinutes: true, location: true, notes: true },
    orderBy: { startsAt: "asc" },
    take: 100,
  });

  const url = `${appUrl()}/groups/${membership.group.slug}`;
  const body = buildCalendar(
    events.map((e) => ({ ...e, circle: membership.group.name, url })),
    `${membership.group.name} study sessions`,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${membership.group.slug}-study-sessions.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
