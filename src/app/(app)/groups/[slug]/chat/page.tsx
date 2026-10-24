import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteMessage } from "@/app/actions/messages";
import { toggleMessageReaction } from "@/app/actions/reactions";
import { Avatar } from "@/components/avatar";
import { ChatForm } from "@/components/chat-form";
import { CallBanner } from "@/components/call-banner";
import { ChatLog } from "@/components/chat-log";
import { ReportButton } from "@/components/report-button";
import { LocalTime } from "@/components/local-time";
import { IMAGE_EXTENSIONS, extensionOf, formatBytes } from "@/lib/files";
import { canModerate } from "@/lib/permissions";
import { REACTION_EMOJIS } from "@/lib/reactions";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { slug } = await params;
  const sp = await searchParams;
  const asked = Number.parseInt(typeof sp.n === "string" ? sp.n : "", 10);
  const shown = Number.isFinite(asked) ? Math.min(Math.max(asked, 100), 1000) : 100;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (!membership) notFound(); // only members can read or send

  after(async () => {
    try {
      await db.membership.update({ where: { id: membership.id }, data: { chatSeenAt: new Date() } });
    } catch {
      // A missed update only leaves the badge up a little longer.
    }
  });

  // Newest 100, then flip so the oldest of those is at the top.
  const recent = await db.message.findMany({
    where: { groupId: group.id },
    include: {
      author: { select: { name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: shown + 1, // one extra row tells us whether there are older messages
  });
  const hasMore = recent.length > shown;
  const messages = recent.slice(0, shown).reverse();
  const moderator = canModerate(membership.role);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/groups/${group.slug}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{group.name} chat</h1>
        <Link
          href={`/groups/${group.slug}/call`}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand"
        >
          <span aria-hidden>📞</span> Call
        </Link>
      </div>
      <p className="mb-4 mt-1 text-sm text-muted">
        New messages appear as they are sent. Showing the latest {messages.length}.
      </p>

      <CallBanner slug={group.slug} startedAt={group.callStartedAt} by={group.callStartedByName} />

      <ChatLog groupId={group.id} count={messages.length} firstId={messages[0]?.id}>
        {messages.length === 0 ? (
          <p className="py-10 text-center text-muted">No messages yet. Say hello.</p>
        ) : (
          <ul className="space-y-3">
          {hasMore && (
            <li className="text-center">
              <Link
                href={`/groups/${group.slug}/chat?n=${shown + 100}`}
                scroll={false}
                className="inline-block rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand"
              >
                Show older messages
              </Link>
            </li>
          )}
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
                      {!mine && (
                        <span className="mr-1.5 inline-block align-middle">
                          <Avatar userId={m.authorId} name={m.author.name} image={m.author.image} size={18} />
                        </span>
                      )}
                      <span className="font-semibold">{mine ? "You" : m.author.name}</span>
                      <span className="mx-1">·</span>
                      <LocalTime iso={m.createdAt.toISOString()} />
                    </div>
                    {m.body && <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.attachmentPath &&
                      (IMAGE_EXTENSIONS.has(extensionOf(m.attachmentPath)) ? (
                        <a href={`/api/messages/${m.id}/file`} target="_blank" rel="noreferrer" className="mt-1 block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/messages/${m.id}/file`}
                            alt={m.attachmentName ?? "Image"}
                            loading="lazy"
                            className="max-h-64 max-w-full rounded-lg"
                          />
                        </a>
                      ) : (
                        <a
                          href={`/api/messages/${m.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold underline ${
                            mine ? "border-white/50" : "border-line"
                          }`}
                        >
                          <span aria-hidden>📄</span>
                          {m.attachmentName ?? "Document"}
                          {m.attachmentSize ? ` (${formatBytes(m.attachmentSize)})` : ""}
                        </a>
                      ))}

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
                    {!mine && (
                      <div className="mt-1">
                        <ReportButton kind="message" id={m.id} />
                      </div>
                    )}
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
