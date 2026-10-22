"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A link that tells screen readers (and shows) when it points at the page you are on. */
export function NavLink({
  href,
  className = "",
  activeClassName = "text-brand",
  children,
  ...rest
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${className} ${active ? activeClassName : ""}`} {...rest}>
      {children}
    </Link>
  );
}
