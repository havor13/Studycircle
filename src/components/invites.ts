"use server";

import { db } from "@/lib/db";
import { MAX_INVITES_PER_DAY, REINVITE_DAYS, parseEmailList } from "@/lib/invite-emails";
import { appUrl, isDeliverable, mailConfigured, sendMail } from "@/lib/mailer";
import { isManager, requireMember } from "@/lib/permissions";

export type InviteState = {
  error?: string;
  /** How many invitations went out. */
  sent?: number;
  /** Plain-language notes about addresses that were skipped. */
  notes?: string[];
};

const DAY = 24 * 60 * 60 * 1000;

export async function sendInvites(
  groupId: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { userId, userName, groupName, membership } = await requireMember(groupId);
  if (!isManager(membership.role)) return { error: "Only owners and admins can send invitations." };
  if (!mailConfigured()) return { error: "Email is not set up on this server yet." };

  const { valid, invalid, tooMany } = parseEmailList(String(formData.get("emails") ?? ""));
  if (valid.length === 0) {
    return {
      error: invalid.length
        ? `That does not look like an email address: ${invalid[0]}`
        : "Type at least one email address.",
    };
  }

  // Daily limits protect the sending Gmail account from being used for spam.
  const since = new Date(Date.now() - DAY);
  const [forGroup, byMe] = await Promise.all([
    db.inviteEmail.count({ where: { groupId, createdAt: { gte: since } } }),
    db.inviteEmail.count({ where: { invitedById: userId, createdAt: { gte: since } } }),
  ]);
  const room = MAX_INVITES_PER_DAY - Math.max(forGroup, byMe);
  if (room <= 0) {
    return { error: `Daily limit reached (${MAX_INVITES_PER_DAY} invitations in 24 hours). Try again tomorrow, or share the link.` };
  }

  const notes: string[] = [];
  if (tooMany) notes.push("Only the first 5 addresses were used. Send the rest in a second batch.");
  for (const bad of invalid) notes.push(`Skipped "${bad}": not a valid email address.`);

  // Drop people who are already members, or who were invited recently.
  const [members, recent] = await Promise.all([
    db.membership.findMany({
      where: { groupId, user: { email: { in: valid } } },
      select: { user: { select: { email: true } } },
    }),
    db.inviteEmail.findMany({
      where: { groupId, email: { in: valid }, createdAt: { gte: new Date(Date.now() - REINVITE_DAYS * DAY) } },
      select: { email: true },
    }),
  ]);
  const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()));
  const recentEmails = new Set(recent.map((r) => r.email));

  const group = await db.group.findUnique({ where: { id: groupId }, select: { inviteCode: true } });
  if (!group) return { error: "Circle not found." };
  const link = `${appUrl()}/join/${group.inviteCode}`;

  const toSend: string[] = [];
  for (const email of valid) {
    if (memberEmails.has(email)) notes.push(`${email} is already in this circle.`);
    else if (recentEmails.has(email)) notes.push(`${email} was already invited this week.`);
    else if (!isDeliverable(email)) notes.push(`Skipped ${email}: that address cannot receive email.`);
    else toSend.push(email);
  }

  let sent = 0;
  for (const email of toSend.slice(0, room)) {
    const result = await sendMail({
      to: email,
      subject: `${userName} invited you to join ${groupName} on StudyCircle`,
      text:
        `${userName} invited you to join the study circle "${groupName}" on StudyCircle.\n\n` +
        `Open this link, log in or create a free account, and press "Join circle":\n${link}\n\n` +
        `If you do not know ${userName}, you can ignore this email. Nothing happens unless you join.`,
    });
    if (result.ok) {
      sent += 1;
      await db.inviteEmail.create({ data: { groupId, invitedById: userId, email } });
    } else {
      notes.push(`Could not send to ${email}: ${result.error}`);
      if (/refused the login|not set up/i.test(result.error)) break; // same failure for everyone
    }
  }
  if (toSend.length > room) notes.push(`Daily limit: ${toSend.length - room} address(es) were not sent.`);

  if (sent === 0 && notes.length === 0) return { error: "Nothing was sent." };
  return { sent, notes };
}
