import type { GameEvent, GamePlayer } from "../../lib/types";
import { gamePlayerForEvent, gameTurns, groupTurnEventsByPlayer } from "./game-journal";

const preparationEvents = new Set([
  "player:joined", "player:added", "player:removed", "player:role_changed",
  "player:figurine_selected", "player:dream_chosen"
]);

export function mergeActionEvents(current: GameEvent[], incoming: GameEvent[]) {
  const events = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) events.set(event.id, event);
  return [...events.values()].sort((a, b) => b.sequence - a.sequence);
}

/** Group before filtering so another player's turn still separates my actions. */
export function playerActionTurns(events: GameEvent[], players: GamePlayer[], onlyPlayerId?: string | null, fastTrackOnly = false) {
  const visibleIds = new Set(playerActionEvents(events, players, onlyPlayerId, fastTrackOnly).map((event) => event.id));
  const resolved = events.map((event) => {
    const player = gamePlayerForEvent(event, players);
    return player && !event.gamePlayer
      ? { ...event, gamePlayer: { id: player.id, seat: player.seat, role: player.role } }
      : event;
  });
  return gameTurns(resolved).flatMap((turn) =>
    groupTurnEventsByPlayer(turn.events.filter((event) => visibleIds.has(event.id)).reverse(), players)
      .filter((group) => group.player)
      .map((group) => ({ id: `${turn.id}-${group.key}`, player: group.player!, events: group.events }))
  ).sort((a, b) => b.events[0]!.sequence - a.events[0]!.sequence);
}

export function playerActionEvents(events: GameEvent[], players: GamePlayer[], onlyPlayerId?: string | null, fastTrackOnly = false) {
  const fastTrackEntries = new Map<string, number>();
  if (fastTrackOnly) {
    for (const event of events) {
      if (event.type !== "player:escaped_rat_race") continue;
      const player = gamePlayerForEvent(event, players);
      if (player) fastTrackEntries.set(player.id, event.sequence);
    }
  }
  return mergeActionEvents([], events).filter((event) => {
    if (event.type === "state:update" || event.type.startsWith("game:") || preparationEvents.has(event.type)) return false;
    const player = gamePlayerForEvent(event, players);
    if (!player || (onlyPlayerId && player.id !== onlyPlayerId)) return false;
    if (!fastTrackOnly) return true;
    if (event.payload.track === "FAST_TRACK" || event.type.startsWith("fast_track:") || event.type === "player:escaped_rat_race") return true;
    // Skipped turns have no track in their payload. Use the track at the time
    // of the event, never the player's current track for older history.
    if (event.type !== "turn:skipped" || event.payload.track === "RAT_RACE") return false;
    const entrySequence = fastTrackEntries.get(player.id);
    if (entrySequence !== undefined) return event.sequence > entrySequence;
    const enteredAt = player.financialState?.escapedRatRaceAt;
    return Boolean(enteredAt && Date.parse(event.createdAt) >= Date.parse(enteredAt));
  });
}
