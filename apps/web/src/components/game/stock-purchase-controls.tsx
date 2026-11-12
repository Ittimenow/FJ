"use client";

import { useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";

export type StockPurchaseControlsProps = {
  cardId: string;
  unitPrice: number;
  available: number;
  quantity: number | "";
  onQuantityChange: (value: number | "") => void;
  formatMoney?: (value: number) => string;
  moneyUnit?: 1 | 100;
  quantityMin?: number;
  quantityStep?: number;
  quantityMax?: number;
  quantityLabel?: string;
  disabled?: boolean;
  cashLimited?: boolean;
  costLabel?: string;
  unitPriceLabel?: string;
};

/** The 101 calculator. Amounts use the caller's units; editable cost is always dollars. */
export function StockPurchaseControls({cardId,unitPrice,available,quantity,onQuantityChange,formatMoney=money,moneyUnit=1,quantityMin=1,quantityStep=1,quantityMax=Number.MAX_SAFE_INTEGER,quantityLabel="Количество акций",disabled=false,cashLimited=true,costLabel="Стоимость",unitPriceLabel="Цена акции"}:StockPurchaseControlsProps) {
  const quantityId=useId();
  const costId=useId();
  const [stockCostDraft,setStockCostDraft]=useState("");
  const [stockCostEditing,setStockCostEditing]=useState(false);
  useEffect(()=>{setStockCostDraft("");setStockCostEditing(false);},[cardId]);
  const normalizeQuantity=(value:number):number|""=>{
    const normalized=Math.floor(Math.min(value,quantityMax)/quantityStep)*quantityStep;
    return Number.isFinite(normalized)&&normalized>=quantityMin?normalized:"";
  };
  const quantityForCost=(cost:number):number|""=>unitPrice>0?normalizeQuantity(Math.floor(cost/unitPrice)):"";
  const maxStockQuantity=Math.max(0,Math.floor(Math.min(quantityMax,cashLimited?(unitPrice>0?available/unitPrice:0):quantityMax)/quantityStep)*quantityStep);
  const validDealQuantity=typeof quantity==="number"&&Number.isSafeInteger(quantity)&&quantity>=quantityMin&&quantity<=quantityMax&&quantity%quantityStep===0;
  const totalStockCostCents=validDealQuantity?unitPrice*quantity:0;
  const smallStep=quantityStep>1?quantityStep:10;
  const largeStep=quantityStep>1?quantityStep*10:100;
  const changeQuantity=(delta:number)=>normalizeQuantity((typeof quantity==="number"?quantity:0)+delta);
  const changeCost=(deltaDollars:number)=>quantityForCost(Math.max(0,totalStockCostCents+deltaDollars*moneyUnit));
  return (
              <div className="mt-3 border-t border-line/70 pt-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Расчёт стоимости
                  </div>
                  <div className="text-xs text-neutral-500">
                    {unitPriceLabel}: <strong className="text-neutral-700">{formatMoney(unitPrice)}</strong>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor={quantityId}
                      className="mb-1 block text-xs font-semibold text-neutral-600"
                    >
                      Кол-во
                    </label>
                    <div className="grid grid-cols-[repeat(2,minmax(0,.75fr))_minmax(4.5rem,1.8fr)_repeat(3,minmax(0,.75fr))] items-center gap-1">
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => onQuantityChange(changeQuantity(-largeStep))}
                        disabled={disabled || !validDealQuantity}
                        aria-label={`Уменьшить количество на ${largeStep}`}
                        title={`Уменьшить на ${largeStep}`}
                      >
                        <ChevronsLeft size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => onQuantityChange(changeQuantity(-smallStep))}
                        disabled={disabled || !validDealQuantity}
                        aria-label={`Уменьшить количество на ${smallStep}`}
                        title={`Уменьшить на ${smallStep}`}
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </Button>
                      <Input
                        id={quantityId}
                        disabled={disabled}
                        type="number"
                        min={quantityMin}
                        max={quantityMax}
                        step={quantityStep}
                        inputMode="numeric"
                        value={quantity}
                        placeholder="Кол-во"
                        aria-label={quantityLabel}
                        onChange={(event) =>
                          onQuantityChange(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        className="h-10 px-1 text-center text-xs font-semibold tabular-nums placeholder:text-[11px]"
                      />
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        disabled={disabled}
                        onClick={() => onQuantityChange(changeQuantity(smallStep))}
                        aria-label={`Увеличить количество на ${smallStep}`}
                        title={`Увеличить на ${smallStep}`}
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        disabled={disabled}
                        onClick={() => onQuantityChange(changeQuantity(largeStep))}
                        aria-label={`Увеличить количество на ${largeStep}`}
                        title={`Увеличить на ${largeStep}`}
                      >
                        <ChevronsRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-1 text-[10px] font-bold uppercase"
                        onClick={() => onQuantityChange(maxStockQuantity)}
                        disabled={
                          disabled || quantity === maxStockQuantity ||
                          (maxStockQuantity === 0 && quantity === "")
                        }
                        aria-label={cashLimited?"Выбрать максимальное количество акций на текущие наличные":"Выбрать максимальное количество"}
                        title={cashLimited?"Максимум на текущие наличные":"Максимум"}
                      >
                        max
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={costId}
                      className="mb-1 block text-xs font-semibold text-neutral-600"
                    >
                      {costLabel}
                    </label>
                    <div className="grid grid-cols-[repeat(2,minmax(0,.75fr))_minmax(4.5rem,1.8fr)_repeat(3,minmax(0,.75fr))] items-center gap-1">
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          onQuantityChange(
                            changeCost(-1000)
                          )
                        }
                        disabled={disabled || !validDealQuantity}
                        aria-label="Уменьшить стоимость на 1000 долларов"
                        title="Уменьшить на $1000"
                      >
                        <ChevronsLeft size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          onQuantityChange(
                            changeCost(-500)
                          )
                        }
                        disabled={disabled || !validDealQuantity}
                        aria-label="Уменьшить стоимость на 500 долларов"
                        title="Уменьшить на $500"
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </Button>
                      <Input
                        id={costId}
                        disabled={disabled}
                        type="number"
                        min={unitPrice * quantityMin / moneyUnit}
                        step={1 / moneyUnit}
                        inputMode="decimal"
                        value={
                          stockCostEditing
                            ? stockCostDraft
                            : validDealQuantity
                              ? totalStockCostCents / moneyUnit
                              : ""
                        }
                        placeholder={costLabel}
                        aria-label={costLabel==="Стоимость"?"Стоимость покупки акций в долларах":`${costLabel} в долларах`}
                        onFocus={() => {
                          setStockCostEditing(true);
                          setStockCostDraft(validDealQuantity ? String(totalStockCostCents / moneyUnit) : "");
                        }}
                        onChange={(event) => {
                          setStockCostDraft(event.target.value);
                          onQuantityChange(
                            event.target.value === ""
                              ? ""
                              : quantityForCost(Math.round(Number(event.target.value) * moneyUnit))
                          );
                        }}
                        onBlur={() => {
                          setStockCostEditing(false);
                          setStockCostDraft(validDealQuantity ? String(totalStockCostCents / moneyUnit) : "");
                        }}
                        className="h-10 px-1 text-center text-xs font-semibold tabular-nums placeholder:text-[11px]"
                      />
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        disabled={disabled}
                        onClick={() =>
                          onQuantityChange(
                            changeCost(500)
                          )
                        }
                        aria-label="Увеличить стоимость на 500 долларов"
                        title="Увеличить на $500"
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        disabled={disabled}
                        onClick={() =>
                          onQuantityChange(
                            changeCost(1000)
                          )
                        }
                        aria-label="Увеличить стоимость на 1000 долларов"
                        title="Увеличить на $1000"
                      >
                        <ChevronsRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-1 text-[10px] font-bold uppercase"
                        onClick={() => onQuantityChange(maxStockQuantity)}
                        disabled={
                          disabled || quantity === maxStockQuantity ||
                          (maxStockQuantity === 0 && quantity === "")
                        }
                        aria-label={cashLimited?"Выбрать максимальную стоимость покупки на текущие наличные":"Выбрать максимальный объём позиции"}
                        title={cashLimited?"Максимум на текущие наличные":"Максимум"}
                      >
                        max
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  {cashLimited ? <>На текущие наличные хватает: {maxStockQuantity}. Для большей покупки сначала возьмите кредит.</> : <>Максимальное количество: {maxStockQuantity}.</>}
                </p>
              </div>
  );
}
