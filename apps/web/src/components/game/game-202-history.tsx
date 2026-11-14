"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import { gamePlayerName } from "@/lib/game-player";
import type { GameEvent, GameSnapshot } from "@/lib/types";
import { GameActionHistory } from "./game-action-history";
import { mergeActionEvents } from "./game-action-history.logic";
import { game202TurnContext } from "./game-journal";
import { GamePlayerMark } from "./game-player-mark";
import { prepare202History, currentCardOpening202, isCardOpening202, legacy202HistoryEvents, recordedMovement202 } from "./game-202-history.logic";
import { JournalCard } from "./journal-card";
import { game202CardContent } from "./game-202-card-model";
import { TurnMovement } from "./turn-movement";
import { CashChangeVisualization } from "./cash-change-visualization";
import { eventCashChange } from "./game-event-result";
import { money202 } from "./financial-presentation";

function financialResult(event: GameEvent) {
  const cash = eventCashChange(event), flow = event.payload.cashflowChangeCents;
  const hasFlow = typeof flow === "number" && Number.isFinite(flow) && flow !== 0;
  if (!cash?.deltaCents && !hasFlow) return null;
  return <div>
    {cash ? <CashChangeVisualization change={cash} formatMoney={money202}/> : null}
    {hasFlow ? <p className="m-0 text-sm leading-6 font-medium">Денежный поток {flow>0?"+":""}{money202(flow)}/мес.</p> : null}
  </div>;
}

/** The same turn cards as 101, backed by explicit 202 turn metadata and the durable replay archive. */
export function Game202History({ snapshot, token, viewerPlayerId, currentAction, currentCardSlug, currentActionPlayerId }: {
  snapshot: GameSnapshot;
  token: string;
  viewerPlayerId?: string | null;
  currentAction?: ReactNode;
  currentCardSlug?: string;
  currentActionPlayerId?: string | null;
}) {
  const [history, setHistory] = useState(snapshot.events);
  const [legacyCount, setLegacyCount] = useState(10);
  useEffect(() => {
    setHistory(snapshot.events);
    setLegacyCount(10);
  }, [snapshot.game.id]);
  useEffect(() => {
    setHistory(previous => mergeActionEvents(previous, snapshot.events));
  }, [snapshot.events]);

  const state = snapshot.game202;
  if (!state) return null;
  const current = state.players[state.current];
  const currentTurnKey = current ? `${current.id}:${current.turns}` : undefined;
  const editionEvents = history.filter(event => event.type === "game202:action");
  const groupedEvents = editionEvents.filter(event => game202TurnContext(event));
  const preparation = editionEvents.filter(event => event.payload.kind === "setup");
  const legacy = prepare202History(legacy202HistoryEvents(editionEvents, state.log, snapshot.players, snapshot.game.id));
  const currentOpening = currentCardOpening202(editionEvents, currentCardSlug, currentTurnKey);

  async function loadEarlier() {
    const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/replay`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Не удалось загрузить историю партии");
    const data = await response.json() as { events: GameEvent[] };
    setHistory(previous => mergeActionEvents(previous, data.events));
    return data.events.filter(event => game202TurnContext(event));
  }

  const action = (event: GameEvent): ReactNode => {
    const movement = recordedMovement202(event);
    if (movement) return <TurnMovement {...movement}/>;
    if (event.payload.commandType === "roll") return <span title="Результат броска отсутствует в этой сохранённой записи"><TurnMovement diceValues={[]}/></span>;
    const card = typeof event.payload.slug === "string"
      ? snapshot.cards202?.find(item => item.slug === event.payload.slug)
      : null;
    const text = typeof event.payload.text === "string" ? event.payload.text : "Действие игрока";
    if (card && isCardOpening202(event)) {
      return <div data-card-slug={card.slug}><JournalCard {...game202CardContent(card)}/></div>;
    }
    const result = financialResult(event);
    if(event.payload.effectType==="financial_result")return result;
    const hasCardInTurn = card && game202TurnContext(event) && editionEvents.some(opening => isCardOpening202(opening)
      && opening.payload.slug === card.slug && opening.payload.turnKey === event.payload.turnKey);
    return <div className="min-w-0 text-sm leading-6">
      <p className="m-0">{text}{card && !hasCardInTurn ? ` — ${card.title}` : ""}</p>
      {result}
      {typeof event.payload.explanation === "string" ? <p className="m-0 text-xs text-muted">{event.payload.explanation}</p> : null}
      {event.payload.kind === "command" && typeof event.payload.quantity === "number" && event.payload.commandType !== "roll"
        ? <p className="m-0 text-xs text-muted">Количество: {event.payload.quantity}</p> : null}
      {event.payload.kind === "command" && event.payload.taskKind !== "auction" && typeof event.payload.amountCents === "number" && !result
        ? <p className="m-0 text-xs text-muted">Сумма: {money202(event.payload.amountCents)}</p> : null}
    </div>;
  };

  const archiveRow = (event: GameEvent) => {
    const player = snapshot.players.find(item => item.id === event.gamePlayer?.id);
    return <li key={event.id} className="flex items-start gap-2 border-b border-line/70 py-3 last:border-b-0">
      {player ? <GamePlayerMark player={player} size="sm" /> : null}
      <div className="min-w-0">
        {player ? <p className="mb-1 text-xs font-bold">{gamePlayerName(player)}</p> : null}
        {action(event)}
      </div>
    </li>;
  };

  return <div className="min-w-0 space-y-5">
    <GameActionHistory
      gameId={snapshot.game.id}
      events={groupedEvents}
      players={snapshot.players}
      viewerPlayerId={viewerPlayerId ?? null}
      currentTurnPlayerId={current?.id ?? null}
      {...(currentTurnKey ? { currentTurnKey } : {})}
      currentAction={currentAction}
      {...(currentActionPlayerId ? {currentActionPlayerId} : {})}
      prepareEvents={prepare202History}
      {...(currentOpening ? { currentActionEventId: currentOpening.id } : {})}
      gameStatus={snapshot.game.status}
      hasEarlierEvents={snapshot.events.length >= 80}
      loadEarlier={loadEarlier}
      renderAction={action}
    />
    {preparation.length ? <details className="border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-bold">Подготовка партии</summary>
      <ol className="mt-2 list-none p-0">{[...preparation].sort((a, b) => a.sequence - b.sequence).map(archiveRow)}</ol>
    </details> : null}
    {legacy.length ? <details className="border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-bold">Ранняя история партии</summary>
      <p className="mt-3 text-sm leading-6 text-muted">Эти события сохранены без границ ходов и показаны от новых к старым.</p>
      <ol className="mt-2 list-none p-0">{legacy.slice(0, legacyCount).map(archiveRow)}</ol>
      {legacy.length > legacyCount ? <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => setLegacyCount(count => count + 10)}>Показать ещё события</Button> : null}
    </details> : null}
  </div>;
}
