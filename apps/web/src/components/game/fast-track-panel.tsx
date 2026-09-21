"use client";

import { fastTrackCells, fastTrackDreams } from "@cashflow/shared";
import { Check, ChevronDown, Heart, Target } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FastTrackBoard } from "./fast-track-board";
import { DiceAction } from "./dice-action";
export { FastTrackBoard } from "./fast-track-board";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

export function DreamPicker({ player, saving, onChoose }: { player: GamePlayer; saving: boolean; onChoose: (index: number) => void }) {
  const selected = fastTrackDreams.find((cell) => cell.index === player.dreamCellIndex);
  const [expanded, setExpanded] = useState(!selected);
  const [requested, setRequested] = useState<number | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const cardsId = useId();
  useEffect(() => {
    if (requested === null || saving || selected?.index !== requested) return;
    setExpanded(false);
    setRequested(null);
    toggle.current?.focus();
  }, [requested, saving, selected?.index]);
  return <section className="rounded-2xl bg-white p-4 text-ink shadow-panel sm:p-5" aria-labelledby="dream-picker-title">
    <h2 id="dream-picker-title" className="flex items-center gap-2 text-xl font-extrabold"><Target size={22} aria-hidden="true" /> Ваша мечта</h2>
    <p className="mt-2 text-sm leading-6">Выберите вашу мечту. Покупка этой мечты принесёт победу в этой игре. После старта изменить выбор нельзя.</p>
    <div className={selected || saving ? "mt-4" : ""} aria-live="polite">
      {selected ? <><p className="font-extrabold text-[#57378f]">{selected.label} · {money(selected.cost)}</p><p className="mt-1 max-w-3xl text-sm leading-6">{selected.description}</p></> : null}
      {saving ? <p className="mt-1 text-sm">Сохраняем выбор…</p> : null}
    </div>
    <button ref={toggle} type="button" aria-expanded={expanded} aria-controls={cardsId} onClick={() => setExpanded((value) => !value)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md py-2 text-sm font-bold text-journey underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey">
      Мечта большого круга<ChevronDown size={16} className={expanded ? "rotate-180" : ""} aria-hidden="true" />
    </button>
    <div id={cardsId} hidden={!expanded}>
      <div className="dream-picker-cards mt-2 grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Карточки мечт" aria-busy={saving}>
        {fastTrackDreams.map((cell) => <button type="button" disabled={saving} key={cell.index} aria-pressed={selected?.index === cell.index} onClick={() => { setRequested(cell.index); onChoose(cell.index); }}
          className={`flex min-w-0 flex-col items-stretch rounded-xl p-3 text-left text-sm leading-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-journey/30 ${selected?.index === cell.index ? "bg-[#eee8ff] text-[#57378f]" : "bg-card hover:bg-surface"}`}>
          <span className="flex items-start justify-between gap-2 font-bold">{cell.code} · {cell.label}{selected?.index === cell.index ? <Check size={18} className="shrink-0" /> : null}</span>
          <span className="mt-1 block font-bold">{money(cell.cost)}</span><span className="mt-1 block leading-5">{cell.description}</span>
        </button>)}
      </div>
    </div>
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
  onDecision: (buy: boolean, decisionId: string) => void; busy: boolean; children?: ReactNode;
  turnTabRequest?: number;
}) {
  const pending = snapshot.game.pendingAction;
  const mine = pending?.type === "fast_track_choice" && pending.gamePlayerId === player?.id ? pending : null;
  const isTurn = snapshot.game.status === "IN_PROGRESS" && snapshot.game.currentPlayerId === player?.id && player?.track === "FAST_TRACK";
  const choiceCell = mine ? fastTrackCells[mine.cellIndex]! : null;
  const statusLabel = snapshot.game.status === "ENDED" ? "Партия завершена" : snapshot.game.status === "PAUSED" ? "Партия на паузе" : isTurn ? "Ваш ход" : `Ходит: ${gamePlayerName(snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId))}`;
  const diceAction = <DiceAction canRoll={Boolean(isTurn && !pending)} rolling={rolling} phase={phase} disabled={busy}
      statusLabel={statusLabel} idleLabel={isTurn && pending ? "Выберите действие" : undefined}
      diceValues={diceValues} diceCount={diceCount} onRoll={onRoll} onSkip={onSkip} pinnedToPanel replaceButtonWithDice />;
  const actions = <div className="fast-track-turn-options" aria-label="Действия большого круга">
    {isTurn && !pending && player?.financialState?.fastTrackCharity ? <label className="dice-choice">Кубики <select aria-label="Количество кубиков" value={diceCount} onChange={(event) => onDiceCount(Number(event.target.value))} disabled={rolling || busy}>{[1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
    {mine ? <div className="turn-decision">
      <div className="turn-decision-heading"><strong>{choiceCell?.label}</strong><span>{money(mine.priceCents)}</span></div>
      {choiceCell?.rule.kind === "chance_business" || choiceCell?.rule.kind === "ipo" ? <p className="turn-decision-note">После оплаты бросается одна кость. Для успеха нужно {choiceCell.rule.minimum}–6. При неудаче вложение теряется. При успехе: {choiceCell.rule.kind === "ipo" ? `${money(choiceCell.rule.payout)} наличными` : `+${money(choiceCell.income)} к доходу`}.</p> : choiceCell?.income ? <p className="turn-decision-note">К доходу CASHFLOW: +{money(choiceCell.income)}</p> : null}
      <div className="turn-actions"><button type="button" className="turn-action" aria-label={`Оплатить ${money(mine.priceCents)}`} disabled={!isTurn || busy || (player?.financialState?.cashCents ?? 0) < mine.priceCents} onClick={() => onDecision(true, mine.decisionId)}>Купить</button><button type="button" className="turn-action" aria-label="Отказаться и завершить ход" disabled={!isTurn || busy} onClick={() => onDecision(false, mine.decisionId)}>Отказаться</button></div>
      {(player?.financialState?.cashCents ?? 0) < mine.priceCents ? <p className="turn-decision-note">Недостаточно наличных. На большом круге кредиты недоступны.</p> : null}
    </div> : null}
    </div>;
  return <FastTrackBoard snapshot={snapshot} player={player} diceAction={diceAction} actions={actions} history={children} phase={phase} turnTabRequest={turnTabRequest} />;
}
