import type { GameEvent, GamePlayer } from "../../lib/types";
import { gamePlayerForEvent } from "./game-journal";

const preparationEvents = new Set([
  "player:joined", "player:added", "player:removed", "player:role_changed",
  "player:figurine_selected", "player:dream_chosen"
]);

export function mergeActionEvents(current: GameEvent[], incoming: GameEvent[]) {
  const events = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) events.set(event.id, event);
  return [...events.values()].sort((a, b) => b.sequence - a.sequence);
}

export function playerActionEvents(events: GameEvent[], players: GamePlayer[], onlyPlayerId?: string | null) {
  return mergeActionEvents([], events).filter((event) => {
    if (event.type === "state:update" || event.type.startsWith("game:") || preparationEvents.has(event.type)) return false;
    const player = gamePlayerForEvent(event, players);
    return Boolean(player && (!onlyPlayerId || player.id === onlyPlayerId));
  });
}
