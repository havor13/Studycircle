import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteMessage } from "@/app/actions/messages";
import { toggleMessageReaction } from "@/app/actions/reactions";
import { ChatForm } from "@/components/chat-form";
import { ChatLog } from "@/components/chat-log";
import { LocalTime } from "@/components/local-time";
import { canModerate } from "@/lib/permissions";
import { REACTION_EMOJIS } from "@/lib/reactions";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { slug } = await params;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (!membership) notFound(); // only members can read or send

  // Newest 100, then flip so the oldest of those is at the top.
  const recent = await db.message.findMany({
    where: { groupId: group.id },
    include: {
      author: { select: { name: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const messages = recent.reverse();
  const moderator = canModerate(membership.role);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/groups/${group.slug}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{group.name} chat</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        New messages appear automatically every few seconds. Showing the latest 100.
      </p>

      <ChatLog count={messages.length}>
        {messages.length === 0 ? (
          <p className="py-10 text-center text-muted">No messages yet. Say hello.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.authorId === userId;
              const summary = REACTION_EMOJIS.map((emoji) => {
                const forEmoji = m.reactions.filter((r) => r.emoji === emoji);
                return {
                  emoji,
                  count: forEmoji.length,
                  reacted: forEmoji.some((r) => r.userId === userId),
                };
              });
              const used = summary.filter((r) => r.count > 0);
              return (
                <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      mine ? "bg-brand text-white" : "border border-line"
                    }`}
                  >
                    <div className={`text-xs ${mine ? "text-white/80" : "text-muted"}`}>
                      <span className="font-semibold">{mine ? "You" : m.author.name}</span>
                      <span className="mx-1">·</span>
                      <LocalTime iso={m.createdAt.toISOString()} />
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>

                    {/* Reactions: pills for emoji already used, plus a picker for the rest */}
                    <div className="mt-1 flex flex-wrap items-start gap-1">
                      {used.map(({ emoji, count, reacted }) => (
                        <form key={emoji} action={toggleMessageReaction.bind(null, m.id, emoji)}>
                          <button
                            aria-pressed={reacted}
                            aria-label={`${emoji}, ${count} ${count === 1 ? "reaction" : "reactions"}`}
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              mine
                                ? reacted
                                  ? "border-white bg-white/25"
                                  : "border-white/40 hover:border-white"
                                : reacted
                                  ? "border-brand bg-brand/10"
                                  : "border-line hover:border-brand"
                            }`}
                          >
                            {emoji} {count}
                          </button>
                        </form>
                      ))}
                      <details>
                        <summary
                          aria-label="Add a reaction"
                          className={`cursor-pointer list-none rounded-full border px-2 py-0.5 text-xs ${
                            mine ? "border-white/40 hover:border-white" : "border-line hover:border-brand"
                          }`}
                        >
                          ＋
                        </summary>
                        <div className="mt-1 flex gap-1">
                          {REACTION_EMOJIS.map((emoji) => (
                            <form key={emoji} action={toggleMessageReaction.bind(null, m.id, emoji)}>
                              <button
                                aria-label={`React with ${emoji}`}
                                className={`rounded-full border px-2 py-0.5 text-sm ${
                                  mine ? "border-white/40 hover:border-white" : "border-line hover:border-brand"
                                }`}
                              >
                                {emoji}
                              </button>
                            </form>
                          ))}
                        </div>
                      </details>
                    </div>
                    {(mine || moderator) && (
                      <form action={deleteMessage.bind(null, m.id)} className="mt-1">
                        <button
                          className={`text-xs font-semibold ${
                            mine ? "text-white/80 hover:text-white" : "text-muted hover:text-red-600"
                          }`}
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ChatLog>

      <ChatForm groupId={group.id} />
    </div>
  );
}
