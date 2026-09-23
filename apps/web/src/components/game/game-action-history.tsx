"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { gamePlayerName } from "@/lib/game-player";
import type { GameEvent, GamePlayer } from "@/lib/types";
import { eventHeadline } from "./game-journal";
import { mergeActionEvents, playerActionTurns } from "./game-action-history.logic";
import { PlayerAvatar } from "./player-avatar";
import "./game-action-history.css";

export function GameActionHistory({ gameId, events, players, onlyPlayerId, viewerPlayerId, currentTurnPlayerId, currentTurnKey, currentAction, fastTrackOnly = false, loadEarlier, renderAction, header }: {
  gameId: string;
  events: GameEvent[];
  players: GamePlayer[];
  onlyPlayerId?: string | null;
  viewerPlayerId?: string | null;
  currentTurnPlayerId?: string | null;
  currentTurnKey?: string;
  currentAction?: ReactNode;
  fastTrackOnly?: boolean;
  loadEarlier?: (() => Promise<GameEvent[]>) | undefined;
  renderAction?: (event: GameEvent, allEvents: GameEvent[]) => ReactNode;
  header?: ReactNode;
}) {
  const [history, setHistory] = useState(events);
  const [visibleCount, setVisibleCount] = useState(10);
  const [archiveLoaded, setArchiveLoaded] = useState(events.length < 80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  useEffect(() => {
    setHistory(events);
    setVisibleCount(10);
    setArchiveLoaded(events.length < 80);
    setError(null);
  }, [gameId]);
  useEffect(() => { setHistory((current) => mergeActionEvents(current, events)); }, [events]);
  useEffect(() => { setVisibleCount(10); }, [onlyPlayerId, onlyMine, fastTrackOnly]);
  const turns = playerActionTurns(history, players, onlyPlayerId ?? (onlyMine ? viewerPlayerId : null), fastTrackOnly, currentTurnPlayerId);
  const currentPlayer = players.find((player) => player.id === currentTurnPlayerId);
  let decisionTurnId: string | null = null;
  if (currentAction && currentPlayer) {
    const latest = turns[0];
    if (latest && !latest.complete && latest.player.id === currentPlayer.id) {
      decisionTurnId = latest.id;
    } else {
      decisionTurnId = `current-${gameId}-${currentTurnKey ?? currentPlayer.id}`;
      turns.unshift({ id: decisionTurnId, player: currentPlayer, complete: false, sequence: Infinity, events: [], otherActions: [] });
    }
  }
  const actions = turns.filter((turn) => turn.id === decisionTurnId || turn.events.length || turn.otherActions.length);
  const canLoadArchive = !archiveLoaded && Boolean(loadEarlier);

  async function showMore() {
    if (loading) return;
    setError(null);
    if (actions.length > visibleCount) {
      setVisibleCount((count) => count + 10);
      return;
    }
    if (!canLoadArchive || !loadEarlier) return;
    setLoading(true);
    try {
      const earlier = await loadEarlier();
      setHistory((current) => mergeActionEvents(current, earlier));
      setArchiveLoaded(true);
      setVisibleCount((count) => count + 10);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить историю партии");
    } finally { setLoading(false); }
  }

  const actionBody = (event: GameEvent) => renderAction
    ? renderAction(event, history)
    : <p className="m-0 text-sm leading-5 text-ink">{eventHeadline(event)}</p>;

  return <section className="game-action-history min-w-0" aria-label={fastTrackOnly ? "История большого круга" : "История действий игроков"}>
    {header}
    {viewerPlayerId ? <div className="game-history-filter mb-3 flex flex-wrap justify-end gap-1" role="group" aria-label="Фильтр истории действий">
      {[{ mine: true, label: "Только свои" }, { mine: false, label: "Все игроки" }].map(({ mine, label }) => <button key={label} type="button" aria-pressed={onlyMine === mine} onClick={() => setOnlyMine(mine)} className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey ${onlyMine === mine ? "bg-journey text-white" : "bg-surface text-ink hover:bg-line/50"}`}>{label}</button>)}
    </div> : null}
    <ol className="game-turn-list m-0 list-none space-y-3 p-0" aria-live="polite" aria-busy={loading}>
      {actions.slice(0, visibleCount).map((turn) => <li key={turn.id} data-turn-player-id={turn.player.id} className="game-action-entry min-w-0 rounded-xl bg-surface p-3 [overflow-wrap:anywhere]">
        <TurnPlayer player={turn.player} />
        <ol className="game-turn-timeline m-0 list-none p-0">
          {turn.id === decisionTurnId ? <li className="game-turn-event game-turn-decision" aria-label="Текущее решение">{currentAction}</li> : null}
          {turn.events.map((event) => <li key={event.id} className="game-turn-event" data-action-id={event.id} data-action-player-id={turn.player.id}>
            {actionBody(event)}
          </li>)}
          {turn.otherActions.flatMap((group) => group.events.map((event, index) => <li key={event.id} className="game-turn-event game-turn-other-action" data-action-id={event.id} data-action-player-id={group.player?.id}>
            {index === 0 && group.player ? <TurnPlayer player={group.player} /> : null}
            {actionBody(event)}
          </li>))}
        </ol>
      </li>)}
    </ol>
    {!actions.length ? <p className="py-3 text-sm text-muted">Действий пока нет.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}. Попробуйте ещё раз.</p> : null}
    {actions.length > visibleCount || canLoadArchive ? <Button type="button" variant="secondary" className="mt-3 min-h-11 w-full" disabled={loading} onClick={() => void showMore()}>{loading ? "Загружаем…" : "Показать ещё"}</Button> : null}
  </section>;
}

function TurnPlayer({ player }: { player: GamePlayer }) {
  return <div className="mb-2 flex items-center gap-2" data-turn-identity={player.id}>
    <PlayerAvatar player={player} className="h-7 w-7" />
    <span className="min-w-0 break-words text-xs font-extrabold text-ink">{gamePlayerName(player)}</span>
  </div>;
}
