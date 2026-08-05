import { figurineImagePath } from "@cashflow/shared";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";

export function GamePlayerMark({
  player,
  size = "md",
  active = false
}: {
  player: GamePlayer;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}) {
  const name = gamePlayerName(player);
  const figurine = player.figurine ?? player.user?.figurine;
  const avatar = player.user?.avatarUrl;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
        active ? "scale-105" : ""
      ].join(" ")}
      title={active ? `${name}, сейчас ходит` : name}
    >
      {figurine ? (
        <img src={figurineImagePath(figurine)} alt="" className="h-full w-full object-contain" />
      ) : avatar ? (
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
      {active ? (
        <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-action ring-2 ring-white" />
      ) : null}
      <span className="sr-only">{name}{active ? ", сейчас ходит" : ""}</span>
    </span>
  );
}
