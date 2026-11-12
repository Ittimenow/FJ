"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useGameRoomGameType } from "./game-room-header-context";

export function GuideLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roomGameType = useGameRoomGameType();
  const gameType = roomGameType ?? (searchParams.get("gameType") === "202" ? "202" : "101");
  const search = searchParams.toString();
  const returnTo = `${pathname}${search ? `?${search}` : ""}`;
  const href = `/guide?gameType=${gameType}&returnTo=${encodeURIComponent(returnTo)}` as Route;

  return (
    <Link
      href={href}
      aria-label="Правила игры"
      title="Правила игры"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
    >
      <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
    </Link>
  );
}
