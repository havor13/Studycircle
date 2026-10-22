"use client";

import { useEffect, useRef } from "react";

/** A scroll box that stays at the bottom as messages arrive, unless the reader scrolled up. */
export function ScrollBox({ count, children }: { count: number; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  useEffect(() => {
    const box = boxRef.current;
    if (box && nearBottom.current) box.scrollTop = box.scrollHeight;
  }, [count]);

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
