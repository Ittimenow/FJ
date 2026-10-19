"use client";

import { fastTrackCells, fastTrackDreams, fastTrackOwner, readFastTrackWorld } from "@cashflow/shared";
import { Check, Heart, Target } from "lucide-react";
import type { ReactNode } from "react";
import { FastTrackBoard } from "./fast-track-board";
import { DiceAction } from "./dice-action";
export { FastTrackBoard } from "./fast-track-board";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

export function DreamPicker({ player, saving, onChoose }: { player: GamePlayer; saving: boolean; onChoose: (index: number) => void }) {
  return <section className="rounded-2xl bg-white p-4 text-ink shadow-panel sm:p-5" aria-labelledby="dream-picker-title">
    <h2 id="dream-picker-title" className="flex items-center gap-2 text-xl font-extrabold"><Target size={22} aria-hidden="true" /> Выберите мечту</h2>
    <p className="mt-2 text-sm leading-6">Покупка выбранной мечты принесёт победу. До начала партии выбор можно изменить.</p>
    <div className="dream-picker-cards mt-4 grid auto-rows-max max-h-[min(70vh,760px)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Карточки мечт" aria-busy={saving}>
      {fastTrackDreams.map((cell) => {
        const selected = player.dreamCellIndex === cell.index;
        return <button type="button" disabled={saving} key={cell.index} aria-pressed={selected} onClick={() => onChoose(cell.index)}
          className={`flex min-w-0 flex-col overflow-hidden rounded-xl text-left text-sm leading-5 outline-none transition focus-visible:ring-4 focus-visible:ring-journey/30 ${selected ? "bg-[#eee8ff] text-[#57378f] ring-2 ring-[#7655c7]" : "bg-card hover:bg-surface"}`}>
          <span className="relative block aspect-[3/2] w-full shrink-0 overflow-hidden">
            <img src={`/dreams/${cell.index}.webp`} alt="" width={640} height={427} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          </span>
          <span className="flex items-start justify-between gap-2 px-3 pt-3 font-extrabold">{cell.label}{selected ? <Check size={18} className="shrink-0" aria-hidden="true" /> : null}</span>
          <span className="px-3 pt-1 font-bold">{money(cell.cost)}</span>
          <span className="px-3 pb-3 pt-1 leading-5">{cell.description}</span>
        </button>;
      })}
    </div>
    {saving ? <p className="mt-3 text-sm" role="status">Сохраняем мечту…</p> : null}
  </section>;
}

export function FastTrackFinances({ player }: { player: GamePlayer }) {
  const state = player.financialState;
  const initial = state?.fastTrackStartIncomeCents ?? 0;
  const income = state?.fastTrackIncomeCents ?? 0;
  const dream = fastTrackCells[player.dreamCellIndex ?? -1];
  return <section className="rounded-xl bg-white p-4 text-ink" aria-label={`Финансы большого круга: ${gamePlayerName(player)}`}>
    <h3 className="text-lg font-extrabold">{gamePlayerName(player)} · большой круг</h3>
    <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <div><dt>Наличные</dt><dd className="text-xl font-extrabold tabular-nums">{money(state?.cashCents ?? 0)}</dd></div>
      <div><dt>Доход CASHFLOW</dt><dd className="text-xl font-extrabold tabular-nums">{money(income)}</dd></div>
      <div><dt>Прирост дохода</dt><dd className="text-xl font-extrabold tabular-nums">{income >= initial ? "+" : "−"}{money(Math.abs(income - initial))}</dd></div>
    </dl>
    <progress className="fast-track-progress mt-4 h-2 w-full" value={Math.max(0, income - initial)} max={50_000} aria-label="Прирост дохода к победе" />
    <p className="mt-2 text-sm"><Target className="mr-1 inline" size={16} aria-hidden="true" /> Мечта: <strong>{dream?.label ?? "Не выбрана"}</strong></p>
    {state?.fastTrackCharity ? <p className="mt-2 text-sm"><Heart className="mr-1 inline" size={16} aria-hidden="true" /> Благотворительность: доступны 1–3 кубика</p> : null}
  </section>;
}

export function FastTrackPanel({ snapshot, player, onRoll, onSkip, rolling, phase = "ready", diceValues, diceCount, onDiceCount, onDecision, busy, turnTabRequest = 0, children }: {
  snapshot: GameSnapshot; player?: GamePlayer | undefined;
  onRoll: () => void; rolling: boolean; diceValues: number[]; diceCount: number; onDiceCount: (count: number) => void;
  onSkip: () => void; phase?: "ready" | "rolling" | "moving" | "landed";
  onDecision: (buy: boolean, decisionId: string) => void; busy: boolean; children?: (actions: ReactNode) => ReactNode;
  turnTabRequest?: number;
}) {
  const pending = snapshot.game.pendingAction;
  const mine = pending?.type === "fast_track_choice" && pending.gamePlayerId === player?.id ? pending : null;
  const isTurn = snapshot.game.status === "IN_PROGRESS" && snapshot.game.currentPlayerId === player?.id && player?.track === "FAST_TRACK";
  const choiceCell = mine ? fastTrackCells[mine.cellIndex]! : null;
  const ownerId = choiceCell ? fastTrackOwner(choiceCell, readFastTrackWorld(snapshot.game.fastTrackWorld)) : null;
  const owner = snapshot.players.find((item) => item.id === ownerId);
  const resale = Boolean(ownerId && choiceCell?.rule.kind !== "ipo");
  const statusLabel = snapshot.game.status === "ENDED" ? "Партия завершена" : snapshot.game.status === "PAUSED" ? "Партия на паузе" : isTurn ? "Ваш ход" : `Ходит: ${gamePlayerName(snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId))}`;
  const diceAction = <DiceAction canRoll={Boolean(isTurn && !pending)} rolling={rolling} phase={phase} disabled={busy}
      statusLabel={statusLabel} idleLabel={isTurn && pending ? "Выберите действие" : undefined}
      diceValues={diceValues} diceCount={diceCount} onRoll={onRoll} onSkip={onSkip} pinnedToPanel replaceButtonWithDice />;
  const canChooseDice = isTurn && !pending && player?.financialState?.fastTrackCharity;
  const actions = mine || canChooseDice ? <div className="fast-track-turn-options" aria-label="Действия большого круга">
    {canChooseDice ? <label className="dice-choice">Кубики <select aria-label="Количество кубиков" value={diceCount} onChange={(event) => onDiceCount(Number(event.target.value))} disabled={rolling || busy}>{[1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
    {mine ? <div className="turn-decision">
      <div className="turn-decision-heading"><strong>{choiceCell?.label}</strong><span>{money(mine.priceCents)}</span></div>
      {resale ? <p className="turn-decision-note">Выкуп у игрока {gamePlayerName(owner)}. Деньги получит прежний владелец{choiceCell?.income ? ", доход CASHFLOW перейдёт вам" : ""}. При следующем выкупе цена снова удвоится.</p> : null}
      {!resale && (choiceCell?.rule.kind === "chance_business" || choiceCell?.rule.kind === "ipo") ? <p className="turn-decision-note">После оплаты бросается одна кость. Для успеха нужно {choiceCell.rule.minimum}–6. При неудаче вложение теряется. При успехе: {choiceCell.rule.kind === "ipo" ? `${money(choiceCell.rule.payout)} наличными` : `+${money(choiceCell.income)} к доходу`}.</p> : choiceCell?.income ? <p className="turn-decision-note">К доходу CASHFLOW: +{money(choiceCell.income)}</p> : null}
      <div className="turn-actions"><button type="button" className="turn-action" aria-label={`${resale ? "Выкупить" : "Оплатить"} ${money(mine.priceCents)}`} disabled={!isTurn || busy || (player?.financialState?.cashCents ?? 0) < mine.priceCents} onClick={() => onDecision(true, mine.decisionId)}>{resale ? "Выкупить" : "Купить"}</button><button type="button" className="turn-action" aria-label="Отказаться и завершить ход" disabled={!isTurn || busy} onClick={() => onDecision(false, mine.decisionId)}>Отказаться</button></div>
      {(player?.financialState?.cashCents ?? 0) < mine.priceCents ? <p className="turn-decision-note">Недостаточно наличных. На большом круге кредиты недоступны.</p> : null}
    </div> : null}
    </div> : null;
  return <FastTrackBoard snapshot={snapshot} player={player} diceAction={diceAction} actions={actions} history={children?.(actions)} phase={phase} turnTabRequest={turnTabRequest} />;
}
