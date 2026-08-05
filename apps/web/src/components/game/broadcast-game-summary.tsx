import { CircleDot, Dices, MoveRight, ReceiptText } from "lucide-react";
import { eventCashChange } from "@/components/game/game-event-result";
import {
  eventHeadline,
  latestGameTurn,
  pendingActionLabel,
  playerGameStatus,
  playerIdForTurn,
  visibleTurnEvents
} from "@/components/game/game-journal";
import { GamePlayerMark } from "@/components/game/game-player-mark";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GameEvent, GamePlayer, GameSnapshot } from "@/lib/types";

export function BroadcastGameSummary({ snapshot }: { snapshot: GameSnapshot }) {
  const players = snapshot.players.filter((player) => player.role === "PLAYER");
  const currentPlayer = players.find((player) => player.id === snapshot.game.currentPlayerId);
  const latestTurn = latestGameTurn(snapshot);
  const turnPlayer = players.find((player) => player.id === (latestTurn ? playerIdForTurn(latestTurn) : null));
  const turnEvents = latestTurn ? visibleTurnEvents(latestTurn).slice(-3) : [];
  const cashDelta = latestTurn
    ? latestTurn.events.reduce((sum, event) => sum + (eventCashChange(event)?.deltaCents ?? 0), 0)
    : 0;
  const cashflowDelta = latestTurn
    ? latestTurn.events.reduce((sum, event) => {
        if (event.type !== "card:cashflow_delta") return sum;
        const value = Number(event.payload.amountCents);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0)
    : 0;

  return (
    <section className="broadcast-summary grid h-full min-h-0 grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-3 rounded-2xl bg-[#fff9f1] p-3 text-ink shadow-[0_18px_44px_rgba(57,45,30,.2)]">
      <div className="flex min-h-0 flex-col rounded-xl bg-white p-3 shadow-[0_8px_22px_rgba(23,36,63,.09)]">
        <div className="flex items-center gap-3">
          {currentPlayer ? <GamePlayerMark player={currentPlayer} size="lg" active /> : null}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff0df] px-2 py-1 text-xs font-extrabold text-[#8a3d0a] lg:text-sm">
              <CircleDot size={12} aria-hidden="true" />
              Сейчас ходит
            </div>
            <h2 className="mt-1 truncate text-2xl font-extrabold tracking-[-.025em] lg:text-3xl">
              {currentPlayer ? gamePlayerName(currentPlayer) : "Ожидаем игрока"}
            </h2>
            {currentPlayer ? (
              <p className="truncate text-xs text-muted lg:text-sm">
                {pendingActionLabel(snapshot, currentPlayer) ?? currentPlayer.profession?.name ?? "Профессия не выдана"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 border-t border-line/70 pt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold lg:text-base">{latestTurn?.complete ? "Последний ход" : "Ход в процессе"}</h3>
            {turnPlayer ? <span className="truncate text-xs font-bold text-muted lg:text-sm 2xl:text-base">{gamePlayerName(turnPlayer)}</span> : null}
          </div>
          {turnEvents.length > 0 ? (
            <ol className="mt-2 space-y-1.5">
              {turnEvents.map((event) => <BroadcastEvent key={event.id} event={event} />)}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted">Ожидаем первое действие.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Финансовый результат хода">
            {cashDelta !== 0 || cashflowDelta !== 0 ? (
              <>
              {cashDelta !== 0 ? (
                <FinancialDelta label="Наличные" value={cashDelta} />
              ) : null}
              {cashflowDelta !== 0 ? (
                <FinancialDelta label="Поток" value={cashflowDelta} suffix="/мес" />
              ) : null}
              </>
            ) : (
              <span className="rounded-lg bg-card px-2 py-1 text-xs font-extrabold text-muted lg:text-sm 2xl:text-base">
                Без финансовых изменений
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-xl bg-[#f3eadc] p-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-extrabold lg:text-base">Все игроки</h3>
          <span className="text-xs font-bold text-muted">{players.length}</span>
        </div>
        <div className="mt-2 grid min-h-0 grid-cols-2 gap-2">
          {players.map((player) => (
            <BroadcastPlayer key={player.id} snapshot={snapshot} player={player} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BroadcastEvent({ event }: { event: GameEvent }) {
  const Icon = event.type === "player:roll_dice" ? Dices : event.type === "player:move" ? MoveRight : ReceiptText;
  return (
    <li className="flex items-start gap-2 text-xs leading-4 sm:text-sm sm:leading-5 2xl:text-base">
      <Icon size={14} className="mt-px shrink-0 text-journey" aria-hidden="true" />
      <span className="line-clamp-2">{eventHeadline(event)}</span>
    </li>
  );
}

function BroadcastPlayer({ snapshot, player }: { snapshot: GameSnapshot; player: GamePlayer }) {
  const active = snapshot.game.currentPlayerId === player.id;
  const state = player.financialState;
  const status = playerGameStatus(snapshot, player);
  return (
    <article
      className={[
        "grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-2.5 py-2",
        active
          ? "bg-[#fff0df] shadow-[inset_0_0_0_2px_#f98f2f]"
          : "bg-white shadow-[0_5px_14px_rgba(23,36,63,.06)]"
      ].join(" ")}
    >
      <GamePlayerMark player={player} size="sm" active={active} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center justify-between gap-1">
          <strong className="truncate text-sm xl:text-base">{gamePlayerName(player)}</strong>
          <span className={active ? "shrink-0 text-xs font-extrabold text-[#8a3d0a] xl:text-sm" : "shrink-0 text-xs font-bold text-muted xl:text-sm"}>
            {status}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted xl:text-sm">{player.profession?.name ?? "Без профессии"}</div>
        {state ? (
          <div className="mt-1 flex items-center justify-between gap-2 text-xs tabular-nums xl:text-sm">
            <span>{money(state.cashCents)}</span>
            <strong className={state.monthlyCashflowCents >= 0 ? "text-success" : "text-red-700"}>
              {signedMoney(state.monthlyCashflowCents)}/мес
            </strong>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FinancialDelta({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <span className={[
      "rounded-lg px-2 py-1 text-xs font-extrabold tabular-nums lg:text-sm 2xl:text-base",
      value > 0 ? "bg-green-100 text-success" : "bg-red-50 text-red-700"
    ].join(" ")}>
      {label}: {signedMoney(value)}{suffix}
    </span>
  );
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
}
