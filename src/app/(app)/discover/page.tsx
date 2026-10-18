import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { joinListedGroup } from "@/app/actions/discover";

export const metadata: Metadata = { title: "Find circles" };

const LIMIT = 30;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?redirectTo=/discover");
  const userId = session.user.id;

  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 60);
  // Every word must appear somewhere in the name, subject or description.
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 5);

  const groups = await db.group.findMany({
    where: {
      listed: true,
      AND: terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { subject: { contains: term, mode: "insensitive" as const } },
          { description: { contains: term, mode: "insensitive" as const } },
        ],
      })),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      subject: true,
      description: true,
      _count: { select: { memberships: true } },
    },
    orderBy: [{ memberships: { _count: "desc" } }, { createdAt: "desc" }],
    take: LIMIT,
  });

  const mine = await db.membership.findMany({
    where: { userId, groupId: { in: groups.map((g) => g.id) } },
    select: { groupId: true },
  });
  const memberOf = new Set(mine.map((m) => m.groupId));

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">Find circles</h1>
      <p className="mt-1 text-muted">
        Circles whose admins chose to list them. Private circles only appear if you have their invite link.
      </p>

      <form action="/discover" method="get" role="search" className="mt-6 flex flex-wrap gap-2">
        <label htmlFor="circle-search" className="sr-only">
          Search circles by name, subject or description
        </label>
        <input
          id="circle-search"
          name="q"
          defaultValue={q}
          maxLength={60}
          placeholder="Search by name, subject or topic"
          className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark">
          Search
        </button>
        {q && (
          <Link href="/discover" className="rounded-lg border border-line px-4 py-2 font-semibold hover:border-brand">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {groups.length === 0
          ? q
            ? `No circles match "${q}".`
            : "No circles are listed yet."
          : `${groups.length}${groups.length === LIMIT ? "+" : ""} ${groups.length === 1 ? "circle" : "circles"}${
              q ? ` for "${q}"` : ""
            }`}
      </p>

      {groups.length === 0 && !q && (
        <p className="mt-2 max-w-xl text-sm text-muted">
          An owner or admin can list their circle from its page, in the &quot;Find circles&quot; card.
        </p>
      )}

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const joined = memberOf.has(g.id);
          return (
            <li key={g.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-display text-xl font-bold">{g.name}</h2>
              {g.subject && <p className="mt-1 text-sm text-muted">{g.subject}</p>}
              {g.description && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm">{g.description}</p>
              )}
              <p className="mt-3 text-sm text-muted">
                {g._count.memberships} {g._count.memberships === 1 ? "member" : "members"}
              </p>
              <div className="mt-auto pt-4">
                {joined ? (
                  <Link
                    href={`/groups/${g.slug}`}
                    className="inline-block rounded-lg border border-line px-4 py-1.5 text-sm font-semibold hover:border-brand"
                  >
                    You are in · Open
                  </Link>
                ) : (
                  <form action={joinListedGroup.bind(null, g.id)}>
                    <button className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                      Join
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
