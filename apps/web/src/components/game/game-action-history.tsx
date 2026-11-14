"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gamePlayerName } from "@/lib/game-player";
import type { GameEvent, GamePlayer } from "@/lib/types";
import { eventHeadline } from "./game-journal";
import { compactTurnMovement, importantActionEventIds, mergeActionEvents, playerActionTurns } from "./game-action-history.logic";
import { PlayerAvatar } from "./player-avatar";
import { GameActionIcon } from "./game-action-icon";
import "./game-action-history.css";

export function GameActionHistory({ gameId, events, players, onlyPlayerId, viewerPlayerId, currentTurnPlayerId, currentTurnKey, currentAction, currentActionEventId, currentActionPlayerId, prepareEvents, fastTrackOnly = false, gameStatus, loadEarlier, hasEarlierEvents, renderAction, header }: {
  gameId: string;
  events: GameEvent[];
  players: GamePlayer[];
  onlyPlayerId?: string | null;
  viewerPlayerId?: string | null;
  currentTurnPlayerId?: string | null;
  currentTurnKey?: string;
  currentAction?: ReactNode;
  /** The current decision already shows this opening, inside this feed or in an adjacent panel. */
  currentActionEventId?: string;
  currentActionPlayerId?: string | null;
  prepareEvents?: (events: GameEvent[]) => GameEvent[];
  fastTrackOnly?: boolean;
  gameStatus?: string;
  loadEarlier?: (() => Promise<GameEvent[]>) | undefined;
  hasEarlierEvents?: boolean;
  renderAction?: (event: GameEvent, allEvents: GameEvent[], pairedRoll?: GameEvent) => ReactNode;
  header?: ReactNode;
}) {
  const [history, setHistory] = useState(events);
  const [visibleCount, setVisibleCount] = useState(10);
  const [archiveLoaded, setArchiveLoaded] = useState(hasEarlierEvents === undefined ? events.length < 80 : !hasEarlierEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importantOnly, setImportantOnly] = useState(false);
  useEffect(() => {
    setHistory(events);
    setVisibleCount(10);
    setArchiveLoaded(hasEarlierEvents === undefined ? events.length < 80 : !hasEarlierEvents);
    setError(null);
  }, [gameId]);
  useEffect(() => { setHistory((current) => mergeActionEvents(current, events)); }, [events]);
  useEffect(() => { setVisibleCount(10); }, [onlyPlayerId, importantOnly, fastTrackOnly]);
  const importantIds = importantOnly && viewerPlayerId
    ? importantActionEventIds(history, players, viewerPlayerId, gameStatus)
    : undefined;
  const withoutCurrentCard = currentActionEventId
    ? history.filter(event => event.id !== currentActionEventId)
    : history;
  const visibleHistory = prepareEvents ? prepareEvents(withoutCurrentCard) : withoutCurrentCard;
  const turns = playerActionTurns(visibleHistory, players, onlyPlayerId ?? (importantOnly ? viewerPlayerId : null), fastTrackOnly, currentTurnPlayerId, importantIds);
  const currentPlayer = players.find((player) => player.id === currentTurnPlayerId);
  let decisionTurnId: string | null = null;
  if (currentAction && currentPlayer) {
    const latest = turns[0];
    if (latest && !latest.complete && latest.player.id === currentPlayer.id && (!latest.turnKey || latest.turnKey === currentTurnKey)) {
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

  const actionBody = (event: GameEvent, pairedRoll?: GameEvent) => renderAction
    ? renderAction(event, history, pairedRoll)
    : <p className="m-0 text-sm leading-5 text-ink">{pairedRoll ? `${eventHeadline(pairedRoll)} · ` : ""}{eventHeadline(event)}</p>;

  return <section className="game-action-history min-w-0" aria-label={fastTrackOnly ? "История большого круга" : "История действий игроков"}>
    {header}
    {viewerPlayerId ? <div className="game-history-filter">
      <button type="button" aria-label={importantOnly ? "Показать все ходы" : "Показать только важное"} aria-pressed={importantOnly} title={importantOnly ? "Важное" : "Все ходы"} onClick={() => setImportantOnly((value) => !value)} className={`game-history-switch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey ${importantOnly ? "game-history-switch--important" : ""}`}>
        {importantOnly ? <ListFilter size={16} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div> : null}
    <ol className="game-turn-list m-0 list-none p-0" aria-live="polite" aria-busy={loading}>
      {actions.slice(0, visibleCount).map((turn) => {
        const hasDecision = turn.id === decisionTurnId;
        const decisionActor = players.find(player => player.id === currentActionPlayerId) ?? turn.player;
        const ownerDecision = hasDecision && decisionActor.id === turn.player.id;
        const otherActions = [...turn.otherActions];
        if (hasDecision && decisionActor.id !== turn.player.id && !otherActions.some(group => group.player.id === decisionActor.id)) {
          otherActions.push({player:decisionActor,events:[]});
        }
        return <li key={turn.id} data-turn-player-id={turn.player.id} className="game-action-entry min-w-0 border-t-2 border-line pt-4 pb-5 [overflow-wrap:anywhere] first:border-t-0 first:pt-0">
          <TurnPlayer player={turn.player} turnHeading />
          <ol className="game-turn-timeline m-0 list-none p-0">
            {ownerDecision ? <li className="game-turn-event game-turn-decision" aria-label="Текущее решение" data-action-player-id={turn.player.id}><GameActionIcon event={history.find(event=>event.id===currentActionEventId)}/>{currentAction}</li> : null}
            {compactTurnMovement(turn.events).map(({event,roll}) => <li key={event.id} className="game-turn-event" data-action-id={event.id} data-action-player-id={turn.player.id}>
              <GameActionIcon event={event}/>
              {actionBody(event,roll)}
            </li>)}
            {otherActions.flatMap((group, groupIndex) => {
              const entries = compactTurnMovement(group.events);
              const decisionHere = hasDecision && group.player.id === decisionActor.id;
              return [
                ...(decisionHere ? [<li key={`decision-${group.player.id}-${groupIndex}`} className="game-turn-event game-turn-other-action game-turn-decision" aria-label="Текущее решение" data-action-player-id={group.player.id}>
                  <TurnPlayer player={group.player}/>
                  <GameActionIcon event={history.find(event=>event.id===currentActionEventId)}/>
                  {currentAction}
                </li>] : []),
                ...entries.map(({event,roll},index) => <li key={event.id} className="game-turn-event game-turn-other-action" data-action-id={event.id} data-action-player-id={group.player.id}>
                  {index === 0 && !decisionHere ? <TurnPlayer player={group.player}/> : null}
                  <GameActionIcon event={event}/>
                  {actionBody(event,roll)}
                </li>)
              ];
            })}
          </ol>
        </li>;
      })}
    </ol>
    {!actions.length ? <p className="py-3 text-sm text-muted">Действий пока нет.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}. Попробуйте ещё раз.</p> : null}
    {actions.length > visibleCount || canLoadArchive ? <Button type="button" variant="secondary" className="mt-3 min-h-11 w-full" disabled={loading} onClick={() => void showMore()}>{loading ? "Загружаем…" : "Показать ещё"}</Button> : null}
  </section>;
}

function TurnPlayer({ player, turnHeading = false }: { player: GamePlayer; turnHeading?: boolean }) {
  return <div className="mb-2 flex items-center gap-2" data-turn-identity={player.id}>
    <PlayerAvatar player={player} className="h-7 w-7" />
    <span className="min-w-0 break-words text-xs font-extrabold text-ink">{turnHeading ? `Ход: ${gamePlayerName(player)}` : gamePlayerName(player)}</span>
  </div>;
}
