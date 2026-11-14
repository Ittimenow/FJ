"use client";

import { useEffect, useRef, useState } from "react";
import type { Player202, Task202 } from "@cashflow/shared";
import { Input } from "@/components/ui/input";
import type { GameSnapshot } from "@/lib/types";
import { gamePlayerName } from "@/lib/game-player";
import { OfferPanel, OfferResponse } from "./deal-auction-dialog";
import { DecisionActions } from "./game-decision-panels";
import { GamePlayerMark } from "./game-player-mark";
import { money202 } from "./financial-presentation";
import { offerKinds202, type OfferKind202 } from "./game-202-actions";
import type { PendingCommand202 } from "./game-202-decisions";
import { offerPayment202 } from "./game-202-decision-model";

const selectClass = "h-12 min-w-0 w-full rounded-xl border border-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25";
const labels: Record<OfferKind202, string> = { asset: "Продать актив или долю", right: "Передать опцион недвижимости", opportunity: "Передать текущую возможность", joint: "Купить вместе текущую возможность" };

export function Game202Offers({ snapshot, player, task, open, onClose, canOperate, submission, onCommand }: {
  snapshot: GameSnapshot;
  player: Player202;
  task: Task202 | undefined;
  open: boolean;
  onClose: () => void;
  canOperate: boolean;
  submission: PendingCommand202 | null;
  onCommand: (command: PendingCommand202) => Promise<boolean>;
}) {
  const state = snapshot.game202!;
  const kinds = offerKinds202(state, player, task);
  const [kind, setKind] = useState<OfferKind202>(kinds[0] ?? "asset");
  const [target, setTarget] = useState("");
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState<number | "">(1000);
  const [share, setShare] = useState<number | "">(50);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const selectedKind = kinds.includes(kind) ? kind : kinds[0];
  const assets = state.assets.filter(asset => asset.kind !== "interest" && (asset.owners[player.id] ?? 0) > 0 && (asset.lockedUntil[player.id] ?? 0) <= player.laps);
  const chosenAsset = assets.find(asset => asset.id === assetId);
  const shareBps = share === "" ? 0 : Math.round(share * 100);
  const amountCents = amount === "" ? -1 : Math.round(amount * 100);
  const validTarget = state.players.some(person => person.id === target && person.id !== player.id && person.track === "RAT_RACE");
  const validShare = Number.isSafeInteger(shareBps) && shareBps > 0 && (selectedKind === "joint" ? shareBps < 10000 : shareBps <= (chosenAsset?.owners[player.id] ?? 0));
  const validAmount = Number.isSafeInteger(amountCents) && amountCents >= (selectedKind === "asset" ? 1 : 0) && amountCents <= 10_000_000_000;
  const valid = Boolean(selectedKind && validTarget && (selectedKind === "joint" || validAmount)
    && (selectedKind !== "asset" || chosenAsset && validShare)
    && (selectedKind !== "joint" || validShare)
    && (selectedKind !== "right" || player.rights.some(right => right.id === assetId)));
  const visible = state.offers.filter(offer => offer.from === player.id || offer.to === player.id || offer.shares?.[player.id]);
  const name = (id: string) => gamePlayerName(snapshot.players.find(person => person.id === id));

  async function send() {
    if (!valid || !canOperate || !selectedKind) return;
    const command: PendingCommand202 = { type: "offer", choice: selectedKind, target,
      ...(selectedKind === "joint" ? { shares: { [player.id]: shareBps, [target]: 10000 - shareBps } } : { amount: amountCents }),
      ...(selectedKind === "asset" ? { assetId, share: shareBps } : {}),
      ...(selectedKind === "right" ? { rightId: assetId } : {}) };
    if (await onCommand(command)) onClose();
  }

  return <div className="space-y-3">
    {visible.map(offer => {
      const sender = snapshot.players.find(person => person.id === offer.from);
      const recipient = offer.to === player.id || Boolean(offer.shares?.[player.id]);
      const awaiting = recipient && !offer.accepted.includes(player.id);
      const cost = offerPayment202(offer, player.id) ?? 0;
      const affordable = player.cash >= cost;
      const title = offer.kind === "joint" ? "Совместная покупка" : offer.kind === "opportunity" ? "Предложение возможности" : offer.kind === "right" ? "Опцион недвижимости" : state.assets.find(asset => asset.id === offer.assetId)?.name ?? "Предложение актива";
      const waitingIds=offer.kind==="joint"?Object.keys(offer.shares??{}).filter(id=>!offer.accepted.includes(id)):[offer.to];
      const panel = <OfferPanel title={title} description={`${name(offer.from)} → ${name(offer.to)}`}>
        {sender ? <OfferResponse title={<span className="flex items-center gap-2"><GamePlayerMark player={sender} size="sm"/>{name(offer.from)}</span>}
          description={awaiting ? "Ожидает вашего решения" : `Ожидаем: ${waitingIds.map(name).join(", ")}`}/> : null}
        <div className="space-y-1.5 text-sm text-neutral-700">
          <p>{offer.kind === "joint" ? "Общий взнос" : "Платёж продавцу"}: <strong>{money202(offer.price)}</strong></p>
          {offer.share ? <p>Доля объекта: <strong>{offer.share / 100}%</strong></p> : null}
          {offer.kind === "joint" ? <><p>Ваша доля: <strong>{(offer.shares?.[player.id] ?? 0) / 100}%</strong></p><p>Ваш взнос: <strong>{money202(cost)}</strong></p></> : null}
          {awaiting ? <p>Наличные после принятия: <strong>{money202(player.cash-cost)}</strong></p> : null}
          {!awaiting && offer.from !== player.id ? <p role="status">Ваш ответ принят.</p> : null}
        </div>
        {awaiting && !affordable ? <p className="text-xs text-red-700">Для принятия предложения не хватает {money202(cost - player.cash)}.</p> : null}
        <DecisionActions actions={[
          ...(awaiting ? [{ label: "Принять", onClick: () => void onCommand({ type: "accept", offerId: offer.id }), disabled: !canOperate || !affordable,
            busy: submission?.type === "accept" && submission.offerId === offer.id, busyLabel: "Принимаем…" }] : []),
          { label: offer.from === player.id ? "Отменить предложение" : "Отказаться", variant: "secondary", onClick: () => void onCommand({ type: "reject", offerId: offer.id }), disabled: !canOperate,
            busy: submission?.type === "reject" && submission.offerId === offer.id, busyLabel: "Отправляем…" }
        ]}/>
      </OfferPanel>;
      return <div key={offer.id}>{panel}</div>;
    })}
    {open && selectedKind ? <div ref={formRef}><OfferPanel title="Предложить игрокам" description="Выберите участника и условия предложения.">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="grid gap-2 text-sm font-medium">Предложение<select aria-label="Предложение" className={selectClass} value={selectedKind} disabled={!canOperate} onChange={event => { setKind(event.target.value as OfferKind202); setAssetId(""); }}>
          {kinds.map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </select></label>
        <label className="grid gap-2 text-sm font-medium">Участник<select aria-label="Участник" className={selectClass} value={target} disabled={!canOperate} required onChange={event => setTarget(event.target.value)}>
          <option value="">Выберите игрока</option>{state.players.filter(person => person.id !== player.id && person.track === "RAT_RACE").map(person => <option key={person.id} value={person.id}>{name(person.id)}</option>)}
        </select></label>
        {selectedKind === "asset" || selectedKind === "right" ? <label className="grid gap-2 text-sm font-medium">Актив<select aria-label="Актив" className={selectClass} value={assetId} disabled={!canOperate} required onChange={event => setAssetId(event.target.value)}>
          <option value="">Выберите актив</option>{selectedKind === "asset" ? assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} · ваша доля {(asset.owners[player.id] ?? 0) / 100}%</option>) : player.rights.map(right => <option key={right.id} value={right.id}>Опцион недвижимости · {money202(right.cost)}</option>)}
        </select></label> : null}
        {selectedKind === "asset" || selectedKind === "joint" ? <label className="grid gap-2 text-sm font-medium">{selectedKind === "joint" ? "Ваша доля покупки, %" : "Передаваемая доля объекта, %"}
          <Input type="number" min={0.01} max={selectedKind === "joint" ? 99.99 : (chosenAsset?.owners[player.id] ?? 10000) / 100} step={0.01} value={share} disabled={!canOperate} onChange={event => setShare(event.target.value === "" ? "" : Number(event.target.value))}/>
        </label> : null}
        {selectedKind !== "joint" ? <label className="grid gap-2 text-sm font-medium">Платёж вам в долларах, сверх принимаемой ипотеки
          <Input type="number" min={selectedKind === "asset" ? 0.01 : 0} max={100_000_000} step={0.01} value={amount} disabled={!canOperate} onChange={event => setAmount(event.target.value === "" ? "" : Number(event.target.value))}/>
        </label> : <p className="text-xs leading-5 text-neutral-600">Взнос и доход распределяются по долям. Покупка выполняется после согласия всех участников.</p>}
        <DecisionActions actions={[
          { label: "Предложить условия", onClick: () => void send(), disabled: !canOperate || !valid, busy: submission?.type === "offer", busyLabel: "Отправляем…" },
          { label: "К решению по карточке", onClick: onClose, disabled: submission?.type === "offer", variant: "secondary" }
        ]}/>
      </form>
    </OfferPanel></div> : null}
  </div>;
}
