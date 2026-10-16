import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const memberships = await db.membership.findMany({
    where: { userId: session!.user.id },
    include: { group: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Hi, {firstName}</h1>
          <p className="mt-1 text-muted">
            {memberships.length === 0
              ? "You haven't joined a circle yet."
              : `You're in ${memberships.length} ${memberships.length === 1 ? "circle" : "circles"}.`}
          </p>
        </div>
        <Link href="/groups/new" className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
          Create a circle
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="font-display text-2xl font-bold">Start with one circle</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Create a circle for a course or topic, then share the invite link with the people you study with.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ group, role }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.slug}`}
                className="block rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand"
              >
                <h2 className="font-display text-xl font-bold">{group.name}</h2>
                {group.subject && <p className="mt-1 text-sm text-muted">{group.subject}</p>}
                <p className="mt-4 text-sm text-muted">
                  {group._count.memberships} members · You are {role.toLowerCase()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
