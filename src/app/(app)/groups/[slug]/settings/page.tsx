import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { GroupSettingsForm, ResetInviteForm } from "@/components/group-settings-form";
import { db } from "@/lib/db";
import { isManager } from "@/lib/permissions";

export const metadata: Metadata = { title: "Circle settings" };

export default async function GroupSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
  });
  if (!membership || !isManager(membership.role)) notFound(); // owner and admins only

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/groups/${group.slug}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Circle settings</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        The web address of the circle (/groups/{group.slug}) does not change when you rename it, so existing links
        keep working.
      </p>

      <GroupSettingsForm
        groupId={group.id}
        name={group.name}
        subject={group.subject ?? ""}
        description={group.description ?? ""}
      />

      <section className="mt-10 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Invite link</h2>
        <ResetInviteForm groupId={group.id} />
      </section>
    </div>
  );
}
