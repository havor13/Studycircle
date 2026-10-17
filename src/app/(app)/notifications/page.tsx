import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { markAllRead, openNotification } from "@/app/actions/notifications";
import { LocalTime } from "@/components/local-time";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted">
            {unread === 0 ? "You are all caught up." : `${unread} unread`}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          Nothing yet. You will see new posts, new members and role changes here.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => {
            const isUnread = !n.readAt;
            return (
              <li key={n.id}>
                <form action={openNotification.bind(null, n.id)}>
                  <button
                    className={`flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition-colors hover:border-brand ${
                      isUnread ? "border-brand" : "border-line"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        isUnread ? "bg-brand" : "bg-transparent"
                      }`}
                    />
                    <span>
                      <span className={`block text-sm ${isUnread ? "font-semibold" : ""}`}>
                        {n.message}
                      </span>
                      <span className="block text-xs text-muted">
                        <LocalTime iso={n.createdAt.toISOString()} />
                        {isUnread && <span className="sr-only"> (unread)</span>}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
