"use client";

import { useId, type ReactNode } from "react";
import { ArrowRightToLine, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { localizeGameText } from "@/lib/game-labels";
import { ProgressBar } from "./financial-report";
import { StockPurchaseControls } from "./stock-purchase-controls";

export type DecisionAction = {
  key?: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "action" | "secondary" | "ghost" | "danger";
  disabled?: boolean | undefined;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  selected?: boolean;
  description?: string;
};

export function DecisionActions({actions,className="mt-3 grid grid-cols-2 gap-2"}:{actions:DecisionAction[];className?:string}) {
  return <div className={className}>{actions.map((action,index)=><Button key={action.key??index} variant={action.variant??"primary"} className={action.className} onClick={action.onClick} disabled={action.disabled||action.busy} aria-busy={action.busy} aria-pressed={action.selected}>{action.description ? <span className="grid gap-1 text-left"><span>{action.label}</span><span className="text-xs font-normal leading-5">{action.description}</span></span> : action.busy?action.busyLabel??action.label:action.label}</Button>)}</div>;
}

const panelTones={deal:"bg-[#f5faf2]",market:"bg-[#f5f6fc]",charity:"bg-[#fff5ed]",expense:"bg-[#fff4f7]"};
export function DecisionPanel({title,description,tone="deal",children,actions}:{title?:string|undefined;description?:ReactNode;tone?:keyof typeof panelTones;children?:ReactNode;actions?:DecisionAction[]}) {
  return <div className={`rounded-md ${panelTones[tone]} p-3`}>
    {title?<div className="text-sm font-medium">{title}</div>:null}
    {description?<p className="mt-2 text-sm leading-6 text-neutral-700">{description}</p>:null}
    {children}
    {actions?<DecisionActions actions={actions}/>:null}
  </div>;
}

export function ChoicePanel({title="Возможность",choices,description}:{title?:string;choices:DecisionAction[];description?:ReactNode}) {
  return <DecisionPanel title={title} description={description} actions={choices}/>;
}

/** Personal consequences use the same typography and spacing as the shared deal forms. */
export function DecisionOutcome({paymentCents,cashAfterCents,cashflowChangeCents,formatMoney=money}:{paymentCents:number;cashAfterCents:number;cashflowChangeCents:number;formatMoney?:(value:number)=>string}) {
  return <div className="mt-3 space-y-1.5 text-sm text-neutral-700" aria-label="Результат операции">
    <p>{paymentCents < 0 ? "Получите" : "Заплатите сейчас"}: <strong>{formatMoney(Math.abs(paymentCents))}</strong></p>
    <p>Наличные после операции: <strong>{formatMoney(cashAfterCents)}</strong></p>
    <p>Изменение денежного потока: <strong>{cashflowChangeCents > 0 ? "+" : ""}{formatMoney(cashflowChangeCents)}</strong>/мес.</p>
  </div>;
}

export type PurchaseCard = { id:string; title:string; bodyText?:string; isStock:boolean; price:number; downPayment:number; cashflow:number };
export function PurchasePanel({card,available,quantity,onQuantityChange,onBuy,onDecline,onOpenBank,canTakeLoan=false,canPurchase,onOffer,submitting=null,disabled=false,disabledReason,waitingNames=[],embedded=false,formatMoney=money,moneyUnit=1,quantityMin=1,quantityStep=1,quantityMax=Number.MAX_SAFE_INTEGER,quantityLabel,unitPriceLabel,showCardText=true,children,insufficientLabel="Нужен кредит",buyLabel="Купить",declineLabel="Отказаться",outcome}: {
  card:PurchaseCard;available:number;quantity:number|"";onQuantityChange:(value:number|"")=>void;
  onBuy:()=>void;onDecline:()=>void;onOpenBank?:()=>void;canTakeLoan?:boolean;canPurchase?:boolean;onOffer?:()=>void;
  submitting?:"buy"|"decline"|"offer"|null;disabled?:boolean;disabledReason?:string|undefined;waitingNames?:string[];embedded?:boolean;
  formatMoney?:(value:number)=>string;moneyUnit?:1|100;quantityMin?:number;quantityStep?:number;quantityMax?:number;quantityLabel?:string;unitPriceLabel?:string;showCardText?:boolean;children?:ReactNode;insufficientLabel?:string;
  buyLabel?:string;declineLabel?:string;outcome?:{paymentCents:number;cashAfterCents:number;cashflowChangeCents:number};
}) {
  const validQuantity=typeof quantity==="number"&&Number.isSafeInteger(quantity)&&quantity>=quantityMin&&quantity<=quantityMax&&quantity%quantityStep===0;
  const purchaseCost=card.isStock?(validQuantity?card.price*quantity:0):card.downPayment;
  const canAfford=canPurchase??available>=purchaseCost;
  const waiting=waitingNames.length>0;
  const actions:DecisionAction[]=[{label:buyLabel,busyLabel:buyLabel==="Купить"?"Покупаем…":"Сохраняем…",onClick:onBuy,disabled:disabled||waiting||!canAfford||Boolean(submitting)||Boolean(disabledReason)||(card.isStock&&!validQuantity),busy:submitting==="buy",className:"w-full min-w-0"}];
  if(onOffer)actions.push({label:"Предложить игрокам",busyLabel:"Открываем аукцион…",onClick:onOffer,variant:"action",disabled:disabled||waiting||Boolean(submitting),busy:submitting==="offer",className:"w-full min-w-0"});
  if(onOpenBank)actions.push({label:"Взять кредит",onClick:onOpenBank,variant:"secondary",disabled:disabled||!canTakeLoan||Boolean(submitting),className:"w-full min-w-0"});
  actions.push({label:declineLabel,busyLabel:"Отказываемся…",onClick:onDecline,variant:"secondary",disabled:disabled||waiting||Boolean(submitting),busy:submitting==="decline",className:"w-full min-w-0"});
  return <div className="w-full min-w-0 max-w-full rounded-md bg-[#f5faf2] p-3">
    <div className="text-sm font-medium">Текущая сделка</div>
    {showCardText?<><p className="mt-1 break-words text-sm text-neutral-700">{localizeGameText(card.title)}</p>{card.bodyText?<p className="mt-2 break-words text-sm leading-6 text-neutral-700">{localizeGameText(card.bodyText)}</p>:null}</>:null}
    {!outcome && showCardText ? <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
      {card.price>0?<div>Цена: <strong>{formatMoney(card.price)}</strong></div>:null}
      {!card.isStock||card.downPayment>0?<div>Первоначальный взнос: <strong>{formatMoney(card.downPayment)}</strong></div>:null}
      {card.cashflow!==0?<div>Денежный поток: <strong>{formatMoney(card.cashflow)}</strong>/мес</div>:null}
    </div> : null}
    {card.isStock?<StockPurchaseControls cardId={card.id} unitPrice={card.price} available={available} quantity={quantity} onQuantityChange={onQuantityChange} formatMoney={formatMoney} moneyUnit={moneyUnit} quantityMin={quantityMin} quantityStep={quantityStep} quantityMax={quantityMax} {...(quantityLabel?{quantityLabel}:{})} {...(unitPriceLabel?{unitPriceLabel}:{})} disabled={disabled||Boolean(submitting)}/>:null}
    {outcome ? <DecisionOutcome {...outcome} formatMoney={formatMoney}/> : null}
    {purchaseCost>0&&(!card.isStock||validQuantity)?<FundingProgress className="mt-3" availableCents={available} requiredCents={purchaseCost} label="Сумма к оплате" formatMoney={formatMoney} insufficientLabel={insufficientLabel}/>:null}
    {waiting?<p className="mt-3 break-words text-xs text-amber-700">Ожидаем решение по продаже от игроков: {waitingNames.join(", ")}.</p>:null}
    {disabledReason?<p className="mt-2 text-xs text-red-700">{disabledReason}</p>:null}
    {children}
    <DecisionActions actions={actions} className={["mt-3 grid w-full min-w-0 gap-2",embedded?"grid-cols-1":onOffer?"sm:grid-cols-2":"sm:grid-cols-3"].join(" ")}/>
  </div>;
}

export type MarketSaleOffer = { title:string;assetName:string;salePriceCents:number;mortgageCents:number;proceedsCents:number;netCashflowChangeCents:number;totalOffers?:number;offerNumber?:number };
export function MarketSalePanel({offer,available,canAnswer,canDecline=canAnswer,onSell,onDecline,submitting=null,formatMoney=money,children,allowUnfundedSale=false,sellLabel="Продать"}:{offer:MarketSaleOffer;available:number;canAnswer:boolean;canDecline?:boolean;onSell:()=>void;onDecline:()=>void;submitting?:"sell"|"decline"|null;formatMoney?:(value:number)=>string;children?:ReactNode;allowUnfundedSale?:boolean;sellLabel?:string}) {
  const canClose=available+offer.proceedsCents>=0;
  return <div className="rounded-md bg-[#f5f6fc] p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><div className="text-sm font-medium">Предложение рынка</div>{(offer.totalOffers??0)>1?<span className="text-xs font-medium text-neutral-600">{offer.offerNumber} из {offer.totalOffers}</span>:null}</div>
    {offer.title ? <p className="mt-2 text-sm leading-6 text-neutral-700">{localizeGameText(offer.title)}</p> : null}
    <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
      <div>Актив: {localizeGameText(offer.assetName)}</div>
      {offer.salePriceCents>0?<div>Цена продажи: <strong>{formatMoney(offer.salePriceCents)}</strong></div>:<div>Немедленная выплата: <strong>нет</strong></div>}
      {offer.mortgageCents>0?<div>Закладная: <strong>{formatMoney(offer.mortgageCents)}</strong></div>:null}
      <div>{offer.proceedsCents>=0?"К получению":"К доплате"}: <strong>{formatMoney(Math.abs(offer.proceedsCents))}</strong></div>
      {offer.netCashflowChangeCents!==0?<div>{offer.netCashflowChangeCents<0?"Денежный поток уменьшится на":"Денежный поток увеличится на"} <strong>{formatMoney(Math.abs(offer.netCashflowChangeCents))}</strong>/мес</div>:null}
    </div>
    {offer.proceedsCents<0?<FundingProgress className="mt-3" availableCents={available} requiredCents={Math.abs(offer.proceedsCents)} label="Доплата для закрытия продажи" formatMoney={formatMoney} insufficientLabel={allowUnfundedSale?"Возникнет обязательство":"Нужен кредит"}/>:null}
    {!canClose?<p className="mt-2 text-xs text-red-700">{allowUnfundedSale?"После продажи возникнет обязательство, которое нужно будет покрыть.":"Недостаточно наличных, чтобы закрыть продажу."}</p>:null}
    {children}
    <DecisionActions actions={[{label:sellLabel,busyLabel:"Продаём…",onClick:onSell,disabled:!canAnswer||!canClose&&!allowUnfundedSale||Boolean(submitting),busy:submitting==="sell"},{label:"Отказаться",busyLabel:"Отказываемся…",variant:"secondary",onClick:onDecline,disabled:!canDecline||Boolean(submitting),busy:submitting==="decline"}]}/>
    {(offer.totalOffers??0)>1?<p className="mt-2 text-xs leading-5 text-neutral-600">После вашего решения игра перейдёт к следующему подходящему активу.</p>:null}
  </div>;
}

export function StockSalePanel({
  offer,
  quantity,
  onQuantityChange,
  onDecrease,
  onIncrease,
  decisionSubmission,
  onSell,
  onDecline,
  formatMoney = money,
  disabled = false,
  disabledReason,
  idPrefix,
  declineLabel = "Не продавать",
  cashAfterCents
}: {
  offer: { title: string; quantity: number; salePriceCents: number };
  quantity: number | "";
  onQuantityChange: (value: number | "") => void;
  onDecrease?: () => void;
  onIncrease?: () => void;
  decisionSubmission?: "stock_sell" | "stock_decline" | null;
  onSell: () => void;
  onDecline: () => void;
  formatMoney?: (value:number)=>string;
  disabled?: boolean | undefined;
  disabledReason?: string|undefined;
  idPrefix?: string;
  declineLabel?: string;
  cashAfterCents?: number;
}) {
  const generatedId=useId();
  const quantityId=`${idPrefix ? `${idPrefix}-` : ""}${generatedId}-stock-sale-quantity`;
  const numericQuantity = quantity === "" ? 0 : quantity;
  const saleTotalCents = offer.salePriceCents * numericQuantity;
  const submitting = disabled || Boolean(decisionSubmission);
  const quantityControlClassName =
    "h-11 min-w-0 rounded-xl bg-white px-0 text-ink shadow-[0_6px_16px_rgba(27,57,118,.09)] hover:bg-[#fffdf9]";

  return (
    <section className="rounded-2xl bg-card p-3 shadow-[0_16px_36px_rgba(27,57,118,.10)] min-[420px]:p-4">
      <div>
        <h3 className="text-base font-extrabold text-ink">Продажа акций</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{localizeGameText(offer.title)}</p>
        <p className="mt-1 text-sm font-bold text-ink">
          Доступно акций: {offer.quantity}
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor={quantityId} className="text-sm font-extrabold text-ink">
          Количество на продажу
        </label>
        <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,.7fr))_minmax(4rem,1.5fr)_repeat(3,minmax(0,.7fr))] items-center gap-1">
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(numericQuantity - 20)}
            disabled={submitting || numericQuantity <= 1}
            aria-label="Уменьшить количество на 20"
            title="Уменьшить на 20"
          >
            <ChevronsLeft size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={onDecrease ?? (()=>onQuantityChange(numericQuantity-1))}
            disabled={submitting || numericQuantity <= 1}
            aria-label="Уменьшить количество на 1"
            title="Уменьшить на 1"
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </Button>
          <Input
            id={quantityId}
            type="number"
            min={1}
            max={offer.quantity}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(event) =>
              onQuantityChange(event.target.value === "" ? "" : Number(event.target.value))
            }
            disabled={submitting}
            className="h-11 px-1 text-center font-extrabold tabular-nums"
          />
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={onIncrease ?? (()=>onQuantityChange(numericQuantity+1))}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Увеличить количество на 1"
            title="Увеличить на 1"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(numericQuantity + 20)}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Увеличить количество на 20"
            title="Увеличить на 20"
          >
            <ChevronsRight size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(offer.quantity)}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Выбрать максимальное количество акций"
            title="Выбрать максимум"
          >
            <ArrowRightToLine size={17} aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-muted">Сумма продажи</span>
          <strong className="text-base font-extrabold text-ink">
            {quantity === ""
              ? "Укажите количество"
              : `${quantity} x ${formatMoney(offer.salePriceCents)} = ${formatMoney(saleTotalCents)}`}
          </strong>
        </div>
      </div>

      {cashAfterCents !== undefined && quantity !== "" ? <p className="mt-3 text-sm text-neutral-700">Наличные после продажи: <strong>{formatMoney(cashAfterCents)}</strong></p> : null}
      {disabledReason?<p className="mt-2 text-xs text-red-700">{disabledReason}</p>:null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="action"
          onClick={onSell}
          disabled={submitting || quantity === "" || numericQuantity<1 || numericQuantity>offer.quantity || Boolean(disabledReason)}
          aria-busy={decisionSubmission === "stock_sell"}
        >
          {decisionSubmission === "stock_sell" ? "Продаём…" : "Продать"}
        </Button>
        <Button
          variant="ghost"
          className="bg-white text-ink shadow-[0_7px_18px_rgba(27,57,118,.09)] hover:bg-[#fffdf9]"
          onClick={onDecline}
          disabled={submitting}
          aria-busy={decisionSubmission === "stock_decline"}
        >
          {decisionSubmission === "stock_decline" ? "Отказываемся…" : declineLabel}
        </Button>
      </div>
    </section>
  );
}


export function FundingProgress({
  availableCents,
  requiredCents,
  label,
  className = "",
  formatMoney = money,
  insufficientLabel = "Нужен кредит"
}: {
  availableCents: number;
  requiredCents: number;
  label: string;
  className?: string;
  formatMoney?: (value:number)=>string;
  insufficientLabel?: string;
}) {
  if (requiredCents <= 0) return null;
  const available = Math.max(0, availableCents);
  const enough = available >= requiredCents;
  const missingCents = Math.max(0, requiredCents - available);
  const progressLabel = enough
    ? `${label}: наличных достаточно`
    : `${label}: не хватает ${formatMoney(missingCents)}`;

  return (
    <div
      className={`w-full min-w-0 max-w-full rounded-md border border-line bg-white p-3 ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
        <span className="min-w-0 break-words font-medium text-neutral-700">{label}</span>
        <span
          className={`min-w-0 break-words ${
            enough ? "font-semibold text-success" : "font-semibold text-amber-700"
          }`}
        >
          {enough ? "Денег хватает" : insufficientLabel}
        </span>
      </div>
      <ProgressBar
        className="mt-2"
        value={available}
        max={requiredCents}
        label={progressLabel}
        tone={enough ? "success" : "warning"}
      />
      <div className="mt-2 flex min-w-0 flex-wrap justify-between gap-2 text-xs text-neutral-600">
        <span className="min-w-0 break-words">
          Наличные: <strong>{formatMoney(available)}</strong>
        </span>
        <span className="min-w-0 break-words">
          Нужно: <strong>{formatMoney(requiredCents)}</strong>
        </span>
      </div>
      {!enough ? (
        <div className="mt-1 text-xs text-amber-700">
          Не хватает: <strong>{formatMoney(missingCents)}</strong>
        </div>
      ) : null}
    </div>
  );
}

