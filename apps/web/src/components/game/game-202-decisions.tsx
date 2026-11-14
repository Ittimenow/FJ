"use client";

import { useRef, useState } from "react";
import { assetPortion202, fastPrice202, fastTrackCells, finances202, type Command202, type Player202, type Task202 } from "@cashflow/shared";
import type { GameSnapshot } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { money202 } from "./financial-presentation";
import { ChoicePanel, DecisionActions, DecisionOutcome, DecisionPanel, FundingProgress, MarketSalePanel, PurchasePanel, StockSalePanel, type DecisionAction } from "./game-decision-panels";
import { OfferPanel, OfferResponse } from "./deal-auction-dialog";
import { StockPurchaseControls } from "./stock-purchase-controls";
import { decisionPurchase202, decisionSale202, decisionShort202, exchangeAssets202 } from "./game-202-decision-model";
import { gamePlayerName } from "@/lib/game-player";
import { GamePlayerMark } from "./game-player-mark";

export type PendingCommand202 = Omit<Command202, "revision">;

/** 202 supplies rules and commands; the controls and financial panels are shared with 101. */
export function Game202Decisions({ snapshot, player, task, disabled, submission, onCommand, onOpenBank, onOffer }: {
  snapshot: GameSnapshot;
  player: Player202;
  task: Task202;
  disabled: boolean;
  submission: PendingCommand202 | null;
  onCommand: (command: PendingCommand202) => Promise<boolean>;
  onOpenBank: () => void;
  onOffer?: () => void;
}) {
  const state = snapshot.game202!;
  const [quantity, setQuantity] = useState<number | "">(task.rule?.kind === "option" || task.kind === "quote" ? 100 : 1);
  const [saleQuantity, setSaleQuantity] = useState<number | "">(1);
  const [shortQuantity, setShortQuantity] = useState<number | "">(100);
  const [assetId, setAssetId] = useState("");
  const [bid, setBid] = useState<number | "">("");
  const [operation, setOperation] = useState<"buy" | "sell" | "short" | "options" | null>(null);
  const [optionId, setOptionId] = useState("");
  const choicesRef = useRef<HTMLDivElement>(null);
  const showOperations = () => {
    setOperation(null);
    requestAnimationFrame(() => {
      choicesRef.current?.focus({ preventScroll: true });
      choicesRef.current?.scrollIntoView({block:"nearest",behavior:"instant"});
    });
  };
  const card = snapshot.cards202?.find(item => item.slug === task.slug);
  const pending = (choice: string) => submission?.type === "decide" && submission.choice === choice;
  const decide = async (choice: string, data: Partial<PendingCommand202> = {}) => {
    const accepted = await onCommand({ type: "decide", choice, ...data });
    if (accepted && task.kind === "quote" && choice !== "pass") showOperations();
  };
  const action = (label: string, choice: string, options: { disabled?: boolean; variant?: DecisionAction["variant"]; busyLabel?: string; data?: Partial<PendingCommand202> } = {}): DecisionAction => ({
    label,
    onClick: () => decide(choice, options.data),
    disabled: disabled || options.disabled,
    busy: pending(choice) && (!options.data?.assetId || submission?.assetId === options.data.assetId),
    busyLabel: options.busyLabel ?? "Сохраняем…",
    variant: options.variant ?? (choice === "pass" ? "secondary" : "primary")
  });
  const purchase = decisionPurchase202(state, player, task, quantity, assetId);
  const purchaseStatus = pending("buy") ? "buy" : pending("pass") ? "decline" : null;

  const purchasePanel = purchase ? <PurchasePanel
    card={{ id: task.id, title: card?.title ?? "Инвестиционная возможность", isStock: purchase.quantityEditable,
      price: purchase.quantityEditable ? purchase.unitPriceCents : purchase.priceCents,
      downPayment: purchase.downPaymentCents, cashflow: purchase.cashflowCents }}
    available={player.cash} quantity={quantity} onQuantityChange={setQuantity}
    quantityMin={purchase.quantityRules.min} quantityStep={purchase.quantityRules.step} quantityMax={purchase.quantityRules.max}
    quantityLabel={task.rule?.kind === "investment" ? "Количество инвестиций" : "Количество акций"}
    unitPriceLabel={task.rule?.kind === "investment" ? "Цена инвестиции" : task.rule?.kind === "option" ? "Премия за акцию" : "Цена акции"}
    formatMoney={money202} moneyUnit={100} showCardText={false} embedded
    disabled={disabled} canPurchase={purchase.canBuy} disabledReason={purchase.reason ?? undefined} submitting={purchaseStatus}
    insufficientLabel={purchase.canTakeLoan ? "Нужен кредит" : "Недостаточно наличных"}
    onBuy={() => decide("buy", { quantity: quantity === "" ? 0 : quantity, assetId })}
    onDecline={task.kind === "quote" ? showOperations : () => void decide("pass")}
    declineLabel={task.kind === "quote" ? "К выбору операции" : "Отказаться"}
    buyLabel={task.rule?.kind === "exchange" ? "Продолжить обмен" : "Купить"}
    {...(purchase.paymentCents > player.cash && purchase.canTakeLoan ? { onOpenBank, canTakeLoan: true } : {})}
    {...(onOffer && task.kind !== "quote" ? { onOffer } : {})}
    {...(purchase.quantityValid ? {outcome:{paymentCents:purchase.paymentCents,cashAfterCents:player.cash-purchase.paymentCents,cashflowChangeCents:purchase.netCashflowChangeCents}} : {})}
  >
    {purchase.repairLoanCents > 0 ? <p className="text-sm leading-6 text-neutral-700">Отдельный кредит на ремонт: <strong>{money202(purchase.repairLoanCents)}</strong>, платёж <strong>{money202(purchase.repairPaymentCents)}</strong>/мес.</p> : null}
  </PurchasePanel> : null;

  const renderDecision = () => { switch (task.kind) {
    case "roll": return null;
    case "choose": return <ChoicePanel title="Выберите колоду" description="Откроется случайная карточка выбранной колоды. После её завершения — карточка рынка." choices={[
      { label: "Прирост капитала", description: "Акции, опционы и активы для последующей продажи.", className:"h-auto min-h-11 py-3", onClick: () => void onCommand({ type: "choose", choice: "capital" }), disabled },
      { label: "Денежный поток", description: "Недвижимость и развитие регулярного дохода.", className:"h-auto min-h-11 py-3", onClick: () => void onCommand({ type: "choose", choice: "cashflow" }), disabled }
    ]}/>;
    case "deal": {
      if (task.rule?.kind !== "exchange") return purchasePanel;
      const rule = task.rule;
      const assets = exchangeAssets202(state, player, task);
      const selected = assets.find(asset => asset.id === assetId);
      return <DecisionPanel title="Выберите объект для обмена" actions={[
        action("Продолжить обмен", "buy", { disabled: !purchase?.canBuy, data: {assetId} }), action("Отказаться", "pass")
      ]}>
        <label className="mt-3 grid gap-2 text-sm font-medium">Ваш объект
          <select aria-label="Объект для обмена" className="h-12 min-w-0 w-full rounded-xl border border-line bg-white px-3 text-sm" value={assetId} disabled={disabled} onChange={event => setAssetId(event.target.value)}>
            <option value="">Выберите объект</option>
            {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
          </select>
        </label>
        {selected ? <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
          <p>Ипотека вашей доли: <strong>{money202(assetPortion202(selected, player.id, selected.mortgage))} → {money202(assetPortion202(selected, player.id, Math.round(rule.property.mortgage * 100)))}</strong></p>
          <p>Денежный поток вашей доли: <strong>{money202(assetPortion202(selected, player.id, selected.income))} → {money202(assetPortion202(selected, player.id, Math.round(rule.property.income * 100)))}</strong>/мес.</p>
          <p>Доплачивать наличными не нужно. На следующем шаге владельцы подтвердят обмен.</p>
        </div> : <p className="mt-2 text-sm text-neutral-700">{assets.length ? "Выберите недвижимость, которую хотите заменить." : "У вас нет подходящей недвижимости."}</p>}
        {selected && purchase?.reason ? <p className="mt-2 text-xs text-red-700">{purchase.reason}</p> : null}
      </DecisionPanel>;
    }
    case "quote": {
      const owned = player.stocks.filter(stock => stock.symbol === task.symbol).reduce((sum, stock) => sum + stock.quantity, 0);
      const short = decisionShort202(state, player, task, shortQuantity);
      const setSale = (value: number | "") => setSaleQuantity(value === "" ? "" : Math.min(owned, Math.max(1, Math.floor(value))));
      const options = player.options.filter(option => option.symbol === task.symbol);
      const canBuy = Boolean(task.buy && !task.traded?.includes("buy"));
      const canSell = Boolean(task.sell && owned > 0);
      const canShort = Boolean(task.buy && !task.traded?.includes("short"));
      const active = operation === "buy" && canBuy || operation === "sell" && canSell || operation === "short" && canShort || operation === "options" && options.length ? operation : null;
      const selectOperation = (value: typeof operation, label: string): DecisionAction => ({label, onClick: () => setOperation(value), disabled, selected: active === value, variant: active === value ? "primary" : "secondary"});
      const selectedOption = options.find(option => option.id === optionId);
      const optionGain = (option: typeof options[number]) => option.side === "call" ? (task.price ?? 0) * option.quantity - option.strikeTotal : option.strikeTotal - (task.price ?? 0) * option.quantity;
      return <div className="space-y-3">
        <div ref={choicesRef} tabIndex={-1} aria-label="Выбор операции с акциями">
          <ChoicePanel title={card ? "Выберите операцию" : `${task.symbol} · ${money202(task.price ?? 0)} за акцию`} description="После выполнения операции можно выбрать следующую или завершить свои торги." choices={[
            ...(canBuy ? [selectOperation("buy", "Купить акции")] : []),
            ...(canSell ? [selectOperation("sell", "Продать акции")] : []),
            ...(options.length ? [selectOperation("options", `Опционы · ${options.length}`)] : []),
            ...(canShort ? [selectOperation("short", "Короткая продажа")] : [])
          ]}/>
        </div>
        {active === "buy" ? purchasePanel : null}
        {active === "sell" ? <StockSalePanel
          offer={{ title: `${task.symbol} · ${money202(task.price ?? 0)} за акцию`, quantity: owned, salePriceCents: task.price ?? 0 }}
          quantity={saleQuantity} onQuantityChange={setSale} onDecrease={() => setSale((saleQuantity || 1) - 1)} onIncrease={() => setSale((saleQuantity || 0) + 1)}
          onSell={() => void decide("sell", { quantity: saleQuantity === "" ? 0 : saleQuantity })} onDecline={showOperations} declineLabel="К выбору операции"
          cashAfterCents={player.cash + (saleQuantity || 0) * (task.price ?? 0)}
          decisionSubmission={pending("sell") ? "stock_sell" : null}
          formatMoney={money202} disabled={disabled} idPrefix={`202-stock-sale-${task.id}`}
        /> : null}
        {active === "short" ? <DecisionPanel title="Короткая продажа" tone="market"
          description="От 100 до 5 000 акций, кратно 100. Выручка хранится в банке до следующей котировки; наличные сейчас не списываются. Убыток при расчёте нельзя покрыть кредитом."
          actions={[action("Открыть короткую продажу", "short", { disabled: !short.canOpen, variant: "action", busyLabel: "Открываем…", data: { quantity: shortQuantity === "" ? 0 : shortQuantity } }), {label:"К выбору операции",onClick:showOperations,variant:"secondary",disabled}]}>
          <StockPurchaseControls cardId={`short-${task.id}`} unitPrice={task.price ?? 0} available={player.cash} quantity={shortQuantity} onQuantityChange={setShortQuantity}
            quantityMin={100} quantityStep={100} quantityMax={5000} formatMoney={money202} moneyUnit={100} cashLimited={false} disabled={disabled} costLabel="Объём позиции"/>
          {short.reason ? <p className="mt-2 text-xs text-red-700">{short.reason}</p> : null}
        </DecisionPanel> : null}
        {active === "options" ? <DecisionPanel title="Ваши опционы" tone="market" actions={[
          ...(selectedOption ? [action("Исполнить опцион", "exercise", {disabled:optionGain(selectedOption) <= 0,busyLabel:"Исполняем…",data:{assetId:selectedOption.id}})] : []),
          {label:"К выбору операции",onClick:showOperations,variant:"secondary",disabled}
        ]}>
          <label className="mt-3 grid gap-2 text-sm font-medium">Опцион для исполнения
            <select className="h-12 min-w-0 w-full rounded-xl border border-line bg-white px-3 text-sm" value={selectedOption?.id ?? ""} disabled={disabled} onChange={event=>setOptionId(event.target.value)}>
              <option value="">Выберите опцион</option>
              {options.map(option=><option key={option.id} value={option.id}>{option.side.toUpperCase()} · {option.quantity} акций · {money202(optionGain(option))} · до конца хода {option.expires}</option>)}
            </select>
          </label>
          {selectedOption ? <>
            <p className="mt-2 text-sm text-neutral-700">Действует до конца вашего хода № {selectedOption.expires}. Сейчас ход № {player.turns}.</p>
            {optionGain(selectedOption) > 0 ? <DecisionOutcome paymentCents={-optionGain(selectedOption)} cashAfterCents={player.cash+optionGain(selectedOption)} cashflowChangeCents={0} formatMoney={money202}/> : <p className="mt-2 text-xs text-neutral-600">Исполнение сейчас не приносит прибыли. Опцион можно сохранить до следующей котировки.</p>}
          </> : null}
        </DecisionPanel> : null}
        <DecisionActions actions={[...(onOffer ? [{label:"Предложить игрокам",onClick:onOffer,variant:"secondary" as const,disabled}] : []), action("Завершить мои торги", "pass")]}/>
      </div>;
    }
    case "sale": case "exchange": {
      const sale = decisionSale202(state, player, task);
      if (!sale) return <DecisionPanel tone="market" title="Предложение рынка" description="Объект больше недоступен." actions={[action("Отказаться", "pass")]}/>;
      return <MarketSalePanel
        offer={{ title: card ? "" : "Предложение рынка", assetName: sale.assetName, salePriceCents: sale.salePriceCents,
          mortgageCents: sale.mortgageCents, proceedsCents: sale.proceedsCents, netCashflowChangeCents: sale.netCashflowChangeCents }}
        available={player.cash} canAnswer={!disabled && sale.canAccept} canDecline={!disabled} onSell={() => decide("yes")} onDecline={() => decide("pass")}
        submitting={pending("yes") ? "sell" : pending("pass") ? "decline" : null} formatMoney={money202}
        allowUnfundedSale sellLabel={task.kind === "exchange" ? "Согласиться на обмен" : "Согласиться на продажу"}
      >
        {sale.share > 0 && sale.share < 10000 ? <p className="text-xs leading-5 text-neutral-600">Суммы рассчитаны для вашей доли {sale.share / 100}%.</p> : null}
        {sale.roundingAdjustmentCents !== 0 ? <p className="text-xs leading-5 text-neutral-600">Поправка округления при распределении выручки: {money202(sale.roundingAdjustmentCents)}.</p> : null}
        {sale.kind === "exchange" ? <div className="space-y-1.5 text-sm text-neutral-700">
          <p>Стоимость нового объекта для вашей доли: <strong>{money202(sale.replacementCostCents)}</strong></p>
          <p>Ипотека: <strong>{money202(sale.replacementMortgageCents)}</strong></p>
          <p>Денежный поток: <strong>{money202(sale.replacementCashflowCents)}</strong>/мес.</p>
        </div> : null}
        {player.cash + sale.proceedsCents < 0 ? <p className="text-xs leading-5 text-amber-700">После продажи возникнет обязательство {money202(-(player.cash + sale.proceedsCents))}. Его нельзя покрыть банковским кредитом.</p> : null}
        {sale.needsAllOwners ? <p className="text-xs leading-5 text-neutral-600">Для общего объекта требуется согласие всех владельцев. Ожидаем: {sale.pendingOwnerIds.map(id => gamePlayerName(snapshot.players.find(person => person.id === id))).join(", ")}.</p> : null}
        {sale.reason ? <p className="text-xs text-red-700">{sale.reason}</p> : null}
      </MarketSalePanel>;
    }
    case "right": return <DecisionPanel tone="deal" title="Приоритет на недвижимость"
      description="Используйте приоритет, чтобы перейти к покупке этой недвижимости. Первоначальный взнос оплачивается при покупке. После использования или отказа право истечёт."
      actions={[action("Использовать приоритет", "buy"), action("Отказаться", "pass")]}/>;
    case "university": return <DecisionPanel tone="expense" title="Выбор оплаты" actions={[
      action("Наличными", "cash", { disabled: player.cash < 5_000_000 }), action("Образовательный кредит", "credit", { variant: "secondary" })
    ]}>
      {!card ? <div className="space-y-1.5 text-sm text-neutral-700"><p>Наличными: <strong>{money202(5_000_000)}</strong></p><p>Образовательный кредит: долг <strong>{money202(5_000_000)}</strong>, платёж <strong>{money202(100_000)}</strong>/мес.</p></div> : null}
      {player.cash < 5_000_000 ? <p className="mt-2 text-xs text-red-700">Недостаточно наличных для оплаты.</p> : null}
    </DecisionPanel>;
    case "charity": {
      const donation = Math.max(0, Math.round(finances202(state, player).income / 10));
      return <DecisionPanel title="Благотворительность" tone="charity" description="Пожертвуйте 10% общего дохода и выбирайте от одного до трёх кубиков в течение трёх следующих своих ходов."
        actions={[action("Да", "yes", { disabled: player.cash < donation }), action("Нет", "pass")]}>
        <p className="text-sm text-neutral-700">Пожертвование: <strong>{money202(donation)}</strong></p>
        {player.cash < donation ? <p className="mt-2 text-xs text-red-700">Недостаточно наличных для оплаты.</p> : null}
      </DecisionPanel>;
    }
    case "auction": {
      const cents = bid === "" ? 0 : Math.round(bid * 100);
      const valid = Number.isSafeInteger(cents) && cents > 0 && cents <= player.cash;
      const answered = Object.prototype.hasOwnProperty.call(task.bids ?? {}, player.id);
      const eligible = task.candidates?.includes(player.id);
      return <OfferPanel title="Благотворительный аукцион" description="Ставки закрыты. После ответов всех участников победитель определяется автоматически.">
        {eligible && !answered ? <><label className="grid gap-2 text-sm font-medium">Ваша ставка в долларах<Input type="number" min={0.01} max={Math.max(0, player.cash / 100)} step={0.01} inputMode="decimal" value={bid} onChange={event => setBid(event.target.value === "" ? "" : Number(event.target.value))} disabled={disabled}/></label>
        <p className="mt-2 text-xs text-neutral-600">Доступно: {money202(Math.max(0, player.cash))}</p>
        {bid !== "" && !valid ? <p className="mt-2 text-xs text-red-700">Введите положительную ставку в пределах наличных.</p> : null}
        <DecisionActions actions={[action("Сделать ставку", "bid", { disabled: !valid, busyLabel: "Отправляем…", data: { amount: cents } }), action("Не участвовать", "pass")]}/>
        </> : <p className="text-sm text-neutral-600">{answered ? "Ваш ответ принят. Ожидаем остальных участников." : "Ожидаем ответы участников аукциона."}</p>}
        <div className="space-y-3">{state.players.filter(participant => task.candidates?.includes(participant.id)).map(participant => {
          const person = snapshot.players.find(candidate => candidate.id === participant.id);
          return <OfferResponse key={participant.id} title={<span className="flex items-center gap-2">{person ? <GamePlayerMark player={person}/> : null}{gamePlayerName(person)}</span>}
            description={Object.prototype.hasOwnProperty.call(task.bids ?? {}, participant.id) ? "Ответ принят" : "Ожидаем ответ"}/>;
        })}</div>
      </OfferPanel>;
    }
    case "debt": return <DecisionPanel tone="expense" title="Обязательный платёж" description={task.reason}
      actions={[{ label: "Банк и обязательства", onClick: onOpenBank, variant: "secondary", disabled }, ...(onOffer ? [{ label: "Предложить игрокам", onClick: onOffer, variant: "action" as const, disabled }] : [])]}>
      <p className="text-sm text-neutral-700">Не хватает: <strong>{money202(Math.max(0, -player.cash))}</strong>.</p>
      <p className="mt-2 text-xs leading-5 text-neutral-600">{task.loanAllowed ? "Откройте банк, чтобы оформить кредит для обязательного платежа." : "Этот убыток нельзя покрыть кредитом. Продайте разрешённый актив или объявите банкротство через банк."}</p>
    </DecisionPanel>;
    case "insurance": return <DecisionPanel tone="market" title={card ? undefined : "Страхование недвижимости"} description={card ? undefined : "Защита недвижимости по условиям карточек рынка."}
      actions={[action("Оформить страховку", "yes"), action("Отказаться", "pass")]}>
      {!card ? <p className="text-sm text-neutral-700">Ежемесячный платёж: <strong>{money202(20_000)}</strong>.</p> : null}
    </DecisionPanel>;
    case "contamination": return <DecisionPanel tone="expense" title="Очистка участка"
      actions={[action("Оплатить очистку", "yes", { disabled: player.cash < 5_000_000 }), action("Отказаться от объекта", "pass")]}>
      <FundingProgress availableCents={player.cash} requiredCents={5_000_000} label="Сумма к оплате" formatMoney={money202}/>
    </DecisionPanel>;
    case "mentor": return <DecisionPanel tone="deal" title="Совет наставника"
      description={task.mandatory ? "Другой игрок использовал приоритет на недвижимость. Наставник даёт вам новую карточку." : "Оставьте эту карточку или замените её следующей."}
      actions={[...(task.mandatory ? [] : [action("Оставить карточку", "keep")]), action("Вытянуть следующую", "redraw", { variant: "secondary" })]}/>;
    case "escape": return <DecisionPanel tone="deal" title="Доступен большой круг" description="Условия выхода выполнены. При переходе карточка рынка этого хода не разыгрывается."
      actions={[action("Перейти на большой круг", "yes"), action("Остаться и открыть рынок", "pass")]}/>;
    case "fast": {
      const cell = fastTrackCells[task.cell!];
      const price = fastPrice202(state, player, task.cell!);
      return <DecisionPanel tone="deal" title={cell?.label} description={cell?.description}
        actions={[action("Купить", "buy", { disabled: player.cash < price, busyLabel: "Покупаем…" }), action("Отказаться", "pass")]}>
        <FundingProgress availableCents={player.cash} requiredCents={price} label="Сумма к оплате" formatMoney={money202} insufficientLabel="Недостаточно наличных"/>
      </DecisionPanel>;
    }
  }};
  const offerInPanel = task.kind === "deal" && Boolean(purchase) && task.rule?.kind !== "exchange"
    || task.kind === "quote"
    || task.kind === "debt";
  return <div className="space-y-3">{renderDecision()}
    {onOffer && !offerInPanel ? <DecisionActions actions={[{ label: "Предложить игрокам", onClick: onOffer, disabled, variant: "action" }]}/> : null}
  </div>;
}
