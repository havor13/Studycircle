import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-display text-xl font-bold">
      <span aria-hidden className="relative inline-block h-6 w-6">
        <span className="absolute inset-0 rounded-full border-[3px] border-brand" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-mark" />
      </span>
      StudyCircle
    </Link>
  );
}
