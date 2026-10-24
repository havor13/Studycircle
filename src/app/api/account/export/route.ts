import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const LIMIT = 10000; // per kind of data, so one account can never produce an enormous file

/** Downloads everything the logged-in person has on StudyCircle as one JSON file. Only their own data. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });
  const userId = session.user.id;

  const [
    user,
    memberships,
    posts,
    comments,
    chat,
    privateMessages,
    resources,
    studyTime,
    events,
    rsvps,
    reactionsGiven,
    reports,
    blocks,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        bio: true,
        image: true,
        createdAt: true,
        emailNotifications: true,
        emailOff: true,
        emailDirectMessages: true,
      },
    }),
    db.membership.findMany({
      where: { userId },
      select: { role: true, joinedAt: true, group: { select: { name: true } } },
      take: LIMIT,
    }),
    db.post.findMany({
      where: { authorId: userId },
      select: { body: true, pinned: true, createdAt: true, editedAt: true, group: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
    }),
    db.comment.findMany({
      where: { authorId: userId },
      select: { body: true, createdAt: true, editedAt: true, post: { select: { body: true, group: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
    }),
    db.message.findMany({
      where: { authorId: userId },
      select: { body: true, attachmentName: true, createdAt: true, group: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
    }),
    db.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      select: {
        senderId: true,
        body: true,
        attachmentName: true,
        createdAt: true,
        readAt: true,
        sender: { select: { name: true } },
        recipient: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
    }),
    db.resource.findMany({
      where: { uploaderId: userId },
      select: { title: true, kind: true, url: true, sizeBytes: true, tags: true, createdAt: true, group: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
    }),
    db.studySession.findMany({
      where: { userId },
      select: { topic: true, minutes: true, startedAt: true, group: { select: { name: true } } },
      orderBy: { startedAt: "asc" },
      take: LIMIT,
    }),
    db.studyEvent.findMany({
      where: { creatorId: userId },
      select: { title: true, startsAt: true, durationMinutes: true, location: true, notes: true, group: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: LIMIT,
    }),
    db.eventRsvp.findMany({
      where: { userId },
      select: { createdAt: true, event: { select: { title: true, startsAt: true, group: { select: { name: true } } } } },
      take: LIMIT,
    }),
    db.reaction.count({ where: { userId } }),
    db.contentReport.findMany({
      where: { reporterId: userId },
      select: { reason: true, status: true, createdAt: true, group: { select: { name: true } } },
      take: LIMIT,
    }),
    db.userBlock.findMany({
      where: { blockerId: userId },
      select: { createdAt: true, blocked: { select: { name: true } } },
      take: LIMIT,
    }),
  ]);
  if (!user) return new NextResponse("Not found", { status: 404 });

  const data = {
    exportedAt: new Date().toISOString(),
    about:
      "Everything StudyCircle holds that you created or took part in. Your password is never included. " +
      "Private messages include both sides of your conversations. Uploaded files and profile pictures are not " +
      "included here (their names are listed).",
    account: {
      name: user.name,
      email: user.email,
      bio: user.bio,
      hasProfilePicture: Boolean(user.image),
      joined: user.createdAt,
      emailNotifications: user.emailNotifications,
      emailKindsTurnedOff: user.emailOff,
      emailAboutPrivateMessages: user.emailDirectMessages,
    },
    circles: memberships.map((m) => ({ circle: m.group.name, role: m.role, joined: m.joinedAt })),
    posts: posts.map((p) => ({ circle: p.group.name, text: p.body, pinned: p.pinned, written: p.createdAt, edited: p.editedAt })),
    comments: comments.map((c) => ({
      circle: c.post.group.name,
      onPostStartingWith: c.post.body.slice(0, 80),
      text: c.body,
      written: c.createdAt,
      edited: c.editedAt,
    })),
    circleChatMessages: chat.map((m) => ({ circle: m.group.name, text: m.body, file: m.attachmentName, sent: m.createdAt })),
    privateMessages: privateMessages.map((m) => ({
      direction: m.senderId === userId ? "sent" : "received",
      from: m.sender.name,
      to: m.recipient.name,
      text: m.body,
      file: m.attachmentName,
      sent: m.createdAt,
      readByRecipient: m.readAt,
    })),
    resourcesYouAdded: resources.map((r) => ({
      circle: r.group.name,
      title: r.title,
      type: r.kind,
      link: r.kind === "LINK" ? r.url : undefined,
      sizeBytes: r.sizeBytes,
      tags: r.tags,
      added: r.createdAt,
    })),
    studyTimeLogged: studyTime.map((s) => ({ circle: s.group.name, topic: s.topic, minutes: s.minutes, started: s.startedAt })),
    studySessionsYouScheduled: events.map((e) => ({
      circle: e.group.name,
      title: e.title,
      starts: e.startsAt,
      minutes: e.durationMinutes,
      location: e.location,
      notes: e.notes,
    })),
    studySessionsYouJoined: rsvps.map((r) => ({ circle: r.event.group.name, title: r.event.title, starts: r.event.startsAt, joined: r.createdAt })),
    reactionsGiven,
    reportsYouSent: reports.map((r) => ({ circle: r.group.name, reason: r.reason, status: r.status, sent: r.createdAt })),
    peopleYouBlocked: blocks.map((b) => ({ name: b.blocked.name, since: b.createdAt })),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="studycircle-my-data-${stamp}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
