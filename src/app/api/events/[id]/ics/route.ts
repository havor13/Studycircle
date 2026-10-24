import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildCalendar, icsFileName } from "@/lib/ics";
import { appUrl } from "@/lib/mailer";

export const runtime = "nodejs";

/** One study session as a calendar file. Only members of the circle can download it. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });

  const event = await db.studyEvent.findUnique({
    where: { id },
    select: { id: true, title: true, startsAt: true, durationMinutes: true, location: true, notes: true, groupId: true, group: { select: { name: true, slug: true } } },
  });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: event.groupId } },
    select: { id: true },
  });
  if (!membership) return new NextResponse("Not found", { status: 404 });

  const body = buildCalendar(
    [{ ...event, circle: event.group.name, url: `${appUrl()}/groups/${event.group.slug}` }],
    event.group.name,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(event.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
