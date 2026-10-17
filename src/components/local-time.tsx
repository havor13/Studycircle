"use client";

import { useEffect, useState } from "react";

// Starts with a fixed UTC label (same on server and browser, so no hydration
// mismatch), then switches to the viewer's own time zone once mounted.
export function LocalTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(
    () =>
      new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC",
  );

  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [iso]);

  return <time dateTime={iso}>{label}</time>;
}
