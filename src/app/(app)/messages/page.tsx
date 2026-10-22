import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { LiveRefresh } from "@/components/live-refresh";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Private messages" };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  // Newest messages first; the first one seen for each person is that conversation's latest.
  const recent = await db.directMessage.findMany({
    where: { OR: [{ senderId: me }, { recipientId: me }] },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { senderId: true, recipientId: true, body: true, attachmentName: true, createdAt: true },
  });
  const latest = new Map<string, (typeof recent)[number]>();
  for (const m of recent) {
    const other = m.senderId === me ? m.recipientId : m.senderId;
    if (!latest.has(other)) latest.set(other, m);
  }
  const ids = [...latest.keys()];

  const [people, unreadRows] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, image: true } }),
    db.directMessage.groupBy({
      by: ["senderId"],
      where: { recipientId: me, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const unread = new Map(unreadRows.map((r) => [r.senderId, r._count._all]));

  return (
    <div className="mx-auto max-w-2xl">
      <LiveRefresh userId={me} />
      <h1 className="font-display text-3xl font-bold">Private messages</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        Only you and the other person can read these. To start one, open a circle and press &ldquo;Message&rdquo;
        next to a member&rsquo;s name.
      </p>

      {ids.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          No private messages yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {ids.map((id) => {
            const person = byId.get(id);
            const last = latest.get(id)!;
            if (!person) return null;
            const count = unread.get(id) ?? 0;
            return (
              <li key={id}>
                <Link
                  href={`/messages/${id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand"
                >
                  <Avatar userId={person.id} name={person.name} image={person.image} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{person.name}</span>
                      <span className="text-xs text-muted">
                        <LocalTime iso={last.createdAt.toISOString()} />
                      </span>
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {last.senderId === me ? "You: " : ""}
                      {last.body || `📎 ${last.attachmentName ?? "Attachment"}`}
                    </span>
                  </span>
                  {count > 0 && (
                    <span
                      aria-label={`${count} unread`}
                      className="min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold text-white"
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
