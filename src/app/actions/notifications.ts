"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function markAllRead() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  // "layout" so the unread badge in the header refreshes too.
  revalidatePath("/", "layout");
}

/** Marks one notification as read, then goes to the page it points at. */
export async function openNotification(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // The userId in the filter means you can only open your own notifications.
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId: session.user.id },
  });
  if (!notification) redirect("/notifications");

  if (!notification.readAt) {
    await db.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  revalidatePath("/", "layout");
  redirect(notification.link);
}
