import Pusher from "pusher";

/** Server-side Pusher client, or null when the keys are not set (chat then falls back to polling). */
function createPusher() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;
  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

const globalForPusher = globalThis as unknown as { pusher?: Pusher | null };
export const pusher = globalForPusher.pusher ?? createPusher();
if (process.env.NODE_ENV !== "production") globalForPusher.pusher = pusher;

export const chatChannel = (groupId: string) => `private-circle-${groupId}`;

/**
 * Tells everyone viewing this circle's chat to reload. The event carries NO message
 * text: the browsers re-read the messages from our own database, so the existing
 * membership checks still decide who sees what. A failure here never breaks the
 * real action, because the 30-second backup refresh will catch up.
 */
export async function pingChat(groupId: string) {
  if (!pusher) return;
  try {
    await pusher.trigger(chatChannel(groupId), "update", {});
  } catch (error) {
    console.error("Pusher trigger failed", error);
  }
}

export const userChannel = (userId: string) => `private-user-${userId}`;

/** Tells one person's open pages (inbox, private chat) to reload. Carries no message text. */
export async function pingUser(userId: string) {
  if (!pusher) return;
  try {
    await pusher.trigger(userChannel(userId), "update", {});
  } catch (error) {
    console.error("Pusher trigger failed", error);
  }
}
