import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MAX_QUERY, MIN_QUERY, cleanQuery, excerpt, splitMatch } from "@/lib/search";

export const metadata: Metadata = { title: "Search" };

const LIMIT = 15;

function Highlight({ text, query }: { text: string; query: string }) {
  const { before, match, after } = splitMatch(text, query);
  return (
    <>
      {before}
      {match && <mark className="rounded bg-brand/20 px-0.5 text-foreground">{match}</mark>}
      {after}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const searched = q.length >= MIN_QUERY;

  // Only circles you are a member of are ever searched.
  const memberships = searched
    ? await db.membership.findMany({ where: { userId: session.user.id }, select: { groupId: true } })
    : [];
  const groupIds = memberships.map((m) => m.groupId);
  const contains = { contains: q, mode: "insensitive" as const };

  const [posts, comments, chat, resources, events] = searched
    ? await Promise.all([
        db.post.findMany({
          where: { groupId: { in: groupIds }, body: contains },
          select: { id: true, body: true, createdAt: true, author: { select: { name: true } }, group: { select: { name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
        }),
        db.comment.findMany({
          where: { post: { groupId: { in: groupIds } }, body: contains },
          select: { id: true, body: true, createdAt: true, author: { select: { name: true } }, post: { select: { group: { select: { name: true, slug: true } } } } },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
        }),
        db.message.findMany({
          where: { groupId: { in: groupIds }, body: contains },
          select: { id: true, body: true, createdAt: true, author: { select: { name: true } }, group: { select: { name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
        }),
        db.resource.findMany({
          where: { groupId: { in: groupIds }, OR: [{ title: contains }, { tags: { has: q.toLowerCase() } }] },
          select: { id: true, title: true, kind: true, group: { select: { name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
        }),
        db.studyEvent.findMany({
          where: { groupId: { in: groupIds }, OR: [{ title: contains }, { notes: contains }, { location: contains }] },
          select: { id: true, title: true, startsAt: true, group: { select: { name: true, slug: true } } },
          orderBy: { startsAt: "desc" },
          take: LIMIT,
        }),
      ])
    : [[], [], [], [], []];

  const total = posts.length + comments.length + chat.length + resources.length + events.length;
  const heading = "font-display text-xl font-bold";
  const card = "rounded-xl border border-line bg-surface px-4 py-3 text-sm";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Search</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Search posts, comments, circle chat, resources and study sessions in all the circles you are in.
      </p>

      <form action="/search" method="get" role="search" className="flex gap-2">
        <label htmlFor="global-search" className="sr-only">
          Search your circles
        </label>
        <input
          id="global-search"
          name="q"
          defaultValue={q}
          maxLength={MAX_QUERY}
          autoFocus={!searched}
          placeholder="Search your circles"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark">Search</button>
      </form>

      {q && !searched && <p className="mt-6 text-muted">Type at least {MIN_QUERY} characters.</p>}
      {searched && total === 0 && <p className="mt-6 text-muted">Nothing found for &ldquo;{q}&rdquo; in your circles.</p>}

      {posts.length > 0 && (
        <section className="mt-8 space-y-2">
          <h2 className={heading}>Posts</h2>
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/groups/${p.group.slug}?q=${encodeURIComponent(q)}`} className={`${card} block hover:border-brand`}>
                  <span className="text-xs text-muted">
                    {p.group.name} · {p.author.name}
                  </span>
                  <span className="mt-1 block">
                    <Highlight text={excerpt(p.body, q)} query={q} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comments.length > 0 && (
        <section className="mt-8 space-y-2">
          <h2 className={heading}>Comments</h2>
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id}>
                <Link href={`/groups/${c.post.group.slug}`} className={`${card} block hover:border-brand`}>
                  <span className="text-xs text-muted">
                    {c.post.group.name} · {c.author.name}
                  </span>
                  <span className="mt-1 block">
                    <Highlight text={excerpt(c.body, q)} query={q} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chat.length > 0 && (
        <section className="mt-8 space-y-2">
          <h2 className={heading}>Circle chat</h2>
          <ul className="space-y-2">
            {chat.map((m) => (
              <li key={m.id}>
                <Link href={`/groups/${m.group.slug}/chat`} className={`${card} block hover:border-brand`}>
                  <span className="text-xs text-muted">
                    {m.group.name} · {m.author.name}
                  </span>
                  <span className="mt-1 block">
                    <Highlight text={excerpt(m.body, q)} query={q} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resources.length > 0 && (
        <section className="mt-8 space-y-2">
          <h2 className={heading}>Resources</h2>
          <ul className="space-y-2">
            {resources.map((r) => (
              <li key={r.id}>
                <Link href={`/groups/${r.group.slug}`} className={`${card} block hover:border-brand`}>
                  <span className="text-xs text-muted">
                    {r.group.name} · {r.kind === "FILE" ? "file" : "link"}
                  </span>
                  <span className="mt-1 block font-semibold">
                    <Highlight text={r.title} query={q} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-8 space-y-2">
          <h2 className={heading}>Study sessions</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/groups/${e.group.slug}`} className={`${card} block hover:border-brand`}>
                  <span className="text-xs text-muted">
                    {e.group.name} · {e.startsAt.toISOString().slice(0, 10)}
                  </span>
                  <span className="mt-1 block font-semibold">
                    <Highlight text={e.title} query={q} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {searched && total > 0 && (
        <p className="mt-8 text-xs text-muted">Showing up to {LIMIT} of each kind, newest first.</p>
      )}
    </div>
  );
}
