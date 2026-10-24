import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { db } from "@/lib/db";
import { blockState } from "@/lib/direct";

export const metadata: Metadata = { title: "Profile" };

/** A member's profile. Only people who share a circle with you (or yourself) can see it. */
export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;
  const { userId } = await params;

  const person = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, bio: true, createdAt: true },
  });
  if (!person) notFound();

  // Circles you are both in. Circles only one of you belongs to are never shown.
  const shared = await db.membership.findMany({
    where: { userId, group: { memberships: { some: { userId: me } } } },
    select: { role: true, group: { select: { name: true, slug: true, subject: true } } },
    orderBy: { joinedAt: "asc" },
  });
  if (userId !== me && shared.length === 0) notFound();

  const blocks = userId === me ? null : await blockState(me, userId);
  const canMessage = userId !== me && blocks && !blocks.iBlocked && !blocks.blockedMe;

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <Avatar userId={person.id} name={person.name} image={person.image} size={72} />
          <div>
            <h1 className="font-display text-3xl font-bold">{person.name}</h1>
            <p className="text-sm text-muted">
              Joined {person.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
            </p>
          </div>
        </div>

        {person.bio ? (
          <p className="mt-4 whitespace-pre-wrap text-sm">{person.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-muted">No bio yet.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {canMessage && (
            <Link href={`/messages/${person.id}`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Send a private message
            </Link>
          )}
          {userId === me && (
            <Link href="/account" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-brand">
              Edit my profile
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="shared" className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 id="shared" className="font-display text-lg font-bold">
          {userId === me ? "Your circles" : "Circles you share"}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {shared.map(({ group, role }) => (
            <li key={group.slug} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <Link href={`/groups/${group.slug}`} className="font-semibold hover:underline">
                {group.name}
              </Link>
              <span className="text-xs text-muted">{role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
