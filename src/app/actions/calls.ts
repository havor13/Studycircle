"use server";

import { revalidatePath } from "next/cache";
import { sendMessage } from "@/app/actions/messages";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { requireMember } from "@/lib/permissions";
import { sendDirectMessage } from "@/app/actions/direct";

export type AnnounceState = { done?: boolean; error?: string };

/**
 * Announces a call in the circle: a chat message, a bell notification for every other member,
 * and a "call started" banner on the circle page and chat for the next two hours.
 */
export async function announceCircleCall(groupId: string): Promise<AnnounceState> {
  const { userId, userName, groupName, slug } = await requireMember(groupId);

  // One announcement per two minutes, so the button cannot be used to spam everyone.
  const group = await db.group.findUnique({ where: { id: groupId }, select: { callStartedAt: true } });
  if (group?.callStartedAt && Date.now() - group.callStartedAt.getTime() < 2 * 60_000) {
    return { error: "A call was just announced. Wait a couple of minutes before announcing again." };
  }

  await db.group.update({ where: { id: groupId }, data: { callStartedAt: new Date(), callStartedByName: userName } });

  const data = new FormData();
  data.set("body", '📞 I started a call. Press "Call" at the top of this chat to join.');
  const result = await sendMessage(groupId, {}, data);
  if (result.error) return { error: result.error };

  const others = await db.membership.findMany({
    where: { groupId, userId: { not: userId } },
    select: { userId: true },
    take: 500,
  });
  await notify(
    others.map((m) => ({
      userId: m.userId,
      actorId: userId,
      groupId,
      kind: "CALL_STARTED" as const,
      message: `${userName} started a call in ${groupName}`,
      link: `/groups/${slug}/call`,
    })),
  );

  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/chat`);
  return { done: true };
}

/** Sends "I started a call" as a private message (same rules: shared circle, not blocked, rate limited). */
export async function announceDirectCall(otherId: string): Promise<AnnounceState> {
  const data = new FormData();
  data.set("body", '📞 I started a call. Press "Call" at the top of this chat to join.');
  const result = await sendDirectMessage(otherId, {}, data);
  return result.error ? { error: result.error } : { done: true };
}
