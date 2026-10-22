import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [unread, unreadDm, me] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
    db.directMessage.count({ where: { recipientId: session.user.id, readAt: null } }),
    db.user.findUnique({ where: { id: session.user.id }, select: { image: true } }),
  ]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <Logo href="/dashboard" />
            <nav aria-label="Main" className="flex gap-4 text-sm font-semibold sm:gap-6">
              <NavLink href="/dashboard" className="hover:text-brand">Dashboard</NavLink>
              <NavLink href="/discover" className="hover:text-brand">Find circles</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NavLink
              href="/messages"
              activeClassName="border-brand"
              aria-label={unreadDm > 0 ? `Private messages, ${unreadDm} unread` : "Private messages"}
              className="relative rounded-lg border border-line px-3 py-1.5 hover:border-brand"
            >
              <span aria-hidden="true">✉️</span>
              {unreadDm > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold text-white">
                  {unreadDm > 99 ? "99+" : unreadDm}
                </span>
              )}
            </NavLink>
            <NavLink
              href="/notifications"
              activeClassName="border-brand"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative rounded-lg border border-line px-3 py-1.5 hover:border-brand"
            >
              <span aria-hidden="true">🔔</span>
              {unread > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </NavLink>
            <Link
              href="/account"
              aria-label="Your account"
              className="flex items-center gap-2 text-muted hover:text-brand"
            >
              <Avatar userId={session.user.id} name={session.user.name ?? "?"} image={me?.image} size={30} />
              <span className="hidden sm:inline">{session.user.name}</span>
            </Link>
            <form action={logout}>
              <button className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-brand">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
