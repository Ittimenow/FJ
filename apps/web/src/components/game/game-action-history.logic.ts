import type { GameEvent, GamePlayer } from "../../lib/types";
import { isBabyGiftWindowOpen } from "@cashflow/shared";
import { gamePlayerForEvent, gameTurns, playerIdForTurn } from "./game-journal";

const preparationEvents = new Set([
  "player:joined", "player:added", "player:removed", "player:role_changed",
  "player:figurine_selected", "player:dream_chosen"
]);

export function mergeActionEvents(current: GameEvent[], incoming: GameEvent[]) {
  const events = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) events.set(event.id, event);
  return [...events.values()].sort((a, b) => b.sequence - a.sequence);
}

/** One card belongs to the turn owner; other participants stay inside that turn. */
export function playerActionTurns(events: GameEvent[], players: GamePlayer[], onlyPlayerId?: string | null, fastTrackOnly = false, currentPlayerId?: string | null, additionalEventIds?: ReadonlySet<string>) {
  const visibleIds = new Set(playerActionEvents(events, players, onlyPlayerId).map((event) => event.id));
  for (const id of additionalEventIds ?? []) visibleIds.add(id);
  const fastTrackIds = new Set(fastTrackOnly ? playerActionEvents(events, players, null, true).map((event) => event.id) : []);
  const resolved = events.map((event) => {
    const player = gamePlayerForEvent(event, players);
    return player && !event.gamePlayer
      ? { ...event, gamePlayer: { id: player.id, seat: player.seat, role: player.role } }
      : event;
  });
  return gameTurns(resolved).flatMap((turn) => {
    const started = turn.events.some((event) => ["player:roll_dice", "turn:skipped", "bankruptcy:turn_skipped"].includes(event.type));
    const ownerId = !started && !turn.complete && currentPlayerId ? currentPlayerId : playerIdForTurn(turn);
    const player = players.find((item) => item.id === ownerId);
    if (!player) return [];
    const currentFastTrackPreparation = !started && !turn.complete && player.id === currentPlayerId && player.track === "FAST_TRACK";
    if (fastTrackOnly && !currentFastTrackPreparation && !turn.events.some((event) => fastTrackIds.has(event.id) || additionalEventIds?.has(event.id))) return [];
    const visible = turn.events.filter((event) => visibleIds.has(event.id) && (!fastTrackOnly || fastTrackIds.has(event.id) || additionalEventIds?.has(event.id) || !["player:roll_dice", "player:move"].includes(event.type)));
    const otherActions: Array<{ player: GamePlayer; events: GameEvent[] }> = [];
    for (const event of visible) {
      const author = gamePlayerForEvent(event, players);
      if (!author || author.id === ownerId) continue;
      const previous = otherActions[otherActions.length - 1];
      if (previous?.player.id === author.id) previous.events.push(event);
      else otherActions.push({ player: author, events: [event] });
    }
    return [{
      id: turn.id,
      player,
      complete: turn.complete,
      sequence: turn.events[0]?.sequence ?? 0,
      events: visible.filter((event) => gamePlayerForEvent(event, players)?.id === ownerId).reverse(),
      otherActions
    }];
  }).sort((a, b) => b.sequence - a.sequence);
}

/** Events about the viewer that may happen during somebody else's turn. */
export function importantActionEventIds(events: GameEvent[], players: GamePlayer[], viewerPlayerId: string, gameStatus?: string) {
  const ids = new Set<string>();
  const viewer = players.find((player) => player.id === viewerPlayerId);
  const isActiveViewer = viewer?.controller === "HUMAN" && viewer.status === "JOINED";
  const giftedBirthIds = new Set(events.filter((event) => event.type === "player:baby_gift" && event.payload.senderGamePlayerId === viewerPlayerId)
    .map((event) => event.payload.birthEventId));
  for (const event of playerActionEvents(events, players)) {
    if (gamePlayerForEvent(event, players)?.id === viewerPlayerId) {
      ids.add(event.id);
      continue;
    }
    const payload = event.payload;
    if (event.type === "player:baby" && isActiveViewer && gameStatus !== "ENDED" && gameStatus !== "CANCELLED"
      && !giftedBirthIds.has(event.id) && isBabyGiftWindowOpen(events, event.sequence)) {
      ids.add(event.id);
      continue;
    }
    if (event.type === "fast_track:dream_influence" && typeof viewer?.dreamCellIndex === "number"
      && payload.cellIndex === viewer.dreamCellIndex) {
      ids.add(event.id);
      continue;
    }
    if ([payload.recipientGamePlayerId, payload.buyerGamePlayerId, payload.sellerGamePlayerId, payload.previousOwnerId]
      .includes(viewerPlayerId) || [payload.bidderGamePlayerIds, payload.sellerGamePlayerIds]
      .some((value) => Array.isArray(value) && value.includes(viewerPlayerId))) ids.add(event.id);
  }
  return ids;
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
    if (event.type === "state:update" || event.type === "player:fast_track_ready" || event.type.startsWith("game:") || preparationEvents.has(event.type)) return false;
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
