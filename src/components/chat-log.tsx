"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 4000;

/**
 * Scroll box for the messages. It also re-loads the page data every few
 * seconds while the tab is visible, which is how new messages appear
 * without a real-time service.
 */
export function ChatLog({ count, children }: { count: number; children: React.ReactNode }) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  // Poll for new messages while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Stay at the bottom, unless the reader scrolled up to read older messages.
  useEffect(() => {
    const box = boxRef.current;
    if (box && nearBottom.current) box.scrollTop = box.scrollHeight;
  }, [count]);

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
      aria-live="polite"
    >
      {children}
    </div>
  );
}
