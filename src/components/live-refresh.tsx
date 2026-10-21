"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

const FAST_MS = 5000;
const SLOW_EVERY = 6;

/** Renders nothing. Reloads the page's data when a private message arrives (real-time), with polling as a backup. */
export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const live = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const name = `private-user-${userId}`;
    const channel = pusher.subscribe(name);
    channel.bind("pusher:subscription_succeeded", () => {
      live.current = true;
      router.refresh();
    });
    channel.bind("pusher:subscription_error", () => {
      live.current = false;
    });
    channel.bind("update", () => router.refresh());
    pusher.connection.bind("state_change", (states: { current: string }) => {
      if (states.current !== "connected") live.current = false;
    });
    return () => {
      live.current = false;
      channel.unbind_all();
      pusher.unsubscribe(name);
      pusher.disconnect();
    };
  }, [userId, router]);

  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick += 1;
      if (!live.current || tick % SLOW_EVERY === 0) router.refresh();
    }, FAST_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
