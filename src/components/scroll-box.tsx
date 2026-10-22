"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/** A scroll box that stays at the bottom as messages arrive, unless the reader scrolled up. */
export function ScrollBox({ count, firstId, children }: { count: number; firstId?: string; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastHeight = useRef(0);
  const lastFirst = useRef(firstId);
  const lastCount = useRef(count);

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

  return (
    <div
      ref={boxRef}
      onScroll={() => {
        const box = boxRef.current;
        if (box) nearBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      }}
      className="h-[55vh] overflow-y-auto rounded-2xl border border-line bg-surface p-4"
      role="log"
      aria-label="Messages"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
