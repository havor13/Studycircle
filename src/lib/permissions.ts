import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MODERATOR: 1,
  MEMBER: 0,
};

/** OWNER and ADMIN can manage members and see the invite link. */
export const isManager = (role: Role) => role === "OWNER" || role === "ADMIN";

/** OWNER, ADMIN and MODERATOR can pin and delete other people's posts. */
export const canModerate = (role: Role) => ROLE_RANK[role] >= ROLE_RANK.MODERATOR;

/** Roles `actor` may give to someone who currently has the `target` role. */
export function assignableRoles(actor: Role, target: Role): Role[] {
  if (!isManager(actor)) return [];
  if (ROLE_RANK[target] >= ROLE_RANK[actor]) return [];
  return actor === "OWNER" ? ["ADMIN", "MODERATOR", "MEMBER"] : ["MODERATOR", "MEMBER"];
}

/** A manager can remove people who rank below them. */
export function canRemove(actor: Role, target: Role) {
  return isManager(actor) && ROLE_RANK[target] < ROLE_RANK[actor];
}

/**
 * For server actions: confirms the user is logged in AND a member of the circle.
 * Never trust ids that come from the browser without calling this first.
 */
export async function requireMember(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
    include: { group: { select: { slug: true, name: true } } },
  });
  if (!membership) redirect("/dashboard");

  return {
    userId: session.user.id,
    userName: session.user.name ?? "Someone",
    membership,
    slug: membership.group.slug,
    groupName: membership.group.name,
  };
}
