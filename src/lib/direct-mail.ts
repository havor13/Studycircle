import { after } from "next/server";
import { db } from "@/lib/db";
import { appUrl, isDeliverable, mailConfigured, sendMail } from "@/lib/mailer";

/**
 * True when the recipient has no unread message from this sender yet.
 * Call it BEFORE saving the new message: only the first message of an unread streak sends an email,
 * so a busy conversation never floods anyone's inbox.
 */
export async function isFirstUnread(senderId: string, recipientId: string) {
  const unread = await db.directMessage.count({ where: { senderId, recipientId, readAt: null } });
  return unread === 0;
}

/**
 * Emails the recipient that a private message is waiting. The email never contains the message text.
 * Runs after the response is sent; a failure is logged and never breaks sending.
 */
export function emailAboutDirectMessage(senderName: string, senderId: string, recipientId: string) {
  if (!mailConfigured()) return;

  const work = async () => {
    try {
      const to = await db.user.findUnique({
        where: { id: recipientId },
        select: { email: true, emailNotifications: true, emailDirectMessages: true },
      });
      if (!to || !to.emailNotifications || !to.emailDirectMessages || !isDeliverable(to.email)) return;

      const base = appUrl();
      await sendMail({
        to: to.email,
        subject: `${senderName} sent you a private message`,
        text:
          `${senderName} sent you a private message on StudyCircle.\n\n` +
          `Read it: ${base}/messages/${senderId}\n\n` +
          `You get one email for each unread conversation, never one per message.\n` +
          `Turn notification emails off any time: ${base}/account`,
      });
    } catch (error) {
      console.error("Could not send a private-message email", error);
    }
  };

  try {
    after(work);
  } catch {
    void work(); // not inside a request: just run it
  }
}
