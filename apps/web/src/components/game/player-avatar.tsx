"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlayerAvatar({ player, className }: { player: GamePlayer; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = player.user?.avatarUrl;
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8effe] text-journey", className)} role="img" aria-label={`Аватар: ${gamePlayerName(player)}`}>
      {url && url !== failedUrl ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(url)} />
      ) : <UserRound className="h-2/3 w-2/3" aria-hidden="true" />}
    </span>
  );
}
