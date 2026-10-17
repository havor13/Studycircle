"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { assignableRoles, canRemove, requireMember } from "@/lib/permissions";

export async function changeRole(groupId: string, targetUserId: string, formData: FormData) {
  const { userId, membership, groupName, slug } = await requireMember(groupId);
  if (targetUserId === userId) return;

  const target = await db.membership.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target) return;

  const role = formData.get("role") as Role;
  if (!assignableRoles(membership.role, target.role).includes(role)) return;
  if (role === target.role) return;

  await db.membership.update({ where: { id: target.id }, data: { role } });
  await notify([
    {
      userId: targetUserId,
      actorId: userId,
      groupId,
      kind: "ROLE_CHANGED" as const,
      message: `Your role in ${groupName} is now ${role.toLowerCase()}`,
      link: `/groups/${slug}`,
    },
  ]);
  revalidatePath(`/groups/${slug}`);
}

export async function removeMember(groupId: string, targetUserId: string) {
  const { userId, membership, slug } = await requireMember(groupId);
  if (targetUserId === userId) return;

  const target = await db.membership.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target || !canRemove(membership.role, target.role)) return;

  await db.membership.delete({ where: { id: target.id } });
  revalidatePath(`/groups/${slug}`);
}

export async function leaveGroup(groupId: string) {
  const { membership } = await requireMember(groupId);
  // The owner can't leave, otherwise the circle would have nobody in charge.
  if (membership.role === "OWNER") return;

  await db.membership.delete({ where: { id: membership.id } });
  redirect("/dashboard");
}

/**
 * The current owner hands the circle to another member.
 * The old owner becomes an ADMIN, so there is always exactly one owner.
 */
export async function transferOwnership(groupId: string, targetUserId: string) {
  const { userId, membership, groupName, slug } = await requireMember(groupId);
  if (membership.role !== "OWNER" || targetUserId === userId) return;

  const target = await db.membership.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target) return;

  // Both changes happen in one transaction. The demotion only matches while
  // you are still the owner, so a double click cannot create two owners.
  const transferred = await db.$transaction(async (tx) => {
    const demoted = await tx.membership.updateMany({
      where: { id: membership.id, role: "OWNER" },
      data: { role: "ADMIN" },
    });
    if (demoted.count !== 1) return false;

    await tx.membership.update({ where: { id: target.id }, data: { role: "OWNER" } });
    return true;
  });

  if (transferred) {
    await notify([
      {
        userId: targetUserId,
        actorId: userId,
        groupId,
        kind: "ROLE_CHANGED" as const,
        message: `You are now the owner of ${groupName}`,
        link: `/groups/${slug}`,
      },
    ]);
  }

  revalidatePath(`/groups/${slug}`);
}
