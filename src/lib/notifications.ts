import type { NotificationKind } from "@prisma/client";
import { db } from "@/lib/db";

export type NewNotification = {
  userId: string; // who receives it
  actorId?: string; // who caused it
  groupId: string;
  kind: NotificationKind;
  message: string;
  link: string; // where clicking it goes, e.g. /groups/demo
};

/**
 * Creates one notification per recipient. A failure here is logged and
 * swallowed on purpose: a broken notification must never stop a post, a
 * join or a role change from working.
 */
export async function notify(items: NewNotification[]) {
  if (items.length === 0) return;
  try {
    await db.notification.createMany({ data: items });
  } catch (error) {
    console.error("Could not create notifications", error);
  }
}
