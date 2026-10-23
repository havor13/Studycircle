import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeReportedContent, resolveReport } from "@/app/actions/reports";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { canModerate } from "@/lib/permissions";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { slug } = await params;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (!membership || !canModerate(membership.role)) notFound(); // only owner, admins and moderators

  const include = {
    reporter: { select: { name: true } },
    resolvedBy: { select: { name: true } },
    post: { select: { body: true, author: { select: { name: true } } } },
    message: { select: { body: true, attachmentName: true, author: { select: { name: true } } } },
    comment: { select: { body: true, author: { select: { name: true } } } },
  } as const;
  const [open, handled] = await Promise.all([
    db.contentReport.findMany({ where: { groupId: group.id, status: "OPEN" }, include, orderBy: { createdAt: "asc" }, take: 100 }),
    db.contentReport.findMany({ where: { groupId: group.id, status: "RESOLVED" }, include, orderBy: { resolvedAt: "desc" }, take: 20 }),
  ]);

  const describe = (r: (typeof open)[number]) => {
    if (r.post) return { kind: "Post", author: r.post.author.name, text: r.post.body };
    if (r.comment) return { kind: "Comment", author: r.comment.author.name, text: r.comment.body };
    if (r.message) {
      const file = r.message.attachmentName ? `📎 ${r.message.attachmentName}` : "";
      return { kind: "Chat message", author: r.message.author.name, text: [r.message.body, file].filter(Boolean).join("\n") };
    }
    return null; // the content was already deleted
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/groups/${group.slug}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Reports</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Posts, comments and chat messages members flagged. Only the owner, admins and moderators of this circle see this page.
      </p>

      <h2 className="font-display text-xl font-bold">Open ({open.length})</h2>
      {open.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          Nothing to review.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {open.map((r) => {
            const what = describe(r);
            if (!what) return null;
            return (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs text-muted">
                  {what.kind} by <span className="font-semibold">{what.author}</span> · reported by{" "}
                  <span className="font-semibold">{r.reporter.name}</span> · <LocalTime iso={r.createdAt.toISOString()} />
                </p>
                <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-4 border-line pl-3">
                  {what.text}
                </blockquote>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">Reason:</span> {r.reason}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <form action={removeReportedContent.bind(null, r.id)}>
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700">
                      Delete it
                    </button>
                  </form>
                  <form action={resolveReport.bind(null, r.id)}>
                    <button className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-brand">
                      Mark as handled
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {handled.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-bold">Recently handled</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {handled.map((r) => {
              const what = describe(r);
              return (
                <li key={r.id} className="rounded-xl border border-line bg-surface px-4 py-2 text-muted">
                  {what ? `${what.kind} by ${what.author}` : "Deleted content"} · {r.reason.slice(0, 80)}
                  {r.reason.length > 80 ? "…" : ""} · handled by {r.resolvedBy?.name ?? "a moderator"}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
