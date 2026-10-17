import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unread = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Logo href="/dashboard" />
            <nav className="hidden gap-6 text-sm font-semibold sm:flex">
              <Link href="/dashboard" className="hover:text-brand">Dashboard</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative rounded-lg border border-line px-3 py-1.5 hover:border-brand"
            >
              <span aria-hidden="true">🔔</span>
              {unread > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <span className="hidden text-muted sm:inline">{session.user.name}</span>
            <form action={logout}>
              <button className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-brand">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
