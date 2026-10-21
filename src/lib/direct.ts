import { db } from "@/lib/db";

export const MAX_DM_LENGTH = 1000;
export const MAX_DM_PER_MINUTE = 20;

/** Private messages are only allowed between people who are in at least one circle together. */
export async function sharesCircle(a: string, b: string) {
  if (a === b) return false;
  const mine = await db.membership.findMany({ where: { userId: a }, select: { groupId: true } });
  if (mine.length === 0) return false;
  const common = await db.membership.findFirst({
    where: { userId: b, groupId: { in: mine.map((m) => m.groupId) } },
    select: { id: true },
  });
  return common !== null;
}
