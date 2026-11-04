import type { GameEvent } from "@/lib/types";

/** A timed-out acknowledgement can arrive after the server has already applied the action. */
export function recoveredActionEvents(command: string, events: GameEvent[], previousSequence: number, playerId: string | null) {
  const expectedType = command === "player:roll_dice" ? "player:roll_dice"
    : command === "turn:skip" ? "turn:skipped"
      : null;
  if (!expectedType || !playerId) return null;
  const fresh = events.filter((event) => event.sequence > previousSequence);
  if (!fresh.some((event) => event.type === expectedType && event.gamePlayer?.id === playerId)) return null;
  return fresh.map((event) => ({ type: event.type, payload: event.payload }));
}
