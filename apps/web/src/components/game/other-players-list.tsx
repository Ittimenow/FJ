"use client";

import { fastTrackCells, outstandingBankLoanBalanceCents } from "@cashflow/shared";
import { Orbit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { classicFinancialPresentation, freedomProgress, type FinancialPresentation } from "./financial-presentation";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";
import { GamePlayerMark } from "./game-player-mark";

export function OtherPlayersList({ players, currentPlayerId, className = "", presentation = classicFinancialPresentation }: {
  players: GamePlayer[];
  currentPlayerId: string | null;
  className?: string;
  presentation?: FinancialPresentation;
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
                <span>Наличные {presentation.money(state.cashCents)}</span>
                <span>{fastTrack ? `Денежный поток ${presentation.money(state.fastTrackIncomeCents ?? 0)}` : `Поток ${presentation.money(state.monthlyCashflowCents)}/мес`}</span>
              </> : null}
            </div>
            {state ? fastTrack ? <FastTrackResult player={player} presentation={presentation} /> : <PlayerFreedomMini player={player} presentation={presentation} /> : null}
          </li>;
        })}
      </ul>
    )}
  </section>;
}

export function FastTrackResult({ player, showDream = true, presentation = classicFinancialPresentation }: { player: GamePlayer; showDream?: boolean; presentation?: FinancialPresentation }) {
  const state = player.financialState!;
  const increase = (state.fastTrackIncomeCents ?? 0) - (state.fastTrackStartIncomeCents ?? 0);
  const percentage = Math.round(Math.min(100, Math.max(0, increase / presentation.fastIncomeTarget * 100)));
  const dream = fastTrackCells[player.dreamCellIndex ?? -1];
  return <div className="mt-3">
    <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
      <span>Доход к победе</span><strong className={increase >= presentation.fastIncomeTarget ? "text-success" : "text-neutral-700"}>{percentage}%</strong>
    </div>
    <PlayerProgress value={increase} max={presentation.fastIncomeTarget} label={`Прирост дохода ${presentation.money(increase)} из ${presentation.money(presentation.fastIncomeTarget)}`} complete={increase >= presentation.fastIncomeTarget} />
    <p className="mt-1.5 text-xs text-neutral-600">Прирост {increase >= 0 ? "+" : "−"}{presentation.money(Math.abs(increase))}</p>
    {showDream ? <p className="mt-1 break-words text-xs text-neutral-600">Мечта: <strong>{dream?.label ?? "Не выбрана"}</strong></p> : null}
  </div>;
}

function PlayerFreedomMini({ player, presentation }: { player: GamePlayer; presentation: FinancialPresentation }) {
  const { passiveIncomeCents, totalExpensesCents } = player.financialState!;
  const bankLoanBalanceCents = outstandingBankLoanBalanceCents(player.liabilities);
  const {target, incomeReached, reached} = freedomProgress(presentation, passiveIncomeCents, totalExpensesCents, bankLoanBalanceCents, player.financialState!.cashCents);
  const percentage = incomeReached ? 100 : Math.round(Math.min(100, Math.max(0, passiveIncomeCents / target * 100)));
  const label = reached
    ? "Условия выхода с малого круга выполнены"
    : bankLoanBalanceCents > 0 && incomeReached
      ? `${presentation.incomeReachedLabel}, осталось погасить банковские кредиты на ${presentation.money(bankLoanBalanceCents)}`
      : `Прогресс игрока к выходу с малого круга ${percentage}%`;
  return <div className="mt-3">
    <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
      <span>Финансовая свобода</span>
      <strong className={reached ? "text-success" : "text-neutral-700"}>{reached ? "Готово" : incomeReached && bankLoanBalanceCents > 0 ? "Остался кредит" : `${percentage}%`}</strong>
    </div>
    <PlayerProgress value={incomeReached ? target : passiveIncomeCents} max={target} label={label} complete={reached} />
    {presentation.gameType === "202" && player.financialState!.cashCents < 0 ? <p className="mt-1.5 text-xs text-neutral-600">Покройте обязательные расходы: <strong>{presentation.money(-player.financialState!.cashCents)}</strong></p> : null}
    {bankLoanBalanceCents > 0 ? <div className="mt-1.5 text-xs text-neutral-600">Кредиты к погашению: <strong>{presentation.money(bankLoanBalanceCents)}</strong></div> : null}
  </div>;
}

function PlayerProgress({ value, max, label, complete }: { value: number; max: number; label: string; complete: boolean }) {
  const clamped = Math.min(max, Math.max(0, value));
  return <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={clamped} aria-valuetext={label}>
    <div className={`h-full rounded-full transition-[width] ${complete ? "bg-[#73a865]" : "bg-[#8da7c4]"}`} style={{ width: `${clamped / max * 100}%` }} />
  </div>;
}
