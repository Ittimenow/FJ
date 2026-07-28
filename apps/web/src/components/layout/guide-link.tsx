"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";

export function GuideLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const returnTo = `${pathname}${search ? `?${search}` : ""}`;
  const href = `/guide?returnTo=${encodeURIComponent(returnTo)}` as Route;

  return (
    <Link
      href={href}
      aria-label="Правила игры"
      title="Правила игры"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
    >
      <Info className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
