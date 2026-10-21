import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteDirectMessage } from "@/app/actions/direct";
import { Avatar } from "@/components/avatar";
import { DirectForm } from "@/components/direct-form";
import { LiveRefresh } from "@/components/live-refresh";
import { LocalTime } from "@/components/local-time";
import { ScrollBox } from "@/components/scroll-box";
import { db } from "@/lib/db";
import { sharesCircle } from "@/lib/direct";

export const metadata: Metadata = { title: "Private chat" };

export default async function DirectChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  const { userId: otherId } = await params;
  if (otherId === me) redirect("/messages");

  const other = await db.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, image: true } });
  if (!other) notFound();

  const pairWhere = {
    OR: [
      { senderId: me, recipientId: otherId },
      { senderId: otherId, recipientId: me },
    ],
  };
  const [canSend, history] = await Promise.all([
    sharesCircle(me, otherId),
    db.directMessage.count({ where: pairWhere }),
  ]);
  // Strangers get a 404; an old conversation stays readable even after you stop sharing a circle.
  if (!canSend && history === 0) notFound();

  const recent = await db.directMessage.findMany({
    where: pairWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const messages = recent.reverse();

  // Opening the conversation marks their messages as read.
  await db.directMessage.updateMany({
    where: { senderId: otherId, recipientId: me, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <LiveRefresh userId={me} />
      <Link href="/messages" className="text-sm font-semibold text-brand hover:underline">
        ← All private messages
      </Link>
      <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold">
        <Avatar userId={other.id} name={other.name} image={other.image} size={36} />
        {other.name}
      </h1>
      <p className="mb-4 mt-1 text-sm text-muted">Private: only you and {other.name} can read this. Showing the latest 100.</p>

      <ScrollBox count={messages.length}>
        {messages.length === 0 ? (
          <p className="py-10 text-center text-muted">No messages yet. Say hello.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.senderId === me;
              return (
                <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "bg-brand text-white" : "border border-line"}`}>
                    <div className={`text-xs ${mine ? "text-white/80" : "text-muted"}`}>
                      <span className="font-semibold">{mine ? "You" : other.name}</span>
                      <span className="mx-1">·</span>
                      <LocalTime iso={m.createdAt.toISOString()} />
                      {mine && m.readAt && <span className="ml-1">· Seen</span>}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                    {mine && (
                      <form action={deleteDirectMessage.bind(null, m.id)} className="mt-1">
                        <button className="text-xs font-semibold text-white/80 hover:text-white">Delete</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollBox>

      {canSend ? (
        <DirectForm otherId={other.id} />
      ) : (
        <p className="mt-3 text-sm text-muted">
          You no longer share a circle with {other.name}, so you cannot send new messages.
        </p>
      )}
    </div>
  );
}
