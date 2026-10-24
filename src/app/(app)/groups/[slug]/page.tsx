import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { changeRole, leaveGroup, removeMember, transferOwnership } from "@/app/actions/members";
import { deletePost, togglePin } from "@/app/actions/posts";
import { deleteComment } from "@/app/actions/comments";
import { togglePostReaction } from "@/app/actions/reactions";
import { setListed } from "@/app/actions/discover";
import { deleteEvent, toggleRsvp } from "@/app/actions/events";
import { deleteResource } from "@/app/actions/resources";
import { Avatar } from "@/components/avatar";
import { CallBanner } from "@/components/call-banner";
import { CommentEditForm } from "@/components/comment-edit-form";
import { CommentForm } from "@/components/comment-form";
import { DeleteCircleForm } from "@/components/delete-circle-form";
import { EventEditForm } from "@/components/event-edit-form";
import { EventForm } from "@/components/event-form";
import { InviteEmailForm } from "@/components/invite-email-form";
import { InviteLink } from "@/components/invite-link";
import { LocalTime } from "@/components/local-time";
import { ReportButton } from "@/components/report-button";
import { PostBody } from "@/components/post-body";
import { PostForm } from "@/components/post-form";
import { ResourceForm } from "@/components/resource-form";
import { FileUploadForm } from "@/components/file-upload-form";
import { formatBytes } from "@/lib/files";
import { mailConfigured } from "@/lib/mailer";
import {
  ROLE_RANK,
  assignableRoles,
  canModerate,
  canRemove,
  isManager,
} from "@/lib/permissions";
import { REACTION_EMOJIS } from "@/lib/reactions";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; n?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { slug } = await params;
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const asked = Number.parseInt(typeof sp.n === "string" ? sp.n : "", 10);
  const shown = Number.isFinite(asked) ? Math.min(Math.max(asked, 20), 200) : 20;
  const moreLink = (n: number) =>
    `/groups/${slug}?${new URLSearchParams({ ...(q ? { q } : {}), n: String(n) }).toString()}`;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (!membership) notFound(); // hides circles you are not a member of

  const [allPosts, members, resources, events] = await Promise.all([
    db.post.findMany({
      where: {
        groupId: group.id,
        ...(q ? { body: { contains: q, mode: "insensitive" as const } } : {}),
      },
      include: {
        author: { select: { name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          take: 50,
          include: { author: { select: { name: true, image: true } } },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: shown + 1, // one extra row tells us whether there is more
    }),
    db.membership.findMany({
      where: { groupId: group.id },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    db.resource.findMany({
      where: { groupId: group.id },
      include: { uploader: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    // Upcoming sessions (a session stays listed for an hour after it starts).
    db.studyEvent.findMany({
      where: { groupId: group.id, startsAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      include: {
        creator: { select: { name: true } },
        rsvps: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
  ]);
  const hasMore = allPosts.length > shown;
  const posts = allPosts.slice(0, shown);
  members.sort(
    (a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.user.name.localeCompare(b.user.name),
  );

  const myRole = membership.role;
  const manager = isManager(myRole);

  // Full link built from the address the page was opened on, so it is right
  // on localhost and on your real domain without any setting.
  let inviteUrl = "";
  if (manager) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
  }
  const moderator = canModerate(myRole);
  const openReports = moderator ? await db.contentReport.count({ where: { groupId: group.id, status: "OPEN" } }) : 0;

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">{group.name}</h1>
      {group.subject && <p className="mt-1 text-muted">{group.subject}</p>}
      {group.description && <p className="mt-4 max-w-2xl">{group.description}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/groups/${group.slug}/chat`}
          className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Open chat
        </Link>
        <Link
          href={`/groups/${group.slug}/progress`}
          className="inline-block rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand"
        >
          Progress
        </Link>
        {manager && (
          <Link
            href={`/groups/${group.slug}/settings`}
            className="inline-block rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand"
          >
            Settings
          </Link>
        )}
        {moderator && (
          <Link
            href={`/groups/${group.slug}/reports`}
            className="inline-block rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand"
          >
            Reports{openReports > 0 ? ` (${openReports})` : ""}
          </Link>
        )}
      </div>

      <div className="mt-6">
        <CallBanner slug={group.slug} startedAt={group.callStartedAt} by={group.callStartedByName} />
      </div>

      <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Posts */}
        <section className="space-y-4">
          <PostForm groupId={group.id} />

          <form action={`/groups/${group.slug}`} method="get" role="search" className="flex gap-2">
            <label htmlFor="post-search" className="sr-only">
              Search posts
            </label>
            <input
              id="post-search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Search posts"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold hover:border-brand">
              Search
            </button>
            {q && (
              <Link href={`/groups/${group.slug}`} className="self-center text-sm text-muted underline">
                Clear
              </Link>
            )}
          </form>

          {posts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
              {q ? `No posts match "${q}".` : "No posts yet. Start the conversation."}
            </p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => {
                const mine = post.authorId === userId;
                return (
                  <li key={post.id} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Avatar userId={post.authorId} name={post.author.name} image={post.author.image} size={22} />
                          {post.author.name}
                        </span>
                        <span className="ml-2 text-muted">
                          {post.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {post.pinned && (
                          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs font-semibold">
                        {moderator && (
                          <form action={togglePin.bind(null, post.id)}>
                            <button className="text-muted hover:text-brand">
                              {post.pinned ? "Unpin" : "Pin"}
                            </button>
                          </form>
                        )}
                        {!mine && <ReportButton kind="post" id={post.id} />}
                        {(mine || moderator) && (
                          <form action={deletePost.bind(null, post.id)}>
                            <button className="text-muted hover:text-red-600">Delete</button>
                          </form>
                        )}
                      </div>
                    </div>
                    <PostBody postId={post.id} body={post.body} canEdit={mine} edited={Boolean(post.editedAt)} />

                    {/* Reactions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {REACTION_EMOJIS.map((emoji) => {
                        const forEmoji = post.reactions.filter((r) => r.emoji === emoji);
                        const reacted = forEmoji.some((r) => r.userId === userId);
                        return (
                          <form key={emoji} action={togglePostReaction.bind(null, post.id, emoji)}>
                            <button
                              aria-pressed={reacted}
                              aria-label={`React with ${emoji}`}
                              className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                                reacted
                                  ? "border-brand bg-brand/10"
                                  : "border-line hover:border-brand"
                              }`}
                            >
                              {emoji}
                              {forEmoji.length > 0 && (
                                <span className="ml-1 text-xs font-semibold">{forEmoji.length}</span>
                              )}
                            </button>
                          </form>
                        );
                      })}
                    </div>

                    {/* Comments */}
                    <section aria-label={`Comments on ${post.author.name}'s post`} className="mt-4 border-t border-line pt-3">
                      {post.comments.length > 0 && (
                        <ul className="space-y-3">
                          {post.comments.map((c) => (
                            <li key={c.id} className="flex items-start gap-2 text-sm">
                              <Avatar userId={c.authorId} name={c.author.name} image={c.author.image} size={22} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="font-semibold">{c.author.name}</span>
                                  <span className="text-xs text-muted">
                                    <LocalTime iso={c.createdAt.toISOString()} />
                                  </span>
                                  {c.editedAt && <span className="text-xs text-muted">(edited)</span>}
                                  {c.authorId !== userId && <ReportButton kind="comment" id={c.id} />}
                                  {(c.authorId === userId || moderator) && (
                                    <form action={deleteComment.bind(null, c.id)}>
                                      <button className="text-xs text-muted hover:text-red-600">Delete</button>
                                    </form>
                                  )}
                                </div>
                                <p className="whitespace-pre-wrap break-words">{c.body}</p>
                                {c.authorId === userId && <CommentEditForm commentId={c.id} body={c.body} />}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <CommentForm postId={post.id} />
                    </section>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <Link
              href={moreLink(shown + 20)}
              className="block rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm font-semibold hover:border-brand"
            >
              Show older posts
            </Link>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {manager && (
            <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
              <h2 className="font-display text-lg font-bold">Invite link</h2>
              <InviteLink url={inviteUrl} />
              <p className="mt-2 text-xs text-muted">
                Anyone with this link can join as a member once they are logged in.
              </p>
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Email an invite</summary>
                <InviteEmailForm groupId={group.id} configured={mailConfigured()} />
              </details>
            </div>
          )}

          {/* Study sessions */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">Study sessions</h2>

            {events.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No sessions planned. Propose a time.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {events.map((ev) => {
                  const going = ev.rsvps.some((r) => r.userId === userId);
                  const names = ev.rsvps.map((r) => r.user.name);
                  return (
                    <li key={ev.id} className="text-sm">
                      <p className="font-semibold">{ev.title}</p>
                      <p className="text-xs text-muted">
                        <LocalTime iso={ev.startsAt.toISOString()} /> · {ev.durationMinutes} min
                      </p>
                      {ev.location && <p className="mt-0.5 break-words text-xs">{ev.location}</p>}
                      {ev.notes && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted">{ev.notes}</p>}
                      <p className="mt-1 text-xs text-muted">
                        {names.length === 0
                          ? "Nobody has said they are going yet."
                          : `${names.length} going: ${names.slice(0, 4).join(", ")}${names.length > 4 ? ` and ${names.length - 4} more` : ""}`}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <form action={toggleRsvp.bind(null, ev.id)}>
                          <button
                            aria-pressed={going}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                              going
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-line hover:border-brand"
                            }`}
                          >
                            {going ? "Going ✓ (tap to cancel)" : "I'm going"}
                          </button>
                        </form>
                        {(ev.creatorId === userId || moderator) && (
                          <form action={deleteEvent.bind(null, ev.id)}>
                            <button className="text-xs font-semibold text-muted hover:text-red-600">
                              Delete
                            </button>
                          </form>
                        )}
                      </div>
                      {(ev.creatorId === userId || moderator) && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-brand">
                            Edit
                          </summary>
                          <EventEditForm
                            eventId={ev.id}
                            title={ev.title}
                            startsAtIso={ev.startsAt.toISOString()}
                            durationMinutes={ev.durationMinutes}
                            location={ev.location}
                            notes={ev.notes}
                          />
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                Propose a session
              </summary>
              <EventForm groupId={group.id} />
            </details>
          </div>

          {/* Resources */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">Resources ({resources.length})</h2>

            {resources.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Nothing shared yet. Add a link or upload a file for the circle.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {resources.map((res) => (
                  <li key={res.id} className="text-sm">
                    <a
                      href={res.kind === "FILE" ? `/api/files/${res.id}` : res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand hover:underline"
                    >
                      {res.kind === "FILE" ? "📎 " : ""}
                      {res.title}
                    </a>
                    <p className="text-xs text-muted">
                      Added by {res.uploader.name}
                      {res.kind === "FILE" && res.sizeBytes ? ` · ${formatBytes(res.sizeBytes)}` : ""}
                    </p>
                    {res.tags.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {res.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-line px-2 py-0.5 text-xs text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </p>
                    )}
                    {(res.uploaderId === userId || moderator) && (
                      <form action={deleteResource.bind(null, res.id)} className="mt-1">
                        <button className="text-xs font-semibold text-muted hover:text-red-600">
                          Delete
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                Add a resource
              </summary>
              <ResourceForm groupId={group.id} />
            </details>

            <details className="mt-3 border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                Upload a file
              </summary>
              <FileUploadForm groupId={group.id} />
            </details>
          </div>

          {/* Visibility (managers only) */}
          {manager && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="font-display text-lg font-bold">Find circles</h2>
              <p className="mt-1 text-sm text-muted">
                {group.listed
                  ? "This circle is listed. Anyone with an account can find it and join."
                  : "This circle is hidden. People can only join with the invite link."}
              </p>
              {!group.listed && (
                <p className="mt-1 text-xs text-muted">
                  If you list it, its name, subject, description and member count appear in search, and anyone who
                  joins sees all posts, chat and files.
                </p>
              )}
              <form action={setListed.bind(null, group.id, !group.listed)} className="mt-3">
                <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand">
                  {group.listed ? "Remove from search" : "List in search"}
                </button>
              </form>
            </div>
          )}

          {/* Members */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">Members ({members.length})</h2>
            <ul className="mt-3 space-y-3">
              {members.map((m) => {
                const options = assignableRoles(myRole, m.role);
                const removable = canRemove(myRole, m.role);
                return (
                  <li key={m.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <Avatar userId={m.userId} name={m.user.name} image={m.user.image} size={26} />
                        <span>
                          {m.user.name}
                          {m.userId === userId && <span className="text-muted"> (you)</span>}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        {m.userId !== userId && (
                          <Link href={`/messages/${m.userId}`} className="font-semibold text-brand hover:underline">
                            Message
                          </Link>
                        )}
                        {m.role.toLowerCase()}
                      </span>
                    </div>
                    {(options.length > 0 || removable) && m.userId !== userId && (
                      <div className="mt-1 flex items-center gap-2">
                        {options.length > 0 && (
                          <form
                            action={changeRole.bind(null, group.id, m.userId)}
                            className="flex items-center gap-1"
                          >
                            <select
                              name="role"
                              defaultValue={m.role}
                              aria-label={`Role for ${m.user.name}`}
                              className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs"
                            >
                              {/* current role first so it shows as selected */}
                              <option value={m.role}>{m.role.toLowerCase()}</option>
                              {options.map((r) => (
                                <option key={r} value={r}>
                                  {r.toLowerCase()}
                                </option>
                              ))}
                            </select>
                            <button className="text-xs font-semibold text-brand hover:underline">
                              Save
                            </button>
                          </form>
                        )}
                        {removable && (
                          <form action={removeMember.bind(null, group.id, m.userId)}>
                            <button className="text-xs font-semibold text-muted hover:text-red-600">
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                    {myRole === "OWNER" && m.userId !== userId && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-brand">
                          Make owner
                        </summary>
                        <div className="mt-1 rounded-lg border border-line p-2 text-xs">
                          <p>
                            {m.user.name} becomes the owner and you become an admin. You cannot
                            undo this yourself.
                          </p>
                          <form
                            action={transferOwnership.bind(null, group.id, m.userId)}
                            className="mt-2"
                          >
                            <button className="rounded bg-brand px-2 py-1 font-semibold text-white hover:bg-brand-dark">
                              Yes, transfer ownership
                            </button>
                          </form>
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {myRole !== "OWNER" && (
            <form action={leaveGroup.bind(null, group.id)}>
              <button className="text-sm font-semibold text-muted hover:text-red-600">
                Leave this circle
              </button>
            </form>
          )}
          {myRole === "OWNER" && (
            <p className="text-xs text-muted">
              The owner cannot leave. To step down, make another member the owner first.
            </p>
          )}
          {myRole === "OWNER" && (
            <details className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-semibold text-red-600">Delete this circle</summary>
              <DeleteCircleForm groupId={group.id} groupName={group.name} />
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
