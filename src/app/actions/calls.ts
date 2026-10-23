"use server";

import { sendMessage } from "@/app/actions/messages";
import { sendDirectMessage } from "@/app/actions/direct";

export type AnnounceState = { done?: boolean; error?: string };

/** Posts "I started a call" in the circle chat so the others know to join. */
export async function announceCircleCall(groupId: string): Promise<AnnounceState> {
  const data = new FormData();
  data.set("body", '📞 I started a call. Press "Call" at the top of this chat to join.');
  const result = await sendMessage(groupId, {}, data);
  return result.error ? { error: result.error } : { done: true };
}

/** Sends "I started a call" as a private message (same rules: shared circle, not blocked, rate limited). */
export async function announceDirectCall(otherId: string): Promise<AnnounceState> {
  const data = new FormData();
  data.set("body", '📞 I started a call. Press "Call" at the top of this chat to join.');
  const result = await sendDirectMessage(otherId, {}, data);
  return result.error ? { error: result.error } : { done: true };
}
