"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

const FAST_MS = 4000; // polling when real-time is not connected
const SLOW_EVERY = 8; // ...and one refresh in 8 ticks (about 30 seconds) as a safety net when it is

/**
 * Scroll box for the messages.
 * With Pusher keys set, a ping from the server reloads the messages instantly.
 * Without them, or while the connection is down, it falls back to polling every 4 seconds.
 */
export function ChatLog({
  groupId,
  count,
  firstId,
  children,
}: {
  groupId: string;
  count: number;
  firstId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastHeight = useRef(0);
  const lastFirst = useRef(firstId);
  const lastCount = useRef(count);
  const live = useRef(false);

  // Real-time: listen on this circle's private channel.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const channel = pusher.subscribe(`private-circle-${groupId}`);

    channel.bind("pusher:subscription_succeeded", () => {
      live.current = true;
      router.refresh(); // catch anything sent while we were connecting
    });
    channel.bind("pusher:subscription_error", () => {
      live.current = false; // not allowed or not configured: keep polling
    });
    channel.bind("update", () => router.refresh());
    pusher.connection.bind("state_change", (states: { current: string }) => {
      if (states.current !== "connected") live.current = false;
    });

    return () => {
      live.current = false;
      channel.unbind_all();
      pusher.unsubscribe(`private-circle-${groupId}`);
      pusher.disconnect();
    };
  }, [groupId, router]);

  // Backup polling: every 4 seconds without real-time, about every 30 seconds with it.
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick += 1;
      if (!live.current || tick % SLOW_EVERY === 0) router.refresh();
    }, FAST_MS);
    return () => clearInterval(id);
  }, [router]);

  // Stay at the bottom, unless the reader scrolled up to read older messages.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (firstId !== lastFirst.current && count > lastCount.current && lastHeight.current > 0) {
      // Older messages were added above: keep the reader on the message they were looking at.
      box.scrollTop += box.scrollHeight - lastHeight.current;
    } else if (nearBottom.current) {
      box.scrollTop = box.scrollHeight;
    }
    lastFirst.current = firstId;
    lastCount.current = count;
    lastHeight.current = box.scrollHeight;
  }, [count, firstId]);

  function onScroll() {
    const box = boxRef.current;
    if (!box) return;
    nearBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  }

  return (
    <div
      ref={boxRef}
      onScroll={onScroll}
      className="h-[55vh] overflow-y-auto rounded-2xl border border-line bg-surface p-4"
      role="log"
      aria-label="Messages"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
