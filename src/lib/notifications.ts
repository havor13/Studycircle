import { after } from "next/server";
import type { NotificationKind } from "@prisma/client";
import { db } from "@/lib/db";
import { appUrl, isDeliverable, mailConfigured, sendMail } from "@/lib/mailer";

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

  // Emails go out after the response is sent, so they never slow a post or a join down.
  if (!mailConfigured()) return;
  try {
    after(() => emailRecipients(items));
  } catch {
    // Not inside a request (should not happen): send now instead.
    await emailRecipients(items);
  }
}

// Reactions would be too noisy by email. The bell still shows them.
const EMAIL_KINDS = new Set<NotificationKind>(["NEW_POST", "NEW_EVENT", "ROLE_CHANGED", "MEMBER_JOINED"]);
const MAX_EMAILS_PER_EVENT = 25;

async function emailRecipients(items: NewNotification[]) {
  try {
    const wanted = items.filter((item) => EMAIL_KINDS.has(item.kind)).slice(0, MAX_EMAILS_PER_EVENT);
    if (wanted.length === 0) return;

    const users = await db.user.findMany({
      where: { id: { in: wanted.map((item) => item.userId) }, emailNotifications: true },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((user) => [user.id, user.email]));
    const base = appUrl();

    await Promise.allSettled(
      wanted.map((item) => {
        const to = emailById.get(item.userId);
        if (!to || !isDeliverable(to)) return Promise.resolve();
        return sendMail({
          to,
          subject: item.message,
          text:
            `${item.message}\n\nOpen it: ${base}${item.link}\n\n` +
            `You get this email because notification emails are on for your StudyCircle account.\n` +
            `Turn them off any time: ${base}/account`,
        });
      }),
    );
  } catch (error) {
    console.error("Could not send notification emails", error);
  }
}
