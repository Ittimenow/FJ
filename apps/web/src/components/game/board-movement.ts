import type { GameEvent } from "@/lib/types";

export const boardStepDuration = 180;

export function boardMove(event: GameEvent, size: number) {
  const { from, to, steps, route } = event.payload;
  if (event.type !== "player:move" || !event.gamePlayer?.id || size < 1 ||
    typeof from !== "number" || !Number.isInteger(from) || from < -1 || from >= size ||
    typeof to !== "number" || !Number.isInteger(to) || to < 0 || to >= size ||
    typeof steps !== "number" || !Number.isInteger(steps) || steps < 1 || steps > size * 3) return null;
  const positions = Array.isArray(route) && route.length === steps &&
    route.every((position) => typeof position === "number" && Number.isInteger(position) && position >= 0 && position < size)
    ? route as number[]
    : Array.from({ length: steps }, (_, index) => (from + index + 1 + size) % size);
  if (positions.at(-1) !== to) return null;
  return { id: event.id, playerId: event.gamePlayer.id, from, positions };
}
