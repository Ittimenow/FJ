"use client";

import { canEscapeRatRace, fastTrackCells, outstandingBankLoanBalanceCents } from "@cashflow/shared";
import { Orbit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";
import { GamePlayerMark } from "./game-player-mark";

export function OtherPlayersList({ players, currentPlayerId, className = "" }: {
  players: GamePlayer[];
  currentPlayerId: string | null;
  className?: string;
}) {
  const others = players.filter((player) => player.role === "PLAYER");
  return <section className={className} aria-label="Остальные игроки">
    <h3 className="text-sm font-semibold">Остальные игроки</h3>
    {others.length === 0 ? <p className="mt-2 text-sm text-neutral-500">Других игроков пока нет.</p> : (
      <ul className="mt-3 space-y-2">
        {others.map((player) => {
          const state = player.financialState;
          const fastTrack = player.track === "FAST_TRACK";
          return <li key={player.id} className="min-w-0 rounded-md bg-surface p-3" data-other-player={player.id}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
              <GamePlayerMark player={player} size="sm" className="h-10 w-10" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="min-w-0 truncate">{gamePlayerName(player)}</span>
                  {fastTrack ? <span role="img" aria-label="Большой круг" title="Большой круг" className="shrink-0 text-journey"><Orbit size={17} aria-hidden="true" /></span> : null}
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500">{player.profession?.name ?? "Профессия не выдана"}</div>
              </div>
              {state?.wonAt ? <Badge className="bg-green-100 text-success">победитель</Badge> : currentPlayerId === player.id ? <Badge className="bg-green-100 text-success">ходит</Badge> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-neutral-500">
              {player.seat ? <span>Место {player.seat}</span> : null}
              <span>{fastTrack ? "Большой круг" : "Малый круг"}</span>
              {state ? <>
                <span>Наличные {money(state.cashCents)}</span>
                <span>{fastTrack ? `CASHFLOW ${money(state.fastTrackIncomeCents ?? 0)}` : `Поток ${money(state.monthlyCashflowCents)}/мес`}</span>
              </> : null}
            </div>
            {state ? fastTrack ? <FastTrackResult player={player} /> : <PlayerFreedomMini player={player} /> : null}
          </li>;
        })}
      </ul>
    )}
  </section>;
}

function FastTrackResult({ player }: { player: GamePlayer }) {
  const state = player.financialState!;
  const increase = (state.fastTrackIncomeCents ?? 0) - (state.fastTrackStartIncomeCents ?? 0);
  const percentage = Math.round(Math.min(100, Math.max(0, increase / 50_000 * 100)));
  const dream = fastTrackCells[player.dreamCellIndex ?? -1];
  return <div className="mt-3">
    <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
      <span>Доход к победе</span><strong className={increase >= 50_000 ? "text-success" : "text-neutral-700"}>{percentage}%</strong>
    </div>
    <PlayerProgress value={increase} max={50_000} label={`Прирост дохода ${money(increase)} из ${money(50_000)}`} complete={increase >= 50_000} />
    <p className="mt-1.5 text-xs text-neutral-600">Прирост {increase >= 0 ? "+" : "−"}{money(Math.abs(increase))}</p>
    <p className="mt-1 break-words text-xs text-neutral-600">Мечта: <strong>{dream?.label ?? "Не выбрана"}</strong></p>
  </div>;
}

function PlayerFreedomMini({ player }: { player: GamePlayer }) {
  const { passiveIncomeCents, totalExpensesCents } = player.financialState!;
  const bankLoanBalanceCents = outstandingBankLoanBalanceCents(player.liabilities);
  const target = Math.max(1, totalExpensesCents + 1);
  const incomeReached = passiveIncomeCents > totalExpensesCents;
  const reached = canEscapeRatRace(passiveIncomeCents, totalExpensesCents, bankLoanBalanceCents > 0);
  const percentage = incomeReached ? 100 : Math.round(Math.min(100, Math.max(0, passiveIncomeCents / target * 100)));
  const label = reached
    ? "Условия выхода с малого круга выполнены"
    : bankLoanBalanceCents > 0 && incomeReached
      ? `Пассивный доход выше расходов, осталось погасить банковские кредиты на ${money(bankLoanBalanceCents)}`
      : `Прогресс игрока к выходу с малого круга ${percentage}%`;
  return <div className="mt-3">
    <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
      <span>Финансовая свобода</span>
      <strong className={reached ? "text-success" : "text-neutral-700"}>{reached ? "Готово" : incomeReached && bankLoanBalanceCents > 0 ? "Остался кредит" : `${percentage}%`}</strong>
    </div>
    <PlayerProgress value={incomeReached ? target : passiveIncomeCents} max={target} label={label} complete={reached} />
    {bankLoanBalanceCents > 0 ? <div className="mt-1.5 text-xs text-neutral-600">Кредиты к погашению: <strong>{money(bankLoanBalanceCents)}</strong></div> : null}
  </div>;
}

function PlayerProgress({ value, max, label, complete }: { value: number; max: number; label: string; complete: boolean }) {
  const clamped = Math.min(max, Math.max(0, value));
  return <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={clamped} aria-valuetext={label}>
    <div className={`h-full rounded-full transition-[width] ${complete ? "bg-[#73a865]" : "bg-[#8da7c4]"}`} style={{ width: `${clamped / max * 100}%` }} />
  </div>;
}
