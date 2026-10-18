"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { joinGroup } from "@/app/actions/groups";
import { isManager, requireMember } from "@/lib/permissions";

/**
 * Join a circle that appears in Find circles. Only circles an admin has listed can be joined this way;
 * every other circle still needs its invite link.
 */
export async function joinListedGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?redirectTo=/discover");

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { inviteCode: true, listed: true },
  });
  if (!group || !group.listed) redirect("/discover");

  // Reuses the normal join: no downgrade of existing members, and the admins get told.
  return joinGroup(group.inviteCode);
}

/** An owner or admin lists or hides their circle in Find circles. */
export async function setListed(groupId: string, listed: boolean) {
  const { membership, slug } = await requireMember(groupId);
  if (!isManager(membership.role)) return;

  await db.group.update({ where: { id: groupId }, data: { listed } });
  revalidatePath(`/groups/${slug}`);
  revalidatePath("/discover");
}
