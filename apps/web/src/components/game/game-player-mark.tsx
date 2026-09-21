"use client";

import { figurineImagePath } from "@cashflow/shared";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";

export function GamePlayerMark({
  player,
  size = "md",
  active = false,
  className = ""
}: {
  player: GamePlayer;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
}) {
  const name = gamePlayerName(player);
  const figurine = player.figurine ?? player.user?.figurine;
  const avatar = player.user?.avatarUrl;
  const imageUrl = figurine ? figurineImagePath(figurine) : avatar;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const sizeClass = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-xs",
    lg: "h-14 w-14 text-sm"
  }[size];

  return (
    <span
      className={[
        "relative grid shrink-0 place-items-center",
        sizeClass,
        figurine
          ? ""
          : "overflow-hidden rounded-full bg-journey font-extrabold text-white shadow-[0_6px_16px_rgba(27,57,118,.2)]",
        active ? "scale-105" : "",
        className
      ].join(" ")}
      title={active ? `${name}, сейчас ходит` : name}
      data-player-id={player.id}
      data-figurine={figurine ?? undefined}
    >
      {imageUrl && imageUrl !== failedUrl ? (
        <img src={imageUrl} alt="" className={`h-full w-full ${figurine ? "object-contain" : "object-cover"}`} onError={() => setFailedUrl(imageUrl)} />
      ) : (
        <UserRound className="h-2/3 w-2/3" aria-hidden="true" />
      )}
      {active ? (
        <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-action ring-2 ring-white" />
      ) : null}
      <span className="sr-only">{name}{active ? ", сейчас ходит" : ""}</span>
    </span>
  );
}
