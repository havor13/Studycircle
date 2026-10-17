import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteSession } from "@/app/actions/sessions";
import { LocalTime } from "@/components/local-time";
import { SessionLogger } from "@/components/session-logger";
import { canModerate } from "@/lib/permissions";
import { dayKey, formatMinutes, startOfWeekUTC } from "@/lib/progress";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage({
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
  if (!membership) notFound();

  const now = new Date();
  const weekStart = startOfWeekUTC(now);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);

  const [weekSessions, mySessions, recent] = await Promise.all([
    db.studySession.findMany({
      where: { groupId: group.id, startedAt: { gte: weekStart } },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.studySession.findMany({
      where: { groupId: group.id, userId, startedAt: { gte: sevenDaysAgo } },
      select: { minutes: true, startedAt: true },
    }),
    db.studySession.findMany({
      where: { groupId: group.id },
      include: { user: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      take: 15,
    }),
  ]);

  // This week's totals, for the whole circle and per person.
  const weekTotal = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const perPerson = new Map<string, { name: string; minutes: number }>();
  for (const s of weekSessions) {
    const entry = perPerson.get(s.userId) ?? { name: s.user.name, minutes: 0 };
    entry.minutes += s.minutes;
    perPerson.set(s.userId, entry);
  }
  const leaderboard = [...perPerson.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);
  const myWeek = perPerson.get(userId)?.minutes ?? 0;

  // Your last 7 days, one bar per day.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(sevenDaysAgo.getUTCDate() + i);
    const key = dayKey(d);
    const minutes = mySessions
      .filter((s) => dayKey(s.startedAt) === key)
      .reduce((sum, s) => sum + s.minutes, 0);
    return {
      key,
      minutes,
      label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.minutes));
  const moderator = canModerate(membership.role);

  return (
    <div>
      <Link href={`/groups/${group.slug}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{group.name} progress</h1>
      <p className="mt-1 text-sm text-muted">
        Weeks run Monday to Sunday and days are counted in UTC.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Circle this week</p>
          <p className="font-display text-3xl font-bold">{formatMinutes(weekTotal)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">You this week</p>
          <p className="font-display text-3xl font-bold">{formatMinutes(myWeek)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Sessions this week</p>
          <p className="font-display text-3xl font-bold">{weekSessions.length}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SessionLogger groupId={group.id} />

          {/* Your last 7 days */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-bold">Your last 7 days</h2>
            <ul className="mt-4 flex h-36 items-end gap-2">
              {days.map((d) => (
                <li key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs text-muted">{d.minutes > 0 ? formatMinutes(d.minutes) : ""}</span>
                  <div
                    className="w-full rounded-t bg-brand"
                    style={{ height: d.minutes > 0 ? `${Math.max(4, Math.round((d.minutes / maxDay) * 100))}%` : "0%" }}
                    role="img"
                    aria-label={`${d.label}: ${formatMinutes(d.minutes)}`}
                  />
                  <span className="text-xs font-semibold">{d.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent sessions */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-bold">Recent sessions</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No sessions yet. Log the first one above.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p>
                        <span className="font-semibold">
                          {s.userId === userId ? "You" : s.user.name}
                        </span>{" "}
                        studied {s.topic ? <span>“{s.topic}”</span> : "for"}{" "}
                        <span className="font-semibold">{formatMinutes(s.minutes)}</span>
                      </p>
                      <p className="text-xs text-muted">
                        <LocalTime iso={s.startedAt.toISOString()} />
                      </p>
                    </div>
                    {(s.userId === userId || moderator) && (
                      <form action={deleteSession.bind(null, s.id)}>
                        <button className="text-xs font-semibold text-muted hover:text-red-600">
                          Delete
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <aside>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">This week</h2>
            {leaderboard.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nobody has logged time yet this week.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {leaderboard.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">
                      {i + 1}. {p.name}
                      {p.id === userId && <span className="text-muted"> (you)</span>}
                    </span>
                    <span className="text-muted">{formatMinutes(p.minutes)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
