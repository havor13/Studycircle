import Link from "next/link";

const SHOW_FOR_MS = 2 * 60 * 60 * 1000;

/**
 * "A call was started" notice. It says when the call was announced, not whether people are still in it,
 * so it disappears after two hours.
 */
export function CallBanner({
  slug,
  startedAt,
  by,
}: {
  slug: string;
  startedAt: Date | null;
  by: string | null;
}) {
  if (!startedAt) return null;
  const age = Date.now() - startedAt.getTime();
  if (age > SHOW_FOR_MS || age < 0) return null;

  const minutes = Math.max(1, Math.round(age / 60_000));
  const when = minutes < 60 ? `${minutes} minute${minutes === 1 ? "" : "s"} ago` : "about an hour ago";

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand bg-brand/10 px-4 py-3">
      <p className="text-sm">
        <span aria-hidden>📞</span> <span className="font-semibold">{by ?? "Someone"}</span> started a call {when}.
      </p>
      <Link
        href={`/groups/${slug}/call`}
        className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Join the call
      </Link>
    </div>
  );
}
