import { money } from "../../lib/format";
import type { GameEvent } from "../../lib/types";

export type CashChange = {
  beforeCents: number | null;
  afterCents: number | null;
  deltaCents: number;
};

export type CashChangeExpression =
  | {
      kind: "equation";
      result: string;
      firstOperand: string;
      operator: "+" | "−";
      secondOperand: string;
      changedOperand: "first" | "second";
    }
  | {
      kind: "delta";
      value: string;
    };

const eventReasonLabels: Record<string, string> = {
  player_added: "игрок добавлен в комнату",
  game_deleted: "игра удалена",
  game_started: "игра запущена",
  turn_skipped: "ход пропущен",
  roll_resolved: "ход обработан",
  deal_bought: "актив куплен",
  loan_taken: "кредит получен",
  loan_repaid: "кредит погашен",
  deal_choice_required: "игрок должен выбрать мелкую или крупную сделку",
  deal_card_drawn: "карточка сделки открыта",
  automatic_card_resolved_turn_ended: "карточка применена автоматически, ход завершен",
  network_marketing_resolved_turn_ended: "карточка сетевого маркетинга обработана, ход завершен",
  deal_bought_turn_ended: "сделка куплена, ход завершен",
  deal_declined_turn_ended: "игрок отказался от сделки, ход завершен",
  market_sale_offer: "рынок предложил продать актив",
  market_sale_next_offer: "рынок перешёл к следующему подходящему активу",
  market_sale_completed_turn_ended: "актив продан по рынку, ход завершен",
  market_sale_declined_turn_ended: "игрок отказался от продажи, ход завершен",
  charity_choice_required: "игрок должен выбрать благотворительность",
  charity_accepted_turn_ended: "благотворительность оплачена, ход завершен",
  charity_declined_turn_ended: "игрок отказался от благотворительности, ход завершен",
  downsized: "потеря работы",
  player_choice: "решение игрока",
  passed_paycheck: "игрок прошел расчётный чек",
  landed_on_paycheck: "игрок встал на расчётный чек",
  missing_previous_level: "нет предыдущего уровня",
  already_has_level: "этот уровень уже не нужен"
};

export function eventReasonLabel(value: unknown) {
  const reason = String(value ?? "");
  if (!reason) return null;
  return eventReasonLabels[reason] ?? "причина не указана";
}

export function eventCashChange(event: GameEvent): CashChange | null {
  const before = optionalPayloadNumber(event.payload, "beforeCashCents");
  const after = optionalPayloadNumber(event.payload, "afterCashCents");
  if (before !== null && after !== null) {
    return { beforeCents: before, afterCents: after, deltaCents: after - before };
  }

  let delta: number | null = null;
  if (event.type === "loan:take") {
    delta = optionalPayloadNumber(event.payload, "amountCents");
  } else if (event.type === "card:cash_delta") {
    delta = optionalPayloadNumber(event.payload, "amountCents");
  } else if (event.type === "bankruptcy:asset_sold") {
    delta = optionalPayloadNumber(event.payload, "proceedsCents");
  } else if (event.type === "bankruptcy:debt_repaid") {
    const amount = optionalPayloadNumber(event.payload, "amountCents");
    delta = amount === null ? null : -Math.abs(amount);
  } else if (event.type === "doodad:paid") {
    const amount = optionalPayloadNumber(event.payload, "amountCents");
    delta = amount === null ? null : -Math.abs(amount);
  } else if (
    event.type === "doodad:payment_resolved" &&
    event.payload.method === "cash"
  ) {
    const amount = optionalPayloadNumber(event.payload, "cashPriceCents");
    delta = amount === null ? null : -Math.abs(amount);
  }

  return delta === null
    ? null
    : { beforeCents: null, afterCents: null, deltaCents: delta };
}

export function cashChangeExpression(change: CashChange): CashChangeExpression {
  const positive = change.deltaCents >= 0;
  if (change.beforeCents === null || change.afterCents === null) {
    return {
      kind: "delta",
      value: `${positive ? "+" : "−"}${money(Math.abs(change.deltaCents))}`
    };
  }

  return positive
    ? {
        kind: "equation",
        result: money(change.afterCents),
        firstOperand: money(change.deltaCents),
        operator: "+",
        secondOperand: money(change.beforeCents),
        changedOperand: "first"
      }
    : {
        kind: "equation",
        result: money(change.afterCents),
        firstOperand: money(change.beforeCents),
        operator: "−",
        secondOperand: money(Math.abs(change.deltaCents)),
        changedOperand: "second"
      };
}

export function compactPlayerActionDetails(event: GameEvent): string[] | null {
  const payload = event.payload;

  switch (event.type) {
    case "paycheck:receive":
    case "deal:decline":
    case "doodad:paid":
    case "card:cash_delta":
      return [];
    case "deal:buy": {
      const quantity = optionalPayloadNumber(payload, "quantity");
      const cost = optionalPayloadNumber(payload, "downPaymentCents");
      const cashflow = optionalPayloadNumber(payload, "cashflowCents");
      const hasMultipleUnits = quantity !== null && quantity > 1;

      return compactDetails([
        hasMultipleUnits ? `Количество: ${quantity}` : null,
        cost === null
          ? null
          : `${hasMultipleUnits ? "Сумма" : "Стоимость"}: ${money(cost)}`,
        cashflow === null ? null : `Cashflow: ${money(cashflow)}/мес`
      ]);
    }
    case "card:stock_quantity_changed": {
      const before = optionalPayloadNumber(payload, "beforeQuantity");
      const after = optionalPayloadNumber(payload, "afterQuantity");
      return before === null || after === null
        ? []
        : [`Акции: ${before} → ${after}`];
    }
    default:
      return null;
  }
}

function optionalPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactDetails(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}
