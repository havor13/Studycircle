import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { joinGroup } from "@/app/actions/groups";
import { cleanInviteCode } from "@/lib/invite";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode: rawCode } = await params;

  // Forgive a messy paste: extra text after the code, or a whole link.
  const inviteCode = cleanInviteCode(rawCode);
  if (!inviteCode) notFound();
  if (inviteCode !== rawCode) redirect(`/join/${inviteCode}`);

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?redirectTo=/join/${inviteCode}`);

  const group = await db.group.findUnique({
    where: { inviteCode },
    include: { _count: { select: { memberships: true } } },
  });
  if (!group) notFound();

  const existing = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
  });
  if (existing) redirect(`/groups/${group.slug}`);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
      <h1 className="font-display text-2xl font-bold">Join {group.name}?</h1>
      {group.subject && <p className="mt-1 text-muted">{group.subject}</p>}
      <p className="mt-2 text-sm text-muted">{group._count.memberships} members</p>
      {/* A button (not auto-join on load) so link previews can't add anyone by accident. */}
      <form action={joinGroup.bind(null, inviteCode)} className="mt-6">
        <button className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
          Join circle
        </button>
      </form>
    </div>
  );
}
